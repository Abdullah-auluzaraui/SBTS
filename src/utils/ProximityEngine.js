const { haversineDistance, bearingTo, bearingDelta, calculateSpeedKmH } = require('./geoUtils');
const NotificationService = require('./NotificationService');
const FCMService = require('./FCMService');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { getIO } = require('./socket');

// In-memory cooldown: Map<studentId_string, timestamp_ms>
const cooldownMap = new Map();

const OUTER_ZONE_M = 2000;
const INNER_ZONE_M = 500;
const BEARING_TOLERANCE_DEG = 45;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 min
const VELOCITY_GATE_KMH = 5; // Minimum speed to update heading

// Keep track of the last known valid heading per bus
const busHeadingMap = new Map();

/**
 * Computes the bus heading from the last two known positions, with a velocity gate.
 * @param {Object} prevPos - { lat, lng, updatedAt }
 * @param {Object} currentPos - { lat, lng, updatedAt }
 * @param {String} busId - String representation of bus ID
 */
function computeHeading(prevPos, currentPos, busId) {
  if (!prevPos || !currentPos) return busHeadingMap.get(busId) || null;
  
  const speed = calculateSpeedKmH(prevPos, currentPos);
  
  if (speed > VELOCITY_GATE_KMH) {
    const heading = bearingTo(prevPos.lat, prevPos.lng, currentPos.lat, currentPos.lng);
    busHeadingMap.set(busId, heading);
    return heading;
  }
  
  // Speed is too low, use last known heading
  return busHeadingMap.get(busId) || null;
}

/**
 * Main evaluation function — called non-blocking after each location update.
 * @param {Object} currentPos  - { lat, lng, updatedAt }
 * @param {Object} prevPos     - { lat, lng, updatedAt } | null
 * @param {ObjectId} busId
 * @param {ObjectId} tripId
 * @param {ObjectId} schoolId
 * @param {String}   tripType  - 'to_school' | 'to_home'
 */
async function evaluate(currentPos, prevPos, busId, tripId, schoolId, tripType) {
  try {
    const busIdStr = String(busId);
    // 1. Determine bus heading (requires at least 2 positions + velocity gate)
    const busHeading = computeHeading(prevPos, currentPos, busIdStr);

    // 2. Fetch students who are still PENDING on this bus today
    const students = await getPendingStudents(busId, schoolId, tripType);
    if (!students.length) return;

    const io = getIO();

    for (const student of students) {
      if (!student.location?.coordinates) continue;
      const [sLng, sLat] = student.location.coordinates; // GeoJSON: [lng, lat]

      // 3. Haversine distance check (cheap — runs first)
      const distanceM = haversineDistance(currentPos.lat, currentPos.lng, sLat, sLng);
      if (distanceM > OUTER_ZONE_M) continue; // Not in awareness zone

      // 4. Bearing validation (only if we have a heading)
      if (busHeading !== null) {
        const requiredBearing = bearingTo(currentPos.lat, currentPos.lng, sLat, sLng);
        const delta = bearingDelta(busHeading, requiredBearing);
        if (delta > BEARING_TOLERANCE_DEG) {
          // Bus is NOT heading toward this student — skip (false positive suppressed)
          continue;
        }
      }

      // 5. Inner zone check: trigger "Approaching" notification
      if (distanceM <= INNER_ZONE_M) {
        const sid = String(student._id);
        const lastNotified = cooldownMap.get(sid) || 0;
        if (Date.now() - lastNotified < COOLDOWN_MS) continue; // Respect cooldown
        cooldownMap.set(sid, Date.now());

        if (student.parentId) {
          // 6a. FIRST: persist to DB — must succeed before alerting the parent.
          // The race condition (parent opens app before DB write completes) is
          // avoided by awaiting here. This is safe because evaluate() already
          // runs inside setImmediate(), off the HTTP response thread.
          let savedNotification;
          try {
            savedNotification = await NotificationService.create(
              student.parentId,
              schoolId,
              'status_update',
              'BUS_APPROACHING',
              {
                studentId: student._id,
                busId: String(busId),   // fix: was undefined busIdStr
                tripId,
                event: 'approaching',
                tripType,
                distanceM: Math.round(distanceM)
              }
            );
          } catch (dbErr) {
            // DB write failed — rollback cooldown so we retry on the next tick
            cooldownMap.delete(sid);
            console.error('[ProximityEngine] DB write failed for BUS_APPROACHING, retrying on next tick:', dbErr.message);
            continue;
          }

          // 6b. AFTER DB success: fire socket + FCM in parallel (both fire-and-forget)
          io.to(`parent_${student.parentId}`).emit('bus:approaching', {
            busId: String(busId),
            studentId: sid,
            distanceM: Math.round(distanceM),
            tripType,
            notificationId: savedNotification?._id  // lets client mark-as-read immediately
          });

          FCMService.sendPush(student.parentId, {
            title: 'الحافلة قادمة 🚌',
            body: `الحافلة على بُعد ${Math.round(distanceM)} متر من منزلك`,
            data: {
              type: 'BUS_APPROACHING',
              studentId: sid,
              busId: String(busId),
              tripId: String(tripId),
              tripType,
              distanceM: String(Math.round(distanceM))
            }
          });
        }
      }
    }
  } catch (err) {
    console.error('[ProximityEngine] evaluate error:', err.message);
  }
}

/**
 * Fetches students on the bus who haven't been resolved yet today.
 */
async function getPendingStudents(busId, schoolId, tripType) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);

  const terminalEvents = tripType === 'to_school'
    ? ['boarding', 'no_board', 'exit', 'absent']
    : ['arrived_home', 'no_board'];

  const resolvedAttendance = await Attendance.find({
    bus: busId,
    school: schoolId,
    tripType,
    event: { $in: terminalEvents },
    timestamp: { $gte: start, $lte: end }
  }).select('student').lean();

  const resolvedIds = new Set(resolvedAttendance.map(a => String(a.student)));

  return Student.find({
    assignedBus: busId,
    school: schoolId,
    isActive: true
  }).select('_id parentId location name').lean()
    .then(students => students.filter(s => !resolvedIds.has(String(s._id))));
}

/**
 * Determines the optimal next student to target.
 * Priority: driver manual override > nearest unresolved student.
 */
async function resolveNextTarget(busPos, busId, schoolId, tripType, currentTarget) {
  // If driver manually set a target, respect it until that student is resolved
  if (currentTarget?.setBy === 'driver' && currentTarget?.studentId) {
    const isResolved = await isStudentResolved(currentTarget.studentId, busId, schoolId, tripType);
    if (!isResolved) return currentTarget.studentId; // Honor driver choice
  }

  // Auto: find nearest unresolved student
  const pending = await getPendingStudents(busId, schoolId, tripType);
  if (!pending.length) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const student of pending) {
    if (!student.location?.coordinates) continue;
    const [sLng, sLat] = student.location.coordinates;
    const d = haversineDistance(busPos.lat, busPos.lng, sLat, sLng);
    if (d < minDist) { minDist = d; nearest = student._id; }
  }

  return nearest;
}

async function isStudentResolved(studentId, busId, schoolId, tripType) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  const terminalEvents = tripType === 'to_school'
    ? ['boarding', 'no_board', 'exit', 'absent']
    : ['arrived_home', 'no_board'];
  const record = await Attendance.findOne({
    student: studentId, bus: busId, school: schoolId,
    tripType, event: { $in: terminalEvents },
    timestamp: { $gte: start, $lte: end }
  }).lean();
  return !!record;
}

module.exports = { evaluate, resolveNextTarget, getPendingStudents };
