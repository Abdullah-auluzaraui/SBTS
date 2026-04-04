const Bus = require('../models/Bus');
const User = require('../models/User');
const Student = require('../models/Student');

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
