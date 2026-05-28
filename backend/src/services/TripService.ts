import Bus from '../models/Bus';
import Student from '../models/Student';
import Trip from '../models/Trip';
import Attendance from '../models/Attendance';
import NotificationService from '../utils/NotificationService';
import * as ProximityEngine from '../utils/ProximityEngine';
import { getIO } from '../utils/socket';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import { ISchool } from '../models/School';

// Shared helper: day window for today in server local time
const todayWindow = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export class TripService {
  static async getDriverDashboardData(schoolId: string, driverId: string, rawTripType?: string, rawPhase?: string) {
    const tripType =
      rawTripType === 'return' || rawTripType === 'to_home' ? 'to_home'
        : rawTripType === 'to_school' ? 'to_school'
          : null;

    const phase = rawPhase === 'checkin' ? 'checkin' : rawPhase === 'route' ? 'route' : null;

    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: schoolId })
      .select('busId capacity school')
      .populate('school', 'location name emergencyContacts');

    let students: Array<mongoose.Document & {
      _id: mongoose.Types.ObjectId;
      name: string;
      studentId: string;
      grade?: string | null;
      location: { type: 'Point'; coordinates: number[] };
      parentId?: { name: string; phone: string } | null;
    }> = [];

    let todayEvents: Array<{
      student: mongoose.Types.ObjectId;
      tripType: 'to_school' | 'to_home' | null;
      event: string;
      timestamp: Date;
    }> = [];

    if (bus) {
      students = await Student.find({ assignedBus: bus._id, school: schoolId })
        .populate('parentId', 'name phone')
        .select('name studentId grade location parentId');

      const { start, end } = todayWindow();

      todayEvents = await Attendance.find({
        school: schoolId,
        bus: bus._id,
        timestamp: { $gte: start, $lte: end }
      })
        .select('student tripType event timestamp')
        .lean();

      if (tripType === 'to_home' && phase !== 'checkin') {
        const absentSet = new Set(
          todayEvents
            .filter(e => (e.event === 'no_board' && e.tripType === 'to_school') || e.event === 'absent')
            .map(e => String(e.student))
        );
        if (absentSet.size > 0) {
          students = students.filter(s => !absentSet.has(String(s._id)));
        }
      }
    }

    return {
      bus: bus ? { busId: bus.busId, capacity: bus.capacity, _id: bus._id } : null,
      school: bus?.school ? {
        name: (bus.school as unknown as ISchool).name,
        location: (bus.school as unknown as ISchool).location,
        emergencyContacts: (bus.school as unknown as ISchool).emergencyContacts || []
      } : null,
      students,
      tripType,
      todayEvents
    };
  }

  static async getTodayStatus(schoolId: string, driverId: string) {
    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: schoolId });
    if (!bus) {
      return { to_school: null, to_home: null };
    }

    const { start, end } = todayWindow();
    const trips = await Trip.find({
      bus: bus._id,
      school: schoolId,
      startedAt: { $gte: start, $lte: end }
    }).select('tripType status routePath startedAt').lean();

    const result: Record<'to_school' | 'to_home', {
      status: string;
      tripId: mongoose.Types.ObjectId;
      routePath: Array<{ lat: number; lng: number }>;
      startedAt: Date;
    } | null> = { to_school: null, to_home: null };
    for (const trip of trips) {
      const key = (trip.tripType || 'to_school') as 'to_school' | 'to_home';
      if (!result[key] || new Date(trip.startedAt) > new Date(result[key]!.startedAt)) {
        result[key] = { status: trip.status, tripId: trip._id, routePath: trip.routePath as Array<{ lat: number; lng: number }>, startedAt: trip.startedAt };
      }
    }

    return result;
  }

  static async startTrip(schoolId: string, driverId: string, routePath: Array<{ lat: number; lng: number }>, tripType: string) {
    if (!routePath || !Array.isArray(routePath) || routePath.length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'routePath مطلوب ويجب أن يكون مصفوفة من {lat, lng}');
    }
    if (!['to_school', 'to_home'].includes(tripType)) {
      throw new AppError(400, 'INVALID_INPUT', 'tripType مطلوب (to_school أو to_home)');
    }

    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: schoolId }).populate('school', 'name location');
    if (!bus) {
      throw new AppError(404, 'NOT_FOUND', 'لا توجد حافلة مخصصة لهذا السائق');
    }

    const { start, end } = todayWindow();

    const completedTrip = await Trip.findOne({
      bus: bus._id,
      school: schoolId,
      tripType,
      status: 'completed',
      startedAt: { $gte: start, $lte: end }
    });
    if (completedTrip) {
      throw new AppError(400, 'TRIP_ALREADY_COMPLETED', 'تم إكمال هذه الرحلة بالفعل اليوم.');
    }

    const activeTrip = await Trip.findOne({
      bus: bus._id,
      school: schoolId,
      tripType,
      status: 'active',
      startedAt: { $gte: start, $lte: end }
    });
    if (activeTrip) {
      return {
        resumed: true,
        tripId: activeTrip._id,
        message: 'الرحلة كانت نشطة بالفعل — تم استئنافها.'
      };
    }

    const trip = await Trip.create({
      school: schoolId,
      bus: bus._id,
      driver: driverId,
      tripType,
      status: 'active',
      routePath
    });

    const students = await Student.find({ assignedBus: bus._id, school: schoolId })
      .select('parentId').lean();

    Promise.allSettled(
      students
        .filter(s => s.parentId)
        .map(s => NotificationService.create(
          s.parentId!,
          schoolId,
          'status_update',
          'TRIP_STARTED',
          { tripId: trip._id, event: 'trip_started', tripType }
        ))
    ).catch(err => console.error('trip_started fan-out error:', err));

    return {
      resumed: false,
      tripId: trip._id,
      message: 'تم بدء الرحلة وحفظ المسار'
    };
  }

  static async endTrip(schoolId: string, driverId: string, requestedTripType?: string) {
    let completedSchoolArrivalStudents: Array<{
      studentId: mongoose.Types.ObjectId;
      parentId: mongoose.Types.ObjectId;
      attendanceId: mongoose.Types.ObjectId | null;
    }> = [];

    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: schoolId });
    if (!bus) {
      throw new AppError(404, 'NOT_FOUND', 'لا توجد حافلة مخصصة لهذا السائق');
    }

    const tripQuery: Record<string, unknown> = { bus: bus._id, status: 'active', school: schoolId };
    if (requestedTripType && ['to_school', 'to_home'].includes(requestedTripType)) {
      tripQuery.tripType = requestedTripType;
    }

    const trip = await Trip.findOne(tripQuery);
    if (!trip) {
      return { success: true, message: 'لا توجد رحلة نشطة — تم التعامل كمنتهية' };
    }

    if (trip.tripType === 'to_school') {
      const { start, end } = todayWindow();
      const [boardingEvents, terminalEvents] = await Promise.all([
        Attendance.find({
          school: schoolId,
          bus: bus._id,
          tripType: 'to_school',
          event: 'boarding',
          timestamp: { $gte: start, $lte: end }
        }).select('student').lean(),
        Attendance.find({
          school: schoolId,
          bus: bus._id,
          tripType: 'to_school',
          event: { $in: ['exit', 'no_board', 'absent'] },
          timestamp: { $gte: start, $lte: end }
        }).select('student').lean()
      ]);

      const terminalSet = new Set(terminalEvents.map(e => String(e.student)));
      const studentIds = [...new Set(
        boardingEvents
          .map(e => String(e.student))
          .filter(sid => !terminalSet.has(sid))
      )];

      if (studentIds.length > 0) {
        const now = new Date();
        await Attendance.bulkWrite(studentIds.map(sid => ({
          updateOne: {
            filter: {
              school: new mongoose.Types.ObjectId(schoolId),
              bus: bus._id,
              student: new mongoose.Types.ObjectId(sid),
              tripType: 'to_school' as const,
              event: 'exit' as const,
              timestamp: { $gte: start, $lte: end }
            },
            update: {
              $set: { timestamp: now, recordedBy: 'manual' as const, driver: new mongoose.Types.ObjectId(driverId), trip: trip._id },
              $setOnInsert: {
                school: new mongoose.Types.ObjectId(schoolId),
                bus: bus._id,
                student: new mongoose.Types.ObjectId(sid),
                tripType: 'to_school' as const,
                event: 'exit' as const
              }
            },
            upsert: true
          }
        })));

        const [arrivalEvents, studentsWithParents] = await Promise.all([
          Attendance.find({
            school: schoolId,
            bus: bus._id,
            student: { $in: studentIds },
            tripType: 'to_school',
            event: 'exit',
            timestamp: { $gte: start, $lte: end }
          }).select('_id student').lean(),
          Student.find({
            _id: { $in: studentIds },
            assignedBus: bus._id,
            school: schoolId
          }).select('_id parentId').lean()
        ]);

        const attendanceByStudent = new Map(arrivalEvents.map(e => [String(e.student), e._id]));
        completedSchoolArrivalStudents = studentsWithParents
          .filter(s => s.parentId)
          .map(s => ({
            studentId: s._id,
            parentId: s.parentId!,
            attendanceId: attendanceByStudent.get(String(s._id)) || null
          }));
      }
    }

    trip.status = 'completed';
    trip.completedAt = new Date();
    await trip.save();

    if (completedSchoolArrivalStudents.length > 0) {
      Promise.allSettled(
        completedSchoolArrivalStudents.map(s => NotificationService.create(
          s.parentId,
          schoolId,
          'status_update',
          'ARRIVED_SCHOOL',
          {
            studentId: s.studentId,
            attendanceId: s.attendanceId,
            tripId: trip._id,
            event: 'exit',
            tripType: 'to_school'
          }
        ))
      ).catch(err => console.error('bulk school-arrival notification fan-out error:', err));
    }

    return { success: true, message: 'تم إنهاء الرحلة بنجاح', tripId: trip._id };
  }

  static async markManualAttendance(schoolId: string, driverId: string, payload: {
    studentId: string;
    busId: string;
    event: string;
    tripType: string;
    recordedBy?: string;
  }) {
    const { studentId, busId, event, tripType, recordedBy: rawRecordedBy } = payload;
    const recordedBy = rawRecordedBy === 'NFC' ? 'NFC' : 'manual';

    if (!studentId || !busId || !event) {
      throw new AppError(400, 'INVALID_INPUT', 'بيانات غير مكتملة لتسجيل الحضور');
    }
    if (!['to_school', 'to_home'].includes(tripType)) {
      throw new AppError(400, 'INVALID_INPUT', 'نوع الرحلة غير صالح (يجب أن يكون to_school أو to_home).');
    }

    const bus = await Bus.findOne({ _id: busId, driver: driverId, school: schoolId });
    if (!bus) {
      throw new AppError(403, 'ACCESS_DENIED', 'الحافلة غير صالحة أو لا تخصك');
    }

    const student = await Student.findOne({ _id: studentId, assignedBus: bus._id, school: schoolId });
    if (!student) {
      throw new AppError(403, 'ACCESS_DENIED', 'الطالب غير مسجل في حافلتك');
    }

    const { start, end } = todayWindow();

    const filter = {
      school: schoolId,
      bus: bus._id,
      student: student._id,
      tripType,
      event,
      timestamp: { $gte: start, $lte: end }
    };

    const update = {
      $set: { timestamp: new Date(), recordedBy, driver: driverId },
      $setOnInsert: {
        school: schoolId,
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

    try {
      const io = getIO();
      io.to(`admin_${schoolId}`).emit('student:status', {
        busId: String(bus._id),
        studentId: String(student._id),
        event,
        tripType
      });
    } catch (_) { }

    if (student.parentId) {
      if (event === 'no_board' && tripType === 'to_home') {
        NotificationService.handleNoBoard(student._id, bus._id, student.parentId, schoolId);
      } else {
        let type = 'status_update';
        let notificationType = 'BUS_STATUS_UPDATE';

        if (event === 'boarding') {
          notificationType = tripType === 'to_school' ? 'BOARDED_BUS_TO_SCHOOL' : 'BOARDED_BUS_TO_HOME';
        } else if (event === 'exit') {
          notificationType = 'ARRIVED_SCHOOL';
        } else if (event === 'no_board' && tripType === 'to_school') {
          notificationType = 'DID_NOT_BOARD';
        } else if (event === 'arrived_home') {
          notificationType = 'ARRIVED_HOME';
        } else if (event === 'no_receiver') {
          type = 'urgent_alert';
          notificationType = 'NO_RECEIVER';
        }

        NotificationService.create(
          student.parentId,
          schoolId,
          type as 'status_update' | 'urgent_alert',
          notificationType,
          { studentId: student._id, attendanceId: attendance!._id, event, tripType }
        );
      }
    }

    return attendance;
  }

  static async updateTripLocation(schoolId: string, driverId: string, lat: number, lng: number) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new AppError(400, 'INVALID_INPUT', 'إحداثيات غير صالحة');
    }

    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: schoolId })
      .select('_id');
    if (!bus) {
      throw new AppError(404, 'NOT_FOUND', 'لا توجد حافلة مرتبطة بهذا السائق');
    }

    const trip = await Trip.findOne({ bus: bus._id, status: 'active' });
    if (!trip) {
      throw new AppError(404, 'NOT_FOUND', 'لا توجد رحلة نشطة');
    }

    const prevLocation = trip.lastLocation?.lat != null
      ? { lat: trip.lastLocation.lat, lng: trip.lastLocation.lng, updatedAt: trip.lastLocation.updatedAt }
      : null;

    trip.prevLocation = prevLocation ? { ...prevLocation } : trip.prevLocation;
    trip.lastLocation = { lat, lng, updatedAt: new Date() };

    const nextTargetId = await ProximityEngine.resolveNextTarget(
      { lat, lng }, 
      bus._id, 
      schoolId, 
      trip.tripType || 'to_school', 
      trip.currentTarget
    );

    if (nextTargetId && String(nextTargetId) !== String(trip.currentTarget?.studentId)) {
      trip.currentTarget = { studentId: nextTargetId, setBy: 'auto', setAt: new Date() };
    }

    await trip.save();

    const students = await Student.find({ assignedBus: bus._id, school: schoolId })
      .select('parentId').lean();

    const io = getIO();
    const payload = { busId: String(bus._id), lat, lng };
    const seen = new Set();
    students.forEach(s => {
      if (s.parentId) {
        const pid = String(s.parentId);
        if (!seen.has(pid)) {
          seen.add(pid);
          io.to(`parent_${pid}`).emit('bus:location', payload);
        }
      }
    });

    io.to(`admin_${schoolId}`).emit('bus:location', payload);

    setImmediate(() => {
      ProximityEngine.evaluate(
        { lat, lng, updatedAt: trip.lastLocation!.updatedAt as Date }, 
        prevLocation as { lat: number; lng: number; updatedAt: Date } | null,
        bus._id, 
        trip._id, 
        schoolId, 
        trip.tripType || 'to_school'
      );
    });

    return trip.currentTarget;
  }

  static async setManualTarget(schoolId: string, driverId: string, studentId: string) {
    if (!studentId) {
      throw new AppError(400, 'INVALID_INPUT', 'معرف الطالب مطلوب');
    }

    const bus = await Bus.findOne({ driver: driverId, isActive: true, school: schoolId });
    if (!bus) {
      throw new AppError(404, 'NOT_FOUND', 'الحافلة غير موجودة');
    }

    const trip = await Trip.findOne({ bus: bus._id, status: 'active' });
    if (!trip) {
      throw new AppError(404, 'NOT_FOUND', 'لا توجد رحلة نشطة');
    }

    trip.currentTarget = { studentId: new mongoose.Types.ObjectId(studentId), setBy: 'driver', setAt: new Date() };
    await trip.save();

    return trip.currentTarget;
  }

  static async undoManualAttendance(schoolId: string, driverId: string, payload: {
    studentId: string;
    busId: string;
    tripType: string;
  }) {
    const { studentId, busId, tripType } = payload;

    if (!studentId || !busId || !tripType) {
      throw new AppError(400, 'INVALID_INPUT', 'بيانات غير مكتملة لإلغاء الحالة');
    }

    const bus = await Bus.findOne({ _id: busId, driver: driverId, school: schoolId });
    if (!bus) {
      throw new AppError(403, 'ACCESS_DENIED', 'الحافلة غير صالحة أو لا تخصك');
    }

    const { start, end } = todayWindow();

    const result = await Attendance.deleteOne({
      school: schoolId,
      bus: bus._id,
      student: studentId,
      tripType,
      event: 'no_board',
      timestamp: { $gte: start, $lte: end }
    });

    if (result.deletedCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'لم يتم العثور على سجل عدم الصعود لهذا الطالب اليوم');
    }

    return true;
  }
}
