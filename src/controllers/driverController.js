const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Student = require('../models/Student');

// GET /api/driver/me
// Fetch all required dashboard data for the logged-in driver
exports.getDriverDashboardData = async (req, res) => {
  try {
    const driverId = req.user._id;

    // 1. Get the assigned bus
    const bus = await Bus.findOne({ driver: driverId, isActive: true })
      .select('busId capacity school')
      .populate('school', 'location name');

    // 2. Get students assigned to this bus
    let students = [];
    if (bus) {
      students = await Student.find({ assignedBus: bus._id })
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

// POST /api/driver/attendance/manual
exports.markManualAttendance = async (req, res) => {
  try {
    const { studentId, busId, event } = req.body;
    
    if (!studentId || !busId || !event) {
      return res.status(400).json({ success: false, message: 'بيانات غير مكتملة لتسجيل الحضور' });
    }

    const attendance = await Attendance.create({
      school: req.schoolId,
      student: studentId,
      bus: busId,
      event: event,
      recordedBy: 'manual'
    });

    res.status(201).json({ success: true, message: 'تم تسجيل الحالة بنجاح', attendance });
  } catch (err) {
    console.error('Manual Attendance Error:', err);
    res.status(500).json({ success: false, message: 'فشل تسجيل الحالة' });
  }
};
