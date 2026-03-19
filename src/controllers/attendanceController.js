const Attendance = require('../models/Attendance');

// BE-S2-8: GET /api/attendance — List attendance records (scoped, filtered, paginated)
exports.list = async (req, res) => {
  try {
    const { busId, studentId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    // Build query — always scoped to school
    const query = { school: req.schoolId };

    if (busId) query.bus = busId;
    if (studentId) query.student = studentId;

    // Date range filter
    if (dateFrom || dateTo) {
      query.timestamp = {};
      if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('student', 'name studentId')
        .populate('bus', 'busId')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(query)
    ]);

    res.json({
      success: true,
      attendance: records,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
