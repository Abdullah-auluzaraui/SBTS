const Bus = require('../models/Bus');

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
    const buses = await Bus.find({ school: req.schoolId, isActive: true })
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
