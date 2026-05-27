import Bus from '../models/Bus';
import User from '../models/User';
import Student from '../models/Student';
import School from '../models/School';
import Trip from '../models/Trip';
import Attendance from '../models/Attendance';
import { AppError } from '../utils/AppError';

function sqDist(latA: number, lngA: number, latB: number, lngB: number): number {
  const dlat = latA - latB;
  const dlng = (lngA - lngB) * 0.91; // Cosine correction for ~24 degrees N latitude
  return dlat * dlat + dlng * dlng;
}

export class BusService {
  static async createBus(schoolId: string, data: { busId: string; capacity: number; route?: string | null; driver?: string | null }) {
    const { busId, capacity, route, driver } = data;

    if (!busId || !capacity) {
      throw new AppError(400, 'VALIDATION_ERROR');
    }

    const existing = await Bus.findOne({ busId: busId.toUpperCase() });
    if (existing) {
      throw new AppError(400, 'BUS_ALREADY_EXISTS');
    }

    const bus = await Bus.create({
      school: schoolId,
      busId: busId.toUpperCase(),
      capacity,
      route: route || null,
      driver: driver || null
    });

    return bus;
  }

  static async listBuses(schoolId: string, showAll: boolean) {
    const filter: any = { school: schoolId };
    if (!showAll) filter.isActive = true;

    return Bus.find(filter)
      .populate('route', 'name')
      .populate('driver', 'name username')
      .sort({ createdAt: -1 });
  }

  static async updateBus(schoolId: string, id: string, data: { capacity?: number; route?: string | null; driver?: string | null }) {
    const bus = await Bus.findOne({ _id: id, school: schoolId });
    if (!bus) {
      throw new AppError(404, 'BUS_NOT_FOUND');
    }

    const { capacity, route, driver } = data;
    if (capacity !== undefined) bus.capacity = capacity;
    if (route !== undefined) bus.route = route as any;
    if (driver !== undefined) bus.driver = driver as any;

    await bus.save();
    return bus;
  }

  static async removeBus(schoolId: string, id: string) {
    const bus = await Bus.findOne({ _id: id, school: schoolId });
    if (!bus) {
      throw new AppError(404, 'BUS_NOT_FOUND');
    }

    bus.isActive = false;
    await bus.save();
    return bus;
  }

  static async toggleBusStatus(schoolId: string, id: string) {
    const bus = await Bus.findOne({ _id: id, school: schoolId });
    if (!bus) {
      throw new AppError(404, 'BUS_NOT_FOUND');
    }

    bus.isActive = !bus.isActive;
    await bus.save();
    return bus;
  }

  static async listDrivers(schoolId: string) {
    return User.find({ school: schoolId, role: 'driver', isActive: true })
      .select('_id name username')
      .sort({ name: 1 });
  }

  static async autoAssign(schoolId: string, confirm: boolean) {
    // 1. School location
    const school = await School.findById(schoolId).select('location name');
    if (!school || !school.location || school.location.coordinates[0] === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', { key: 'SCHOOL_LOCATION_NOT_SET' });
    }
    const [schoolLng, schoolLat] = school.location.coordinates;

    // 2. Active buses, largest capacity first
    const buses = await Bus.find({ school: schoolId, isActive: true }).sort({ capacity: -1 });
    if (buses.length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', { key: 'NO_ACTIVE_BUSES' });
    }

    // 3. Eligible students: linked parent + valid home location
    const students = await Student.find({
      school: schoolId,
      isActive: true,
      parentId: { $ne: null },
      'location.coordinates.0': { $ne: 0 }
    }).select('_id name studentId location');

    if (students.length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', { key: 'NO_ELIGIBLE_STUDENTS' });
    }

    // 4. Build a mutable pool with flat lat/lng for fast distance comparisons
    let pool = students.map(s => ({
      _id: s._id,
      name: s.name,
      studentId: s.studentId,
      location: s.location,
      lat: s.location!.coordinates[1],
      lng: s.location!.coordinates[0],
    }));

    // 5. Nearest-neighbor seeded clustering
    const assignments: any[] = [];

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
      assignments.push({ bus, students: chunk, route: null as any });
    }

    const unassigned = [...pool];

    // 6. OSRM Trip API for each bus (school is always the last stop)
    for (const assignment of assignments) {
      if (assignment.students.length === 0) continue;
      try {
        const stops = assignment.students
          .map((s: any) => `${s.location.coordinates[0]},${s.location.coordinates[1]}`)
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
            polyline: trip.geometry.coordinates.map((c: any) => [c[1], c[0]]),
            duration: Math.ceil(trip.duration / 60),
            distance: parseFloat((trip.distance / 1000).toFixed(1))
          };
        }
      } catch (osrmErr: any) {
        console.warn(`OSRM failed for bus ${assignment.bus.busId}:`, osrmErr.message);
      }
    }

    // 7. Persist if confirmed
    if (confirm) {
      await Student.updateMany({ school: schoolId }, { $set: { assignedBus: null } });
      for (const { bus, students: busStudents } of assignments) {
        if (busStudents.length === 0) continue;
        await Student.updateMany(
          { _id: { $in: busStudents.map((s: any) => s._id) }, school: schoolId },
          { $set: { assignedBus: bus._id } }
        );
      }
    }

    return {
      confirmed: confirm,
      assignments: assignments.map(a => ({
        bus: { _id: a.bus._id, busId: a.bus.busId, capacity: a.bus.capacity },
        students: a.students.map((s: any) => ({
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
    };
  }

  static async assignStudents(schoolId: string, busId: string, studentIds: string[]) {
    const bus = await Bus.findOne({ _id: busId, school: schoolId });
    if (!bus) {
      throw new AppError(404, 'BUS_NOT_FOUND');
    }

    if (!studentIds || studentIds.length === 0) {
      // Empty list = unassign all students from this bus
      await Student.updateMany({ assignedBus: bus._id, school: schoolId }, { $set: { assignedBus: null } });
      return { assignedCount: 0, blocked: [] };
    }

    // Two-Step Validation
    const candidates = await Student.find({
      _id: { $in: studentIds },
      school: schoolId
    }).select('name parentId location');

    const blocked: string[] = [];
    const validIds: any[] = [];

    for (const student of candidates) {
      if (!student.parentId) {
        blocked.push(`"${student.name}": لم يتم ربطه بولي أمر بعد`);
        continue;
      }
      if (!student.location || student.location.coordinates[0] === 0) {
        blocked.push(`"${student.name}": لم يقم ولي الأمر بتحديد موقع المنزل بعد`);
        continue;
      }
      validIds.push(student._id);
    }

    if (validIds.length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', { blocked });
    }

    // Remove this bus from all students currently assigned to it
    await Student.updateMany({ assignedBus: bus._id, school: schoolId }, { $set: { assignedBus: null } });

    // Assign only the valid students
    await Student.updateMany(
      { _id: { $in: validIds }, school: schoolId },
      { $set: { assignedBus: bus._id } }
    );

    return {
      assignedCount: validIds.length,
      blocked
    };
  }

  static async getActiveLocation(schoolId: string, busId: string) {
    const bus = await Bus.findOne({ _id: busId, school: schoolId });
    if (!bus) {
      throw new AppError(404, 'BUS_NOT_FOUND');
    }

    const trip = await Trip.findOne({ bus: bus._id, status: 'active' })
      .select('lastLocation tripType')
      .lean();

    const lastLocation = trip?.lastLocation?.lat ? trip.lastLocation : null;

    let studentEvents: any[] = [];
    if (trip?.tripType) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const records = await Attendance.find({
        bus:      bus._id,
        school:   schoolId,
        tripType: trip.tripType,
        timestamp: { $gte: startOfToday }
      })
        .select('student event')
        .sort({ timestamp: 1 })
        .lean();

      const eventMap = new Map();
      records.forEach(r => eventMap.set(String(r.student), r.event));
      studentEvents = Array.from(eventMap.entries()).map(([studentId, event]) => ({ studentId, event }));
    }

    return {
      lastLocation,
      studentEvents
    };
  }
}
