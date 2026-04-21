const Student = require('../models/Student');

// BE-S1-4b: Link additional student to logged-in parent (1-to-Many)
// POST /api/parents/students
exports.linkChild = async (req, res) => {
  try {
    const { studentId, parentAccessCode } = req.body;

    // 1. Validate required fields
    if (!studentId || !parentAccessCode) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Student ID and Access Code are both required'
      });
    }

    // 2. Find student and validate Access Code
    const student = await Student.findOne({ studentId });
    if (!student || student.parentAccessCode !== parentAccessCode) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid Student ID or Access Code'
      });
    }

    // 3. Check if student is already linked
    if (student.parentId) {
      return res.status(400).json({
        success: false,
        errorCode: 'STUDENT_ALREADY_LINKED',
        message: 'This student is already linked to a parent account.'
      });
    }

    // 4. Ensure the student belongs to the same school as the parent
    if (String(student.school) !== String(req.user.school)) {
      return res.status(403).json({
        success: false,
        errorCode: 'SCHOOL_MISMATCH',
        message: 'This student does not belong to your school.'
      });
    }

    // 5. Link the student to this parent
    student.parentId = req.user._id;
    await student.save();

    res.json({
      success: true,
      message: 'Student linked successfully',
      student: { id: student._id, name: student.name, studentId: student.studentId, grade: student.grade }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/parents/students/:id/location
// Update student location (Interactive Map feature)
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const studentId = req.params.id;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    const student = await Student.findOne({ _id: studentId, parentId: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found or not linked to your account' });
    }

    student.location = {
      type: 'Point',
      coordinates: [lng, lat]
    };
    
    await student.save();

    res.json({ success: true, message: 'Location updated successfully', location: student.location });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parents/students
// Get all students linked to the logged-in parent
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find({ parentId: req.user._id })
      .populate('school', 'name contact.phone')
      .populate({
        path: 'assignedBus',
        select: 'busId capacity',
        populate: {
          path: 'driver',
          select: 'name phone'
        }
      });
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parents/bus/:busId/live
// جلب بيانات الرحلة النشطة لولي الأمر — مع تصفية الخصوصية (أبناؤه فقط)
exports.getBusLive = async (req, res) => {
  try {
    const { busId } = req.params;
    const parentId = req.user._id;

    const Bus = require('../models/Bus');
    const Trip = require('../models/Trip');

    // 1. تحقق أن ولي الأمر لديه طالب واحد على الأقل في هذه الحافلة (تأمين)
    const myStudentInBus = await Student.findOne({ assignedBus: busId, parentId });
    if (!myStudentInBus) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك إذن لتتبع هذه الحافلة'
      });
    }

    // 2. جلب بيانات الحافلة مع المدرسة
    const bus = await Bus.findById(busId).populate('school', 'name location');
    if (!bus) {
      return res.status(404).json({ success: false, message: 'الحافلة غير موجودة' });
    }

    // 3. جلب الرحلة النشطة (إن وجدت)
    const trip = await Trip.findOne({ bus: busId, status: 'active' });

    // 4. جلب أبناء ولي الأمر في هذه الحافلة فقط (الخصوصية: نستبعد باقي الطلاب)
    const myStudents = await Student.find({ assignedBus: busId, parentId })
      .select('name location');

    res.json({
      success: true,
      tripActive:   !!trip,
      routePath:    trip ? trip.routePath : [],
      lastLocation: trip ? trip.lastLocation : null,
      school: bus.school ? {
        name:     bus.school.name,
        location: bus.school.location
      } : null,
      myStudents
    });
  } catch (err) {
    console.error('Get Bus Live Error:', err);
    res.status(500).json({ success: false, message: 'فشل جلب بيانات التتبع' });
  }
};

