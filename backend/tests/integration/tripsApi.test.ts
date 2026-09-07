import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { connectTestDb, clearTestDb, closeTestDb } from '../setupDb';
import User from '../../src/models/User';
import School from '../../src/models/School';
import Bus from '../../src/models/Bus';
import Student from '../../src/models/Student';

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

describe('Integration: Trips & Driver API (مسارات الرحلات والحضور للسائق)', () => {
  const schoolId = new mongoose.Types.ObjectId();
  const driverId = new mongoose.Types.ObjectId();
  const parentId = new mongoose.Types.ObjectId();
  const jwtSecret = 'test_jwt_secret_for_trips';
  let bus: any;
  let student: any;
  let driverToken: string;
  let parentToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    await connectTestDb();
  }, 60000);

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    await School.create({
      _id: schoolId,
      name: 'مدرسة الرحلات الذكية',
      schoolId: 'SCH-TRIP-1',
      emergencyContacts: [{ name: 'الإدارة', phone: '0500000000' }]
    });

    await User.create({
      _id: driverId,
      username: 'active_driver',
      email: 'driver_trip@test.com',
      password: 'hash',
      name: 'سائق الرحلة',
      role: 'driver',
      school: schoolId,
      isActive: true
    });

    await User.create({
      _id: parentId,
      username: 'unauthorized_parent',
      email: 'parent_trip@test.com',
      password: 'hash',
      name: 'ولي أمر غير مصرح',
      role: 'parent',
      school: schoolId,
      isActive: true
    });

    bus = await Bus.create({
      school: schoolId,
      busId: 'BUS-TRIP-99',
      capacity: 30,
      driver: driverId,
      isActive: true
    });

    student = await Student.create({
      name: 'سعد فهد القحطاني',
      studentId: 'S260000777',
      school: schoolId,
      assignedBus: bus._id,
      nationalId: 'enc_saad',
      dob: new Date('2015-01-01'),
      normalizedName: 'سعد فهد القحطاني'
    });

    driverToken = jwt.sign({ id: driverId.toString(), role: 'driver' }, jwtSecret, { expiresIn: '1h' });
    parentToken = jwt.sign({ id: parentId.toString(), role: 'parent' }, jwtSecret, { expiresIn: '1h' });
  });

  describe('POST /api/driver/trip/start (بدء الرحلة عبر الـ API)', () => {
    it('يبدأ الرحلة بنجاح ويرجع 200 مع معرف الرحلة عند استدعائه بتوكن السائق', async () => {
      const res = await request(app)
        .post('/api/driver/trip/start')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          routePath: [{ lat: 24.71, lng: 46.67 }, { lat: 24.72, lng: 46.68 }],
          tripType: 'to_school'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.tripId).toBeDefined();
    });

    it('يرفض بدء الرحلة إذا استدعاها ولي أمر ويرجع 403 ACCESS_DENIED', async () => {
      const res = await request(app)
        .post('/api/driver/trip/start')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          routePath: [{ lat: 24.71, lng: 46.67 }],
          tripType: 'to_school'
        });

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('ACCESS_DENIED');
    });
  });

  describe('POST /api/driver/attendance/manual (تسجيل الحضور اليدوي عبر الـ API)', () => {
    it('يسجل صعود الطالب ويرجع 200 مع تفاصيل الحضور', async () => {
      const res = await request(app)
        .post('/api/driver/attendance/manual')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          studentId: student._id.toString(),
          busId: bus._id.toString(),
          event: 'boarding',
          tripType: 'to_school'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.attendance).toBeDefined();
      expect(res.body.attendance.event).toBe('boarding');
    });
  });

  describe('POST /api/driver/trip/end (إنهاء الرحلة عبر الـ API)', () => {
    it('ينهي الرحلة بنجاح ويرجع 200 وحالة الانتهاء', async () => {
      // أولاً بدء الرحلة
      await request(app)
        .post('/api/driver/trip/start')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          routePath: [{ lat: 24.71, lng: 46.67 }],
          tripType: 'to_school'
        });

      // ثانياً إنهاء الرحلة
      const res = await request(app)
        .post('/api/driver/trip/end')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          tripType: 'to_school'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('تم إنهاء الرحلة');
    });
  });
});
