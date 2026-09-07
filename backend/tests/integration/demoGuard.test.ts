import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { connectTestDb, clearTestDb, closeTestDb } from '../setupDb';
import User from '../../src/models/User';
import School from '../../src/models/School';

describe('Integration: DemoGuard (حماية بيانات وحسابات وضع الديمو)', () => {
  const schoolId = new mongoose.Types.ObjectId();
  const jwtSecret = 'test_jwt_secret_for_demo';

  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    await connectTestDb();
  }, 60000);

  afterAll(async () => {
    delete process.env.DEMO_MODE;
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    await School.create({
      _id: schoolId,
      name: 'مدرسة الديمو',
      schoolId: 'SCH-DEMO-1',
      emergencyContacts: [{ name: 'الإدارة', phone: '0500000000' }]
    });
  });

  const createToken = (userId: mongoose.Types.ObjectId, role: string) => {
    return jwt.sign({ id: userId.toString(), role }, jwtSecret, { expiresIn: '1h' });
  };

  describe('عند تفعيل وضع الديمو (DEMO_MODE = true)', () => {
    beforeEach(() => {
      process.env.DEMO_MODE = 'true';
    });

    it('يمنع حذف الحسابات التجريبية المحمية ويرجع 403 DEMO_PROTECTED', async () => {
      const protectedUserId = new mongoose.Types.ObjectId();
      await User.create({
        _id: protectedUserId,
        username: 'driver01',
        email: 'driver01@sbts.com',
        password: 'hash',
        name: 'السائق التجريبي الأول',
        role: 'driver',
        school: schoolId
      });

      const superAdminId = new mongoose.Types.ObjectId();
      await User.create({
        _id: superAdminId,
        username: 'admin_caller',
        email: 'admin_caller@sbts.com',
        password: 'hash',
        name: 'مدير العمليات',
        role: 'superadmin',
        school: null
      });

      const superToken = createToken(superAdminId, 'superadmin');

      const res = await request(app)
        .delete(`/api/users/${protectedUserId}`)
        .set('Authorization', `Bearer ${superToken}`);

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('DEMO_PROTECTED');
    });

    it('يمنع تعديل كلمة المرور أو تعطيل حساب تجريبي محمي ويرجع 403 DEMO_PROTECTED', async () => {
      const protectedSuperId = new mongoose.Types.ObjectId();
      await User.create({
        _id: protectedSuperId,
        username: 'superadmin',
        email: 'superadmin@sbts.com',
        password: 'hash',
        name: 'مدير النظام',
        role: 'superadmin',
        school: null
      });

      const superToken = createToken(protectedSuperId, 'superadmin');

      const res = await request(app)
        .put(`/api/users/${protectedSuperId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ password: 'new_hacked_password_123' });

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('DEMO_PROTECTED');
    });
  });

  describe('خارج وضع الديمو (DEMO_MODE = false)', () => {
    beforeEach(() => {
      process.env.DEMO_MODE = 'false';
    });

    it('لا يتدخل DemoGuard ولا يمنع العمليات العادية في الإنتاج', async () => {
      const normalUserId = new mongoose.Types.ObjectId();
      await User.create({
        _id: normalUserId,
        username: 'regular_user',
        email: 'regular@test.com',
        password: 'hash',
        name: 'مستخدم عادي',
        role: 'driver',
        school: schoolId
      });

      const superAdminId = new mongoose.Types.ObjectId();
      await User.create({
        _id: superAdminId,
        username: 'super_real',
        email: 'super_real@sbts.com',
        password: 'hash',
        name: 'مشرف إنتاج',
        role: 'superadmin',
        school: null
      });

      const superToken = createToken(superAdminId, 'superadmin');

      const res = await request(app)
        .delete(`/api/users/${normalUserId}`)
        .set('Authorization', `Bearer ${superToken}`);

      // في الإنتاج، الحماية الخاصة بالديمو غير مفعلة
      expect(res.body.errorCode).not.toBe('DEMO_PROTECTED');
    });
  });
});
