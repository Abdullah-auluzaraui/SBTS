import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { connectTestDb, clearTestDb, closeTestDb } from '../setupDb';
import User from '../../src/models/User';
import School from '../../src/models/School';

describe('Integration: API Security & RBAC (حماية الـ API وفصل الصلاحيات)', () => {
  const schoolId = new mongoose.Types.ObjectId();
  const jwtSecret = 'test_jwt_secret_for_integration';

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
      name: 'مدرسة الحماية',
      schoolId: 'SCH-SEC-1',
      emergencyContacts: [{ name: 'الإدارة', phone: '0500000000' }]
    });
  });

  const createTokenForUser = (userId: mongoose.Types.ObjectId, role: string) => {
    return jwt.sign({ id: userId.toString(), role }, jwtSecret, { expiresIn: '1h' });
  };

  describe('Authentication Guard (التحقق من التوكن)', () => {
    it('يرفض الطلب بدون توكن ويرجع 401 Unauthorized', async () => {
      const res = await request(app).get('/api/admin/buses');
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('يرفض الطلب بتوكن تالف أو غير صالح ويرجع 401', async () => {
      const res = await request(app)
        .get('/api/admin/buses')
        .set('Authorization', 'Bearer invalid_garbage_token_123');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Token invalid');
    });

    it('يرفض التوكن إذا كان الحساب معطلاً (isActive: false) ويرجع 403 ACCOUNT_INACTIVE', async () => {
      const disabledUserId = new mongoose.Types.ObjectId();
      await User.create({
        _id: disabledUserId,
        username: 'inactive_user',
        email: 'inactive@test.com',
        password: 'hash',
        name: 'مستخدم معطل',
        role: 'schooladmin',
        school: schoolId,
        isActive: false
      });

      const token = createTokenForUser(disabledUserId, 'schooladmin');
      const res = await request(app)
        .get('/api/admin/buses')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('ACCOUNT_INACTIVE');
    });
  });

  describe('Role-Based Access Control (RBAC فصل الصلاحيات)', () => {
    it('يمنع ولي الأمر من دخول مسارات مدير المدرسة ويرجع 403 ACCESS_DENIED', async () => {
      const parentUserId = new mongoose.Types.ObjectId();
      await User.create({
        _id: parentUserId,
        username: 'parent_tester',
        email: 'parent@test.com',
        password: 'hash',
        name: 'ولي أمر تجريبي',
        role: 'parent',
        school: schoolId,
        isActive: true
      });

      const parentToken = createTokenForUser(parentUserId, 'parent');

      // محاولة الوصول لمسار إدارة الحافلات الخاص بمدير المدرسة
      const res = await request(app)
        .get('/api/admin/buses')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('ACCESS_DENIED');
    });

    it('يمنع السائق من دخول مسارات المشرف العام (Super Admin) ويرجع 403 ACCESS_DENIED', async () => {
      const driverUserId = new mongoose.Types.ObjectId();
      await User.create({
        _id: driverUserId,
        username: 'driver_tester',
        email: 'driver@test.com',
        password: 'hash',
        name: 'سائق تجريبي',
        role: 'driver',
        school: schoolId,
        isActive: true
      });

      const driverToken = createTokenForUser(driverUserId, 'driver');

      // محاولة الوصول لمسارات المشرف العام
      const res = await request(app)
        .get('/api/super/schools')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('ACCESS_DENIED');
    });

    it('يرفض وصول مستخدم مدرسة غير مربوط بمدرسة (NO_SCHOOL_ASSIGNED)', async () => {
      const unlinkedAdminId = new mongoose.Types.ObjectId();
      await User.collection.insertOne({
        _id: unlinkedAdminId,
        username: 'unlinked_admin',
        email: 'unlinked@test.com',
        password: 'hash',
        name: 'مدير بدون مدرسة',
        role: 'schooladmin',
        school: null,
        isActive: true
      });

      const token = createTokenForUser(unlinkedAdminId, 'schooladmin');

      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('NO_SCHOOL_ASSIGNED');
    });

    it('يسمح لمدير مدرسة مصرح له بالوصول إلى لوحة مدرسته بنجاح (200 OK)', async () => {
      const validAdminId = new mongoose.Types.ObjectId();
      await User.create({
        _id: validAdminId,
        username: 'valid_school_admin',
        email: 'valid_admin@test.com',
        password: 'hash',
        name: 'مدير نظام المدرسة',
        role: 'schooladmin',
        school: schoolId,
        isActive: true
      });

      const adminToken = createTokenForUser(validAdminId, 'schooladmin');

      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('مدير نظام المدرسة');
    });
  });
});
