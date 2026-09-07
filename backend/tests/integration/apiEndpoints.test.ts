import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { connectTestDb, clearTestDb, closeTestDb } from '../setupDb';
import User from '../../src/models/User';
import School from '../../src/models/School';
import Student from '../../src/models/Student';
import { encrypt } from '../../src/utils/crypto';

describe('Integration: API Endpoints (اختبارات المسارات الأساسية وخصوصية البيانات)', () => {
  const schoolId = new mongoose.Types.ObjectId();
  const jwtSecret = 'test_jwt_secret_for_endpoints';

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
      name: 'مدرسة المسارات التجريبية',
      schoolId: 'SCH-API-1',
      emergencyContacts: [{ name: 'الإدارة', phone: '0500000000' }]
    });
  });

  const createToken = (userId: mongoose.Types.ObjectId, role: string) => {
    return jwt.sign({ id: userId.toString(), role }, jwtSecret, { expiresIn: '1h' });
  };

  describe('Health Check & Root Endpoints', () => {
    it('GET /api/health يرجع 200 وحالة النظام بنجاح', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET / يرجع رسالة تشغيل الخادم بنجاح', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('SBTS Backend Running Successfully');
    });
  });

  describe('POST /api/auth/login (مسار تسجيل الدخول المباشر)', () => {
    it('يسجل الدخول بنجاح ويرجع التوكن وبيانات المستخدم', async () => {
      const hashedPassword = await bcrypt.hash('secretPass123', 10);
      await User.create({
        username: 'login_api_user',
        email: 'login_api@test.com',
        password: hashedPassword,
        name: 'مستخدم تسجيل الدخول',
        role: 'schooladmin',
        school: schoolId,
        isActive: true
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'login_api_user',
          password: 'secretPass123'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('مستخدم تسجيل الدخول');
    });

    it('يرفض بيانات الدخول الخاطئة ويرجع 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'non_existent',
          password: 'wrong'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('INVALID_CREDENTIALS');
    });
  });

  describe('Students API & Privacy Leak Protection (حماية خصوصية الهويات)', () => {
    let adminToken: string;

    beforeEach(async () => {
      const adminId = new mongoose.Types.ObjectId();
      await User.create({
        _id: adminId,
        username: 'student_admin',
        email: 'st_admin@test.com',
        password: 'hash',
        name: 'مدير شؤون الطلاب',
        role: 'schooladmin',
        school: schoolId,
        isActive: true
      });
      adminToken = createToken(adminId, 'schooladmin');
    });

    it('POST /api/students — ينشئ طالباً ويرجع رقم الهوية مقنّعاً وليس مكشوفاً (201 Created)', async () => {
      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'عبدالله إبراهيم السالم',
          nationalId: '1098765432',
          dob: '2016-04-10'
        });

      expect(res.status).toBe(201);
      expect(res.body.student.name).toBe('عبدالله إبراهيم السالم');
      // أمان حرج: التأكد أن الهوية المعادة للمتصفح مقنعة
      expect(res.body.student.nationalId).toBe('******5432');
      expect(res.body.student.nationalId).not.toBe('1098765432');
    });

    it('GET /api/students — يرجع قائمة الطلاب مع حجب أرقام الهوية تماماً لحماية الخصوصية', async () => {
      // زرع طالب بهوية مشفرة في القاعدة
      await Student.create({
        name: 'ريان منصور الدوسري',
        studentId: 'S260000888',
        school: schoolId,
        nationalId: encrypt('1055443322'),
        dob: new Date('2015-05-05'),
        normalizedName: 'ريان منصور الدوسري'
      });

      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.students)).toBe(true);
      expect(res.body.students.length).toBeGreaterThan(0);

      const foundStudent = res.body.students.find((s: any) => s.studentId === 'S260000888');
      expect(foundStudent).toBeDefined();
      // حماية الخصوصية: إظهار آخر 4 أرقام فقط
      expect(foundStudent.nationalId).toBe('******3322');
      expect(foundStudent.nationalId).not.toContain('105544');
    });
  });
});
