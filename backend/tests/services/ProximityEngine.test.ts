import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, closeTestDb } from '../setupDb';
import { computeHeading, getPendingStudents, resolveNextTarget } from '../../src/utils/ProximityEngine';
import Student from '../../src/models/Student';
import Attendance from '../../src/models/Attendance';
import Bus from '../../src/models/Bus';
import School from '../../src/models/School';

// محاكاة السوكيت والإشعارات
jest.mock('../../src/utils/socket', () => ({
  getIO: jest.fn(() => ({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn()
  }))
}));

jest.mock('../../src/utils/FCMService', () => ({
  sendPush: jest.fn()
}));

describe('ProximityEngine (محرك القرب الذكي وتحديد الأهداف)', () => {
  const schoolId = new mongoose.Types.ObjectId();
  const busId = new mongoose.Types.ObjectId();

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
      name: 'مدرسة الاختبار',
      schoolId: 'SCH-TEST',
      emergencyContacts: [{ name: 'إدارة', phone: '0500000000' }]
    });

    await Bus.create({
      _id: busId,
      school: schoolId,
      busId: 'BUS-ENG-1',
      capacity: 25
    });
  });

  describe('computeHeading (بوابة السرعة وتحديد زاوية الاتجاه)', () => {
    it('يحسب زاوية الاتجاه ويحدثها إذا كانت سرعة الحافلة أعلى من 5 كم/س', () => {
      const now = new Date();
      const tenSecAgo = new Date(now.getTime() - 10000);

      // تحرك بمقدار 50 متر شمالاً خلال 10 ثوانٍ (السرعة = 18 كم/س > 5 كم/س)
      const prevPos = { lat: 24.7000, lng: 46.7000, updatedAt: tenSecAgo };
      const currentPos = { lat: 24.70045, lng: 46.7000, updatedAt: now };

      const heading = computeHeading(prevPos, currentPos, 'bus-heading-1');
      expect(heading).toBeDefined();
      expect(heading).toBeCloseTo(0, 0); // شمال = 0°
    });

    it('يحتفظ بآخر اتجاه معروف إذا كانت السرعة أقل من 5 كم/س (الحافلة متوقفة أو في ازدحام)', () => {
      const now = new Date();
      const tenSecAgo = new Date(now.getTime() - 10000);

      // أولاً: تسجيل اتجاه صالح بشرق 90°
      const pos1 = { lat: 24.7000, lng: 46.7000, updatedAt: tenSecAgo };
      const pos2 = { lat: 24.7000, lng: 46.7005, updatedAt: now };
      const initialHeading = computeHeading(pos1, pos2, 'bus-heading-2');
      expect(initialHeading).toBeCloseTo(90, 0);

      // ثانياً: توقف الحافلة (نفس الإحداثيات -> السرعة = 0)
      const pos3 = { lat: 24.7000, lng: 46.7005, updatedAt: new Date(now.getTime() + 5000) };
      const retainedHeading = computeHeading(pos2, pos3, 'bus-heading-2');

      // يجب أن يحتفظ بزاوية الشرق (90°) ولا يرجع null
      expect(retainedHeading).toBeCloseTo(90, 0);
    });

    it('يرجع null إذا لم تكن هناك نقطة سابقة ولم يكن هناك اتجاه مسجل مسبقاً', () => {
      const currentPos = { lat: 24.7000, lng: 46.7000, updatedAt: new Date() };
      const heading = computeHeading(null, currentPos, 'bus-unknown-new');
      expect(heading).toBeNull();
    });
  });

  describe('getPendingStudents (جلب الطلاب غير المنجزين في رحلة اليوم)', () => {
    it('يجلب الطلاب النشطين المسندين للحافلة ويستثني من تم تسجيل نزولهم أو غيابهم اليوم', async () => {
      // 1. طالب لم يسجل له أي حدث اليوم (قيد الانتظار)
      const pendingStudent = await Student.create({
        name: 'طالب في الانتظار',
        studentId: 'S260000101',
        school: schoolId,
        assignedBus: busId,
        nationalId: 'enc_101',
        dob: new Date('2015-01-01'),
        normalizedName: 'طالب في الانتظار',
        location: { type: 'Point', coordinates: [46.71, 24.71] },
        isActive: true
      });

      // 2. طالب صعد الحافلة بالفعل اليوم (منجز لرحلة الذهاب)
      const boardedStudent = await Student.create({
        name: 'طالب ركب الحافلة',
        studentId: 'S260000102',
        school: schoolId,
        assignedBus: busId,
        nationalId: 'enc_102',
        dob: new Date('2015-01-01'),
        normalizedName: 'طالب ركب الحافلة',
        location: { type: 'Point', coordinates: [46.72, 24.72] },
        isActive: true
      });

      await Attendance.create({
        school: schoolId,
        bus: busId,
        student: boardedStudent._id,
        tripType: 'to_school',
        event: 'boarding',
        timestamp: new Date()
      });

      const pendingList = await getPendingStudents(busId, schoolId, 'to_school');

      expect(pendingList.length).toBe(1);
      expect(pendingList[0]._id.toString()).toBe(pendingStudent._id.toString());
    });
  });

  describe('resolveNextTarget (تحديد المحطة التالية)', () => {
    let studentNear: any;
    let studentFar: any;

    beforeEach(async () => {
      // طالب قريب (على بعد ~500 متر من الأصل 24.700, 46.700)
      studentNear = await Student.create({
        name: 'طالب قريب من الحافلة',
        studentId: 'S260000201',
        school: schoolId,
        assignedBus: busId,
        nationalId: 'enc_near',
        dob: new Date('2015-01-01'),
        normalizedName: 'طالب قريب من الحافلة',
        location: { type: 'Point', coordinates: [46.7000, 24.7045] }, // ~500m شمال
        isActive: true
      });

      // طالب بعيد (على بعد ~5 كم)
      studentFar = await Student.create({
        name: 'طالب بعيد عن الحافلة',
        studentId: 'S260000202',
        school: schoolId,
        assignedBus: busId,
        nationalId: 'enc_far',
        dob: new Date('2015-01-01'),
        normalizedName: 'طالب بعيد عن الحافلة',
        location: { type: 'Point', coordinates: [46.7000, 24.7450] }, // ~5000m شمال
        isActive: true
      });
    });

    it('يختار الطالب الأقرب تلقائياً عندما تكون الحسابات آلية (auto)', async () => {
      const busPos = { lat: 24.7000, lng: 46.7000 };

      const targetId = await resolveNextTarget(
        busPos,
        busId,
        schoolId,
        'to_school',
        null
      );

      expect(targetId).toBeDefined();
      expect(targetId?.toString()).toBe(studentNear._id.toString());
    });

    it('يحترم اختيار السائق اليدوي (driver override) حتى لو كان الطالب أبعد مسافة', async () => {
      const busPos = { lat: 24.7000, lng: 46.7000 };

      // السائق اختار الطالب البعيد يدوياً
      const currentTarget = {
        studentId: studentFar._id,
        setBy: 'driver'
      };

      const targetId = await resolveNextTarget(
        busPos,
        busId,
        schoolId,
        'to_school',
        currentTarget
      );

      // يجب أن يعيد الطالب البعيد احتراماً لاختيار السائق
      expect(targetId?.toString()).toBe(studentFar._id.toString());
    });

    it('يعيد null إذا تم إنجاز جميع الطلاب على الحافلة', async () => {
      // تسجيل صعود كلا الطالبين
      await Attendance.create([
        {
          school: schoolId,
          bus: busId,
          student: studentNear._id,
          tripType: 'to_school',
          event: 'boarding',
          timestamp: new Date()
        },
        {
          school: schoolId,
          bus: busId,
          student: studentFar._id,
          tripType: 'to_school',
          event: 'boarding',
          timestamp: new Date()
        }
      ]);

      const targetId = await resolveNextTarget(
        { lat: 24.7000, lng: 46.7000 },
        busId,
        schoolId,
        'to_school',
        null
      );

      expect(targetId).toBeNull();
    });
  });
});
