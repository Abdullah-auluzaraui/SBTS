const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Student = require('../models/Student');
const Trip = require('../models/Trip');

// GET /api/driver/me
// Fetch all required dashboard data for the logged-in driver
exports.getDriverDashboardData = async (req, res) => {
  try {
    const driverId = req.user._id;

    // 1. Get the assigned bus — scoped to driver's own school
    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: req.schoolId })
      .select('busId capacity school')
      .populate('school', 'location name');

    // 2. Get students assigned to this bus — also scoped to prevent cross-tenant data leak
    let students = [];
    if (bus) {
      students = await Student.find({ assignedBus: bus._id, school: req.schoolId })
        .select('name studentId grade location parentLinked parentName');
    }

    res.json({
      success: true,
      data: {
        bus: bus ? { busId: bus.busId, capacity: bus.capacity, _id: bus._id } : null,
        school: bus?.school ? { name: bus.school.name, location: bus.school.location } : null,
        students: students
      }
    });

  } catch (err) {
    console.error('Driver Dashboard Error:', err);
    res.status(500).json({ success: false, message: 'فشل جلب بيانات السائق' });
  }
};

const Attendance = require('../models/Attendance');

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
exports.markManualAttendance = async (req, res) => {
  try {
    const { studentId, busId, event } = req.body;
    
    if (!studentId || !busId || !event) {
      return res.status(400).json({ success: false, message: 'بيانات غير مكتملة لتسجيل الحضور' });
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

    const attendance = await Attendance.create({
      school: req.schoolId,
      student: student._id,
      bus: bus._id,
      event: event,
      recordedBy: 'manual'
    });

    res.status(201).json({ success: true, message: 'تم تسجيل الحالة بنجاح', attendance });
  } catch (err) {
    console.error('Manual Attendance Error:', err);
    res.status(500).json({ success: false, message: 'فشل تسجيل الحالة' });
  }
};
