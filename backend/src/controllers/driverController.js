const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Student = require('../models/Student');
const Trip = require('../models/Trip');
const Attendance = require('../models/Attendance');
const NotificationService = require('../utils/NotificationService');
const ProximityEngine = require('../utils/ProximityEngine');
const { getIO } = require('../utils/socket');

// Shared helper: day window for today in server local time
const todayWindow = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};


// GET /api/driver/me
// Fetch all required dashboard data for the logged-in driver.
// Optional query: ?tripType=return | to_home | to_school — drives the
//   return-trip absent filter and is mirrored back as `tripType` in the
//   response so the client can hydrate state per direction.
// Optional query: ?phase=checkin | route — when phase=checkin with to_home,
//   skip the morning no_board filter so all students are shown for check-in.
// The response also includes `todayEvents`: every attendance record for
//   this bus today (any direction) so the driver dashboard can rebuild
//   resolved-student state after a page refresh.
exports.getDriverDashboardData = async (req, res) => {
  try {
    const driverId = req.user._id;

    // Normalize the incoming tripType query into our canonical enum.
    // 'return' is kept as a backwards-compat alias for 'to_home'.
    const rawTripType = req.query?.tripType;
    const tripType =
      rawTripType === 'return' || rawTripType === 'to_home' ? 'to_home'
        : rawTripType === 'to_school' ? 'to_school'
          : null;

    // Phase param for two-phase return trip workflow
    const phase = req.query?.phase === 'checkin' ? 'checkin' : req.query?.phase === 'route' ? 'route' : null;

    // 1. Get the assigned bus — scoped to driver's own school
    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: req.schoolId })
      .select('busId capacity school')
      .populate('school', 'location name emergencyContacts');

    // 2. Get students assigned to this bus — also scoped to prevent cross-tenant data leak
    let students = [];
    let todayEvents = [];
    if (bus) {
      students = await Student.find({ assignedBus: bus._id, school: req.schoolId })
        .populate('parentId', 'name phone')
        .select('name studentId grade location parentId');

      // Single query for *all* today's events on this bus. Used both for
      // the return-trip absent filter and for client-side hydration.
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      todayEvents = await Attendance.find({
        school: req.schoolId,
        bus: bus._id,
        timestamp: { $gte: startOfToday, $lte: endOfToday }
      })
        .select('student tripType event timestamp')
        .lean();

      // 3. Return-trip filter: drop students with a morning 'no_board' event.
      //    Legacy 'absent' events are also excluded for backward compat.
      //    Skip this filter when phase=checkin so all students are shown for check-in.
      if (tripType === 'to_home' && phase !== 'checkin') {
        const absentSet = new Set(
          todayEvents
            .filter(e => (e.event === 'no_board' && e.tripType === 'to_school') || e.event === 'absent')
            .map(e => String(e.student))
        );
        if (absentSet.size > 0) {
          students = students.filter(s => !absentSet.has(String(s._id)));
        }
      }
    }

    res.json({
      success: true,
      data: {
        bus: bus ? { busId: bus.busId, capacity: bus.capacity, _id: bus._id } : null,
        school: bus?.school ? {
          name: bus.school.name,
          location: bus.school.location,
          emergencyContacts: bus.school.emergencyContacts || []
        } : null,
        students: students,
        tripType,
        todayEvents
      }
    });

  } catch (err) {
    console.error('Driver Dashboard Error:', err);
    res.status(500).json({ success: false, message: 'فشل جلب بيانات السائق' });
  }
};

// GET /api/driver/trip/today-status
// Returns the status of both morning and afternoon trips for today.
// Used by the frontend on mount to lock/resume completed or in-progress trips.
exports.getTodayStatus = async (req, res) => {
  try {
    const driverId = req.user._id;
    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: req.schoolId });
    if (!bus) {
      return res.json({ success: true, to_school: null, to_home: null });
    }

    const { start, end } = todayWindow();
    const trips = await Trip.find({
      bus: bus._id,
      school: req.schoolId,
      startedAt: { $gte: start, $lte: end }
    }).select('tripType status routePath startedAt').lean();

    // Build a map: tripType -> { status, tripId, routePath }
    const result = { to_school: null, to_home: null };
    for (const trip of trips) {
      const key = trip.tripType || 'to_school'; // legacy trips without tripType are assumed morning
      // Keep the latest record per direction (trips sorted by startedAt desc)
      if (!result[key] || new Date(trip.startedAt) > new Date(result[key].startedAt)) {
        result[key] = { status: trip.status, tripId: trip._id, routePath: trip.routePath, startedAt: trip.startedAt };
      }
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Get Today Status Error:', err);
    res.status(500).json({ success: false, message: 'فشل جلب حالة الرحلات اليومية' });
  }
};

// POST /api/driver/trip/start
// Validates no duplicate for same direction today, then saves the route.
exports.startTrip = async (req, res) => {
  try {
    const driverId = req.user._id;
    const { routePath, tripType } = req.body;

    if (!routePath || !Array.isArray(routePath) || routePath.length === 0) {
      return res.status(400).json({ success: false, message: 'routePath مطلوب ويجب أن يكون مصفوفة من {lat, lng}' });
    }
    if (!['to_school', 'to_home'].includes(tripType)) {
      return res.status(400).json({ success: false, message: 'tripType مطلوب (to_school أو to_home)' });
    }

    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: req.schoolId }).populate('school', 'name location');
    if (!bus) {
      return res.status(404).json({ success: false, message: 'لا توجد حافلة مخصصة لهذا السائق' });
    }

    const { start, end } = todayWindow();

    // Guard 1: Check if this direction is already completed today
    const completedTrip = await Trip.findOne({
      bus: bus._id,
      school: req.schoolId,
      tripType,
      status: 'completed',
      startedAt: { $gte: start, $lte: end }
    });
    if (completedTrip) {
      return res.status(400).json({
        success: false,
        code: 'TRIP_ALREADY_COMPLETED',
        message: 'تم إكمال هذه الرحلة بالفعل اليوم.'
      });
    }

    // Guard 2: If already active (in-progress), return the existing trip — do NOT create a duplicate
    const activeTrip = await Trip.findOne({
      bus: bus._id,
      school: req.schoolId,
      tripType,
      status: 'active',
      startedAt: { $gte: start, $lte: end }
    });
    if (activeTrip) {
      return res.status(200).json({
        success: true,
        resumed: true,
        message: 'الرحلة كانت نشطة بالفعل — تم استئنافها.',
        tripId: activeTrip._id
      });
    }

    // Create a fresh trip for this direction
    const trip = await Trip.create({
      school: req.schoolId,
      bus: bus._id,
      driver: driverId,
      tripType,
      status: 'active',
      routePath: routePath
    });

    res.status(201).json({ success: true, resumed: false, message: 'تم بدء الرحلة وحفظ المسار', tripId: trip._id });

    // Fan-out start notifications only for brand-new trips
    const students = await Student.find({ assignedBus: bus._id, school: req.schoolId })
      .select('parentId').lean();

    Promise.allSettled(
      students
        .filter(s => s.parentId)
        .map(s => NotificationService.create(
          s.parentId,
          req.schoolId,
          'status_update',
          'TRIP_STARTED',
          { tripId: trip._id, event: 'trip_started', tripType }
        ))
    ).catch(err => console.error('trip_started fan-out error:', err));

  } catch (err) {
    console.error('Start Trip Error:', err);
    res.status(500).json({ success: false, message: 'فشل بدء الرحلة' });
  }
};

// POST /api/driver/trip/end
// إنهاء الرحلة النشطة لحافلة السائق
exports.endTrip = async (req, res) => {
  try {
    const driverId = req.user._id;
    const requestedTripType = req.body?.tripType;
    let completedSchoolArrivalStudents = [];

    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: req.schoolId });
    if (!bus) {
      return res.status(404).json({ success: false, message: 'لا توجد حافلة مخصصة لهذا السائق' });
    }

    const tripQuery = { bus: bus._id, status: 'active', school: req.schoolId };
    if (['to_school', 'to_home'].includes(requestedTripType)) {
      tripQuery.tripType = requestedTripType;
    }

    const trip = await Trip.findOne(tripQuery);
    if (!trip) {
      // No active trip — already ended or never started; treat as success (idempotent)
      return res.json({ success: true, message: 'لا توجد رحلة نشطة — تم التعامل كمنتهية' });
    }

    if (trip.tripType === 'to_school') {
      const { start, end } = todayWindow();
      const [boardingEvents, terminalEvents] = await Promise.all([
        Attendance.find({
          school: req.schoolId,
          bus: bus._id,
          tripType: 'to_school',
          event: 'boarding',
          timestamp: { $gte: start, $lte: end }
        }).select('student').lean(),
        Attendance.find({
          school: req.schoolId,
          bus: bus._id,
          tripType: 'to_school',
          event: { $in: ['exit', 'no_board', 'absent'] },
          timestamp: { $gte: start, $lte: end }
        }).select('student').lean()
      ]);

      const terminalSet = new Set(terminalEvents.map(e => String(e.student)));
      const studentIds = [...new Set(
        boardingEvents
          .map(e => String(e.student))
          .filter(sid => !terminalSet.has(sid))
      )];

      if (studentIds.length > 0) {
        const now = new Date();
        await Attendance.bulkWrite(studentIds.map(sid => ({
          updateOne: {
            filter: {
              school: req.schoolId,
              bus: bus._id,
              student: sid,
              tripType: 'to_school',
              event: 'exit',
              timestamp: { $gte: start, $lte: end }
            },
            update: {
              $set: { timestamp: now, recordedBy: 'manual', driver: driverId, trip: trip._id },
              $setOnInsert: {
                school: req.schoolId,
                bus: bus._id,
                student: sid,
                tripType: 'to_school',
                event: 'exit'
              }
            },
            upsert: true
          }
        })));

        const [arrivalEvents, studentsWithParents] = await Promise.all([
          Attendance.find({
            school: req.schoolId,
            bus: bus._id,
            student: { $in: studentIds },
            tripType: 'to_school',
            event: 'exit',
            timestamp: { $gte: start, $lte: end }
          }).select('_id student').lean(),
          Student.find({
            _id: { $in: studentIds },
            assignedBus: bus._id,
            school: req.schoolId
          }).select('_id parentId').lean()
        ]);

        const attendanceByStudent = new Map(arrivalEvents.map(e => [String(e.student), e._id]));
        completedSchoolArrivalStudents = studentsWithParents
          .filter(s => s.parentId)
          .map(s => ({
            studentId: s._id,
            parentId: s.parentId,
            attendanceId: attendanceByStudent.get(String(s._id)) || null
          }));
      }
    }

    trip.status = 'completed';
    trip.completedAt = new Date();
    await trip.save();

    res.json({ success: true, message: 'تم إنهاء الرحلة بنجاح', tripId: trip._id });

    if (completedSchoolArrivalStudents.length > 0) {
      Promise.allSettled(
        completedSchoolArrivalStudents.map(s => NotificationService.create(
          s.parentId,
          req.schoolId,
          'status_update',
          'ARRIVED_SCHOOL',
          {
            studentId: s.studentId,
            attendanceId: s.attendanceId,
            tripId: trip._id,
            event: 'exit',
            tripType: 'to_school'
          }
        ))
      ).catch(err => console.error('bulk school-arrival notification fan-out error:', err));
    }
  } catch (err) {
    console.error('End Trip Error:', err);
    res.status(500).json({ success: false, message: 'فشل إنهاء الرحلة' });
  }
};

// POST /api/driver/attendance/manual
// Idempotent: upsert key is (school, bus, student, day, tripType, event).
// Pressing the same button repeatedly only refreshes timestamp on a single
// row; pressing a *different* event button creates a separate row (so the
// morning trip can carry both 'boarding' and 'exit' for the same student).
exports.markManualAttendance = async (req, res) => {
  try {
    const { studentId, busId, event, tripType, recordedBy: rawRecordedBy } = req.body;
    const recordedBy = rawRecordedBy === 'NFC' ? 'NFC' : 'manual';

    if (!studentId || !busId || !event) {
      return res.status(400).json({ success: false, message: 'بيانات غير مكتملة لتسجيل الحضور' });
    }
    if (!['to_school', 'to_home'].includes(tripType)) {
      return res.status(400).json({ success: false, message: 'نوع الرحلة غير صالح (يجب أن يكون to_school أو to_home).' });
    }

    // Verify the bus belongs to this driver AND this school — prevents cross-tenant injection
    const bus = await Bus.findOne({ _id: busId, driver: req.user._id, school: req.schoolId });
    if (!bus) {
      return res.status(403).json({ success: false, message: 'الحافلة غير صالحة أو لا تخصك' });
    }

    // Verify the student is assigned to this bus within the same school
    const student = await Student.findOne({ _id: studentId, assignedBus: bus._id, school: req.schoolId });
    if (!student) {
      return res.status(403).json({ success: false, message: 'الطالب غير مسجل في حافلتك' });
    }

    // Day window for the upsert key
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const filter = {
      school: req.schoolId,
      bus: bus._id,
      student: student._id,
      tripType,
      event,
      timestamp: { $gte: startOfToday, $lte: endOfToday }
    };

    const update = {
      $set: { timestamp: new Date(), recordedBy, driver: req.user._id },
      $setOnInsert: {
        school: req.schoolId,
        bus: bus._id,
        student: student._id,
        tripType,
        event
      }
    };

    const attendance = await Attendance.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    });

    res.status(200).json({ success: true, message: 'تم تسجيل الحالة بنجاح', attendance });

    // --- Real-time admin map sync ---
    try {
      const io = getIO();
      io.to(`admin_${req.schoolId}`).emit('student:status', {
        busId: String(bus._id),
        studentId: String(student._id),
        event,
        tripType
      });
    } catch (_) { }

    // --- Notification Integration ---
    if (student.parentId) {
      if (event === 'no_board' && tripType === 'to_home') {
        NotificationService.handleNoBoard(student._id, bus._id, student.parentId, req.schoolId);
      } else {
        let type = 'status_update';
        let notificationType = 'BUS_STATUS_UPDATE';

        if (event === 'boarding') {
          notificationType = tripType === 'to_school' ? 'BOARDED_BUS_TO_SCHOOL' : 'BOARDED_BUS_TO_HOME';
        } else if (event === 'exit') {
          notificationType = 'ARRIVED_SCHOOL';
        } else if (event === 'no_board' && tripType === 'to_school') {
          notificationType = 'DID_NOT_BOARD';
        } else if (event === 'arrived_home') {
          notificationType = 'ARRIVED_HOME';
        } else if (event === 'no_receiver') {
          type = 'urgent_alert';
          notificationType = 'NO_RECEIVER';
        }

        NotificationService.create(
          student.parentId,
          req.schoolId,
          type,
          notificationType,
          { studentId: student._id, attendanceId: attendance._id, event, tripType }
        );
      }
    }

  } catch (err) {
    console.error('Manual Attendance Error:', err);
    res.status(500).json({ success: false, message: 'فشل تسجيل الحالة' });
  }
};

// PATCH /api/driver/trip/location
// Updates the active trip's lastLocation and fans out a real-time
// 'bus:location' socket event to all parents with students on this bus.
// Called every ~5 ticks by TripSimulator (debounced in the frontend).
exports.updateTripLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ success: false, message: 'إحداثيات غير صالحة' });
    }

    const bus = await Bus.findOne({ driver: req.user._id, isActive: true, school: req.schoolId })
      .select('_id');
    if (!bus) {
      return res.status(404).json({ success: false, message: 'لا توجد حافلة مرتبطة بهذا السائق' });
    }

    const trip = await Trip.findOne({ bus: bus._id, status: 'active' });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'لا توجد رحلة نشطة' });
    }

    // Capture previous position BEFORE overwriting
    const prevLocation = trip.lastLocation?.lat != null
      ? { lat: trip.lastLocation.lat, lng: trip.lastLocation.lng, updatedAt: trip.lastLocation.updatedAt }
      : null;

    // Update positions
    trip.prevLocation = prevLocation ? { ...prevLocation } : trip.prevLocation;
    trip.lastLocation = { lat, lng, updatedAt: new Date() };

    // Resolve next target (auto or driver override)
    const nextTargetId = await ProximityEngine.resolveNextTarget(
      { lat, lng, updatedAt: trip.lastLocation.updatedAt }, 
      bus._id, 
      req.schoolId, 
      trip.tripType, 
      trip.currentTarget
    );

    if (nextTargetId && String(nextTargetId) !== String(trip.currentTarget?.studentId)) {
      trip.currentTarget = { studentId: nextTargetId, setBy: 'auto', setAt: new Date() };
    }

    await trip.save();

    // Fan-out: emit to each parent's existing socket room
    const students = await Student.find({ assignedBus: bus._id, school: req.schoolId })
      .select('parentId').lean();

    const io = getIO();
    const payload = { busId: String(bus._id), lat, lng };
    const seen = new Set();
    students.forEach(s => {
      if (s.parentId) {
        const pid = String(s.parentId);
        if (!seen.has(pid)) {
          seen.add(pid);
          io.to(`parent_${pid}`).emit('bus:location', payload);
        }
      }
    });

    // Also emit to the school admin room so FleetMap receives live updates
    io.to(`admin_${req.schoolId}`).emit('bus:location', payload);

    res.json({ success: true, currentTarget: trip.currentTarget });

    // Non-blocking proximity evaluation
    setImmediate(() => {
      ProximityEngine.evaluate(
        { lat, lng, updatedAt: trip.lastLocation.updatedAt }, 
        prevLocation,
        bus._id, 
        trip._id, 
        req.schoolId, 
        trip.tripType
      );
    });

  } catch (err) {
    console.error('Update Trip Location Error:', err);
    res.status(500).json({ success: false, message: 'فشل تحديث موقع الحافلة' });
  }
};

// PATCH /api/driver/trip/target
exports.setManualTarget = async (req, res) => {
  try {
    const { studentId } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'معرف الطالب مطلوب' });
    }

    const bus = await Bus.findOne({ driver: req.user._id, isActive: true, school: req.schoolId });
    if (!bus) {
      return res.status(404).json({ success: false, message: 'الحافلة غير موجودة' });
    }

    const trip = await Trip.findOne({ bus: bus._id, status: 'active' });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'لا توجد رحلة نشطة' });
    }

    trip.currentTarget = { studentId, setBy: 'driver', setAt: new Date() };
    await trip.save();
    
    res.json({ success: true, message: 'تم تحديث الوجهة يدوياً بنجاح', currentTarget: trip.currentTarget });
  } catch (err) {
    console.error('Set Manual Target Error:', err);
    res.status(500).json({ success: false, message: 'فشل تحديث الوجهة' });
  }
};

// DELETE /api/driver/attendance/manual
// Undo a morning "no_board" record. Deletes today's no_board attendance row
// for the given student + bus + tripType so the student returns to the
// pending list.
exports.undoManualAttendance = async (req, res) => {
  try {
    const { studentId, busId, tripType } = req.body;

    if (!studentId || !busId || !tripType) {
      return res.status(400).json({ success: false, message: 'بيانات غير مكتملة لإلغاء الحالة' });
    }

    // Verify the bus belongs to this driver
    const bus = await Bus.findOne({ _id: busId, driver: req.user._id, school: req.schoolId });
    if (!bus) {
      return res.status(403).json({ success: false, message: 'الحافلة غير صالحة أو لا تخصك' });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const result = await Attendance.deleteOne({
      school: req.schoolId,
      bus: bus._id,
      student: studentId,
      tripType,
      event: 'no_board',
      timestamp: { $gte: startOfToday, $lte: endOfToday }
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على سجل عدم الصعود لهذا الطالب اليوم' });
    }

    res.json({ success: true, message: 'تم إلغاء حالة عدم الصعود بنجاح' });
  } catch (err) {
    console.error('Undo Manual Attendance Error:', err);
    res.status(500).json({ success: false, message: 'فشل إلغاء الحالة' });
  }
};
