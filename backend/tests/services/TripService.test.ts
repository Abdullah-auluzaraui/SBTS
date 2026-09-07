import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, closeTestDb } from '../setupDb';
import { TripService } from '../../src/services/TripService';
import Bus from '../../src/models/Bus';
import Student from '../../src/models/Student';
import Trip from '../../src/models/Trip';
import Attendance from '../../src/models/Attendance';
import User from '../../src/models/User';
import School from '../../src/models/School';

// المحاكاة الساخرة للسوكيت والإشعارات الخارجية
jest.mock('../../src/utils/socket', () => ({
  getIO: jest.fn(() => ({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn()
  }))
}));

jest.mock('../../src/utils/FCMService', () => ({
  sendPush: jest.fn()
}));

describe('TripService (خدمة إدارة الرحلات وتسجيل الحضور)', () => {
  const schoolId = new mongoose.Types.ObjectId();
  const driverId = new mongoose.Types.ObjectId();
  let bus: any;

  beforeAll(async () => {
    await connectTestDb();
  }, 60000);

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    await School.create({
      _id: schoolId,
      name: 'مدرسة النجاح الأهلية',
      schoolId: 'SCH-0001',
      emergencyContacts: [{ name: 'الإدارة', phone: '0500000000' }]
    });

    // إنشاء سائق وحافلة للاختبار
    await User.create({
      _id: driverId,
      username: 'test_driver',
      email: 'driver@test.com',
      password: 'hash',
      name: 'سائق تجريبي',
      role: 'driver',
      school: schoolId
    });

    bus = await Bus.create({
      school: schoolId,
      busId: 'BUS-101',
      capacity: 30,
      driver: driverId,
      isActive: true
    });
  });

  describe('startTrip (بدء رحلة جديدة)', () => {
    const validRoute = [{ lat: 24.7136, lng: 46.6753 }, { lat: 24.7200, lng: 46.6800 }];

    it('ينشئ رحلة بحالة active عند إدخال بيانات صحيحة', async () => {
      const result = await TripService.startTrip(
        schoolId.toString(),
        driverId.toString(),
        validRoute,
        'to_school'
      );

      expect(result).toBeDefined();
      expect(result.resumed).toBe(false);
      expect(result.tripId).toBeDefined();

      const savedTrip = await Trip.findById(result.tripId);
      expect(savedTrip).toBeDefined();
      expect(savedTrip?.status).toBe('active');
      expect(savedTrip?.tripType).toBe('to_school');
    });

    it('يرفض بدء الرحلة إذا كانت قد اكتملت بالفعل اليوم من نفس النوع (TRIP_ALREADY_COMPLETED)', async () => {
      // زرع رحلة مكتملة اليوم
      await Trip.create({
        school: schoolId,
        bus: bus._id,
        driver: driverId,
        tripType: 'to_school',
        status: 'completed',
        routePath: validRoute,
        startedAt: new Date()
      });

      await expect(
        TripService.startTrip(schoolId.toString(), driverId.toString(), validRoute, 'to_school')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'TRIP_ALREADY_COMPLETED'
      });
    });

    it('يستأنف الرحلة بدل تكرارها إذا كانت نشطة بالفعل اليوم (resumed: true)', async () => {
      const existingTrip = await Trip.create({
        school: schoolId,
        bus: bus._id,
        driver: driverId,
        tripType: 'to_school',
        status: 'active',
        routePath: validRoute,
        startedAt: new Date()
      });

      const result = await TripService.startTrip(
        schoolId.toString(),
        driverId.toString(),
        validRoute,
        'to_school'
      );

      expect(result.resumed).toBe(true);
      expect(result.tripId.toString()).toBe(existingTrip._id.toString());
    });

    it('يرمي NOT_FOUND إذا كان السائق ليس لديه حافلة معينة', async () => {
      const unknownDriverId = new mongoose.Types.ObjectId();
      await expect(
        TripService.startTrip(schoolId.toString(), unknownDriverId.toString(), validRoute, 'to_school')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'NOT_FOUND'
      });
    });

    it('يرمي INVALID_INPUT إذا كان نوع الرحلة غير صالح', async () => {
      await expect(
        TripService.startTrip(schoolId.toString(), driverId.toString(), validRoute, 'invalid_type')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'INVALID_INPUT'
      });
    });

    it('يرمي INVALID_INPUT إذا كان المسار routePath فارغاً', async () => {
      await expect(
        TripService.startTrip(schoolId.toString(), driverId.toString(), [], 'to_school')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'INVALID_INPUT'
      });
    });
  });

  describe('endTrip (إنهاء الرحلة وتسجيل النزول التلقائي)', () => {
    it('ينهي الرحلة ويسجل نزولاً تلقائياً (exit) لجميع الطلاب الذين ركبوا ولم يسجل نزولهم', async () => {
      // 1. إنشاء رحلة نشطة إلى المدرسة
      const trip = await Trip.create({
        school: schoolId,
        bus: bus._id,
        driver: driverId,
        tripType: 'to_school',
        status: 'active',
        routePath: [{ lat: 24.7, lng: 46.7 }]
      });

      // 2. إنشاء طالبين مسجلين في الحافلة
      const student1 = await Student.create({
        name: 'طالب ركب الحافلة',
        studentId: 'S260000010',
        school: schoolId,
        assignedBus: bus._id,
        nationalId: 'enc_1',
        dob: new Date('2015-01-01'),
        normalizedName: 'طالب ركب الحافلة'
      });

      // 3. تسجيل حدث ركوب (boarding) للطالب 1
      await Attendance.create({
        school: schoolId,
        bus: bus._id,
        student: student1._id,
        tripType: 'to_school',
        event: 'boarding',
        timestamp: new Date()
      });

      // 4. إنهاء الرحلة
      const endResult = await TripService.endTrip(schoolId.toString(), driverId.toString(), 'to_school');
      expect(endResult.success).toBe(true);

      // 5. التحقق من تحول حالة الرحلة إلى completed
      const updatedTrip = await Trip.findById(trip._id);
      expect(updatedTrip?.status).toBe('completed');
      expect(updatedTrip?.completedAt).toBeDefined();

      // 6. التحقق من إنشاء حدث exit تلقائياً للطالب 1
      const exitAttendance = await Attendance.findOne({
        student: student1._id,
        tripType: 'to_school',
        event: 'exit'
      });
      expect(exitAttendance).toBeDefined();
    });

    it('يعيد نجاحاً بأمان عند استدعائه بدون وجود رحلة نشطة (Idempotent)', async () => {
      const result = await TripService.endTrip(schoolId.toString(), driverId.toString(), 'to_school');
      expect(result.success).toBe(true);
      expect(result.message).toContain('لا توجد رحلة نشطة');
    });
  });

  describe('markManualAttendance & undoManualAttendance (تسجيل وإلغاء الحضور اليدوي)', () => {
    let assignedStudent: any;

    beforeEach(async () => {
      assignedStudent = await Student.create({
        name: 'أنس محمد القرني',
        studentId: 'S260000020',
        school: schoolId,
        assignedBus: bus._id,
        nationalId: 'enc_ans',
        dob: new Date('2015-02-02'),
        normalizedName: 'انس محمد القرني'
      });
    });

    it('يسجل صعود الطالب بنجاح بواسطة السائق', async () => {
      const attendance = await TripService.markManualAttendance(
        schoolId.toString(),
        driverId.toString(),
        {
          studentId: assignedStudent._id.toString(),
          busId: bus._id.toString(),
          event: 'boarding',
          tripType: 'to_school'
        }
      );

      expect(attendance).toBeDefined();
      expect(attendance?.event).toBe('boarding');
      expect(attendance?.tripType).toBe('to_school');
    });

    it('يرفض تسجيل الحضور لطالب غير مسجل في حافلة السائق (ACCESS_DENIED)', async () => {
      const otherBus = await Bus.create({
        school: schoolId,
        busId: 'BUS-999',
        capacity: 20
      });

      const unassignedStudent = await Student.create({
        name: 'طالب في حافلة أخرى',
        studentId: 'S260000030',
        school: schoolId,
        assignedBus: otherBus._id,
        nationalId: 'enc_other',
        dob: new Date('2015-03-03'),
        normalizedName: 'طالب في حافلة اخري'
      });

      await expect(
        TripService.markManualAttendance(
          schoolId.toString(),
          driverId.toString(),
          {
            studentId: unassignedStudent._id.toString(),
            busId: bus._id.toString(),
            event: 'boarding',
            tripType: 'to_school'
          }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'ACCESS_DENIED'
      });
    });

    it('يُحدّث السجل بدلاً من تكراره عند إرسال نفس الحدث لنفس الطالب اليوم (Upsert)', async () => {
      // النداء الأول
      await TripService.markManualAttendance(
        schoolId.toString(),
        driverId.toString(),
        {
          studentId: assignedStudent._id.toString(),
          busId: bus._id.toString(),
          event: 'boarding',
          tripType: 'to_school'
        }
      );

      // النداء الثاني المكرر
      await TripService.markManualAttendance(
        schoolId.toString(),
        driverId.toString(),
        {
          studentId: assignedStudent._id.toString(),
          busId: bus._id.toString(),
          event: 'boarding',
          tripType: 'to_school'
        }
      );

      const records = await Attendance.find({
        student: assignedStudent._id,
        event: 'boarding',
        tripType: 'to_school'
      });

      // يجب أن يكون سجلاً واحداً فقط محدثاً وليس مكرراً
      expect(records.length).toBe(1);
    });

    it('يحذف سجل no_board بنجاح عند تراجع السائق (undo)', async () => {
      // تسجيل عدم صعود أولاً
      await TripService.markManualAttendance(
        schoolId.toString(),
        driverId.toString(),
        {
          studentId: assignedStudent._id.toString(),
          busId: bus._id.toString(),
          event: 'no_board',
          tripType: 'to_school'
        }
      );

      const undoSuccess = await TripService.undoManualAttendance(
        schoolId.toString(),
        driverId.toString(),
        {
          studentId: assignedStudent._id.toString(),
          busId: bus._id.toString(),
          tripType: 'to_school'
        }
      );

      expect(undoSuccess).toBe(true);

      const recordAfterUndo = await Attendance.findOne({
        student: assignedStudent._id,
        event: 'no_board'
      });
      expect(recordAfterUndo).toBeNull();
    });

    it('يرمي NOT_FOUND عند محاولة التراجع عن سجل غير موجود', async () => {
      await expect(
        TripService.undoManualAttendance(
          schoolId.toString(),
          driverId.toString(),
          {
            studentId: assignedStudent._id.toString(),
            busId: bus._id.toString(),
            tripType: 'to_school'
          }
        )
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'NOT_FOUND'
      });
    });
  });
});
