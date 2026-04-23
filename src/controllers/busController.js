const Bus = require('../models/Bus');
const User = require('../models/User');
const Student = require('../models/Student');
const School = require('../models/School');

// BE-S2-5: Bus CRUD — All operations scoped by req.schoolId (from tenantMiddleware)

// POST /api/buses — Create bus
exports.create = async (req, res) => {
  try {
    const { busId, capacity, route, driver } = req.body;

    if (!busId || !capacity) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'busId and capacity are required' });
    }

    const existing = await Bus.findOne({ busId: busId.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, errorCode: 'DUPLICATE', message: `Bus "${busId}" already exists` });
    }

    const bus = await Bus.create({
      school: req.schoolId,
      busId: busId.toUpperCase(),
      capacity,
      route: route || null,
      driver: driver || null
    });

    res.status(201).json({ success: true, message: 'Bus created successfully', bus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/buses — List buses (scoped)
exports.list = async (req, res) => {
  try {
    const filter = { school: req.schoolId };
    if (req.query.all !== 'true') filter.isActive = true;

    const buses = await Bus.find(filter)
      .populate('route', 'name')
      .populate('driver', 'name username')
      .sort({ createdAt: -1 });

    res.json({ success: true, buses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/buses/:id — Update bus
exports.update = async (req, res) => {
  try {
    const bus = await Bus.findOne({ _id: req.params.id, school: req.schoolId });
    if (!bus) {
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Bus not found' });
    }

    const { capacity, route, driver } = req.body;
    if (capacity !== undefined) bus.capacity = capacity;
    if (route !== undefined) bus.route = route;
    if (driver !== undefined) bus.driver = driver;

    await bus.save();
    res.json({ success: true, message: 'Bus updated successfully', bus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/buses/:id — Soft delete (isActive = false)
exports.remove = async (req, res) => {
  try {
    const bus = await Bus.findOne({ _id: req.params.id, school: req.schoolId });
    if (!bus) {
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Bus not found' });
    }

    bus.isActive = false;
    await bus.save();
    res.json({ success: true, message: 'Bus deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/buses/:id/status — Toggle isActive
exports.toggleStatus = async (req, res) => {
  try {
    const bus = await Bus.findOne({ _id: req.params.id, school: req.schoolId });
    if (!bus) {
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Bus not found' });
    }

    bus.isActive = !bus.isActive;
    await bus.save();
    res.json({ success: true, message: bus.isActive ? 'Bus activated' : 'Bus deactivated', isActive: bus.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/buses/drivers — List active drivers for this school (for dropdown)
exports.listDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ school: req.schoolId, role: 'driver', isActive: true })
      .select('_id name username')
      .sort({ name: 1 });
    res.json({ success: true, drivers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Approximate squared distance between two lat/lng points ──────────────────
// Uses a longitude correction factor for ~24° N latitude (cos(24.7°) ≈ 0.91).
// Returns a unitless value suitable for comparisons; no need for actual km.
function sqDist(latA, lngA, latB, lngB) {
  const dlat = latA - latB;
  const dlng = (lngA - lngB) * 0.91;
  return dlat * dlat + dlng * dlng;
}

// POST /api/buses/auto-assign — Bearing-based geographic clustering
// body: { confirm: boolean }
//   confirm=false → preview only (no DB writes)
//   confirm=true  → preview + save assignments
exports.autoAssign = async (req, res) => {
  try {
    const confirm = req.body.confirm === true;

    // 1. School location
    const school = await School.findById(req.schoolId).select('location name');
    if (!school || school.location.coordinates[0] === 0) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تحديد موقع المدرسة أولاً من لوحة التحكم الرئيسية.'
      });
    }
    const [schoolLng, schoolLat] = school.location.coordinates;

    // 2. Active buses, largest capacity first
    const buses = await Bus.find({ school: req.schoolId, isActive: true }).sort({ capacity: -1 });
    if (buses.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد حافلات نشطة.' });
    }

    // 3. Eligible students: linked parent + valid home location
    const students = await Student.find({
      school: req.schoolId,
      isActive: true,
      parentId: { $ne: null },
      'location.coordinates.0': { $ne: 0 }
    }).select('_id name studentId location');

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يوجد طلاب مؤهلون للتوزيع. يجب أن يكون لكل طالب ولي أمر وموقع منزل محدد.'
      });
    }

    // 4. Build a mutable pool with flat lat/lng for fast distance comparisons
    let pool = students.map(s => ({
      _id: s._id,
      name: s.name,
      studentId: s.studentId,
      location: s.location,
      lat: s.location.coordinates[1],
      lng: s.location.coordinates[0],
    }));

    // 5. Nearest-neighbor seeded clustering
    //    Each iteration: pick the farthest remaining student from school as the
    //    cluster seed, then collect the N students nearest to that seed
    //    (N = bus capacity).  This guarantees each bus covers one compact area.
    const assignments = [];

    for (const bus of buses) {
      if (pool.length === 0) break;

      // Seed: farthest unassigned student from school
      pool.sort((a, b) =>
        sqDist(b.lat, b.lng, schoolLat, schoolLng) -
        sqDist(a.lat, a.lng, schoolLat, schoolLng)
      );
      const seed = pool[0];

      // Collect the N students nearest to the seed (seed included at index 0)
      pool.sort((a, b) =>
        sqDist(a.lat, a.lng, seed.lat, seed.lng) -
        sqDist(b.lat, b.lng, seed.lat, seed.lng)
      );
      const chunk = pool.splice(0, bus.capacity);
      assignments.push({ bus, students: chunk, route: null });
    }

    const unassigned = [...pool];

    // 6. OSRM Trip API for each bus (school is always the last stop)
    for (const assignment of assignments) {
      if (assignment.students.length === 0) continue;
      try {
        const stops = assignment.students
          .map(s => `${s.location.coordinates[0]},${s.location.coordinates[1]}`)
          .join(';');
        const schoolStop = `${schoolLng},${schoolLat}`;
        const url =
          `https://router.project-osrm.org/trip/v1/driving/${stops};${schoolStop}` +
          `?roundtrip=false&source=any&destination=last&geometries=geojson`;

        const resp = await fetch(url);
        const data = await resp.json();

        if (data.code === 'Ok' && data.trips?.length > 0) {
          const trip = data.trips[0];
          assignment.route = {
            polyline: trip.geometry.coordinates.map(c => [c[1], c[0]]),
            duration: Math.ceil(trip.duration / 60),
            distance: parseFloat((trip.distance / 1000).toFixed(1))
          };
        }
      } catch (osrmErr) {
        console.warn(`OSRM failed for bus ${assignment.bus.busId}:`, osrmErr.message);
      }
    }

    // 7. Persist if confirmed
    if (confirm) {
      await Student.updateMany({ school: req.schoolId }, { $set: { assignedBus: null } });
      for (const { bus, students: busStudents } of assignments) {
        if (busStudents.length === 0) continue;
        await Student.updateMany(
          { _id: { $in: busStudents.map(s => s._id) }, school: req.schoolId },
          { $set: { assignedBus: bus._id } }
        );
      }
    }

    res.json({
      success: true,
      confirmed: confirm,
      assignments: assignments.map(a => ({
        bus: { _id: a.bus._id, busId: a.bus.busId, capacity: a.bus.capacity },
        students: a.students.map(s => ({
          _id: s._id,
          name: s.name,
          studentId: s.studentId,
          location: s.location
        })),
        route: a.route
      })),
      unassigned: unassigned.map(s => ({ _id: s._id, name: s.name, studentId: s.studentId })),
      assignedCount: assignments.reduce((sum, a) => sum + a.students.length, 0),
      totalEligible: students.length,
      school: { lat: schoolLat, lng: schoolLng, name: school.name }
    });
  } catch (err) {
    console.error('Auto-assign error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/buses/:id/assign-students — Bulk-assign students to a bus
exports.assignStudents = async (req, res) => {
  try {
    const bus = await Bus.findOne({ _id: req.params.id, school: req.schoolId });
    if (!bus) {
      return res.status(404).json({ success: false, message: 'الحافلة غير موجودة' });
    }

    const { studentIds } = req.body; // Array of student _ids

    if (!studentIds || studentIds.length === 0) {
      // Empty list = unassign all students from this bus
      await Student.updateMany({ assignedBus: bus._id, school: req.schoolId }, { $set: { assignedBus: null } });
      return res.json({ success: true, message: 'تم إلغاء تعيين جميع الطلاب من الحافلة' });
    }

    // ─── Two-Step Validation ──────────────────────────────────────────
    // Fetch full info for each requested student
    const candidates = await Student.find({
      _id: { $in: studentIds },
      school: req.schoolId
    }).select('name parentId location');

    const blocked = [];
    const validIds = [];

    for (const student of candidates) {
      // Step 1: Must have a linked parent
      if (!student.parentId) {
        blocked.push(`"${student.name}": لم يتم ربطه بولي أمر بعد`);
        continue;
      }
      // Step 2: Parent must have set home location (longitude !== 0)
      if (!student.location || student.location.coordinates[0] === 0) {
        blocked.push(`"${student.name}": لم يقم ولي الأمر بتحديد موقع المنزل بعد`);
        continue;
      }
      validIds.push(student._id);
    }

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تعيين أي طالب من القائمة المحددة. تحقق من الملاحظات.',
        blocked
      });
    }

    // Remove this bus from all students currently assigned to it
    await Student.updateMany({ assignedBus: bus._id, school: req.schoolId }, { $set: { assignedBus: null } });

    // Assign only the valid students
    await Student.updateMany(
      { _id: { $in: validIds }, school: req.schoolId },
      { $set: { assignedBus: bus._id } }
    );

    res.json({
      success: true,
      message: `تم تعيين ${validIds.length} طالب للحافلة بنجاح`,
      assigned: validIds.length,
      blocked: blocked.length > 0 ? blocked : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
