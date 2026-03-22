const Route = require('../models/Route');

// BE-S2-6: Route CRUD — All operations scoped by req.schoolId

// POST /api/routes — Create route
exports.create = async (req, res) => {
  try {
    const { name, students, polyline, driver, estimatedDuration } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'Route name is required' });
    }

    const route = await Route.create({
      school: req.schoolId,
      name,
      students: students || [],
      polyline: polyline || '',
      driver: driver || null,
      estimatedDuration: estimatedDuration || null
    });

    res.status(201).json({ success: true, message: 'Route created successfully', route });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/routes — List routes (scoped)
exports.list = async (req, res) => {
  try {
    const routes = await Route.find({ school: req.schoolId, isActive: true })
      .populate('driver', 'name username')
      .populate('students', 'name location') // Populate students to show on map
      .sort({ createdAt: -1 });

    res.json({ success: true, routes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/routes/:id — Update route
exports.update = async (req, res) => {
  try {
    const route = await Route.findOne({ _id: req.params.id, school: req.schoolId });
    if (!route) {
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Route not found' });
    }

    const { name, students, polyline, driver, estimatedDuration } = req.body;
    if (name !== undefined) route.name = name;
    if (students !== undefined) route.students = students;
    if (polyline !== undefined) route.polyline = polyline;
    if (driver !== undefined) route.driver = driver;
    if (estimatedDuration !== undefined) route.estimatedDuration = estimatedDuration;

    await route.save();
    res.json({ success: true, message: 'Route updated successfully', route });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/routes/:id — Soft delete
exports.remove = async (req, res) => {
  try {
    const route = await Route.findOne({ _id: req.params.id, school: req.schoolId });
    if (!route) {
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Route not found' });
    }

    route.isActive = false;
    await route.save();
    res.json({ success: true, message: 'Route deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
