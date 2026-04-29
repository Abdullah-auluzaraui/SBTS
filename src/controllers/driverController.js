const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Student = require('../models/Student');
const Trip = require('../models/Trip');
const Attendance = require('../models/Attendance');

// GET /api/driver/me
// Fetch all required dashboard data for the logged-in driver.
// Optional query: ?tripType=return | to_home | to_school — drives the
//   return-trip absent filter and is mirrored back as `tripType` in the
//   response so the client can hydrate state per direction.
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

    // 1. Get the assigned bus — scoped to driver's own school
    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: req.schoolId })
      .select('busId capacity school')
      .populate('school', 'location name emergencyContacts');

    // 2. Get students assigned to this bus — also scoped to prevent cross-tenant data leak
    let students = [];
    let todayEvents = [];
    if (bus) {
      students = await Student.find({ assignedBus: bus._id, school: req.schoolId })
        .select('name studentId grade location parentLinked parentName');

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

      // 3. Return-trip filter: drop students with an 'absent' event today.
      if (tripType === 'to_home') {
        const absentSet = new Set(
          todayEvents
            .filter(e => e.event === 'absent')
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

// POST /api/driver/trip/start
// يحسب السائق المسار في المتصفح عبر OSRM ثم يحفظه هنا كرحلة نشطة
exports.startTrip = async (req, res) => {
  try {
    const driverId = req.user._id;
    const { routePath } = req.body;

    if (!routePath || !Array.isArray(routePath) || routePath.length === 0) {
      return res.status(400).json({ success: false, message: 'routePath مطلوب ويجب أن يكون مصفوفة من {lat, lng}' });
    }

    // 1. تحقق أن السائق لديه حافلة نشطة — scoped to driver's school
    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: req.schoolId }).populate('school', 'name location');
    if (!bus) {
      return res.status(404).json({ success: false, message: 'لا توجد حافلة مخصصة لهذا السائق' });
    }

    // 2. احذف أي رحلة نشطة قديمة لنفس الحافلة (تأمين من التضارب)
    await Trip.deleteOne({ bus: bus._id });

    // 3. أنشئ رحلة جديدة وحفظ المسار
    const trip = await Trip.create({
      school:    req.schoolId,
      bus:       bus._id,
      driver:    driverId,
      status:    'active',
      routePath: routePath
    });

    res.status(201).json({ success: true, message: 'تم بدء الرحلة وحفظ المسار', tripId: trip._id });
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

    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: req.schoolId });
    if (!bus) {
      return res.status(404).json({ success: false, message: 'لا توجد حافلة مخصصة لهذا السائق' });
    }

    const trip = await Trip.findOne({ bus: bus._id, status: 'active', school: req.schoolId });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'لا توجد رحلة نشطة لهذه الحافلة' });
    }

    trip.status = 'completed';
    await trip.save();

    res.json({ success: true, message: 'تم إنهاء الرحلة بنجاح', tripId: trip._id });
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
    const { studentId, busId, event, tripType } = req.body;

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
      $set: { timestamp: new Date(), recordedBy: 'manual' },
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
  } catch (err) {
    console.error('Manual Attendance Error:', err);
    res.status(500).json({ success: false, message: 'فشل تسجيل الحالة' });
  }
};
