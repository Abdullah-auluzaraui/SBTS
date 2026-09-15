import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, closeTestDb } from '../setupDb';
import { AuthService } from '../../src/services/AuthService';
import User from '../../src/models/User';
import Student from '../../src/models/Student';
import OTP from '../../src/models/OTP';
import { encrypt } from '../../src/utils/crypto';

describe('AuthService (خدمة المصادقة وإدارة الحسابات)', () => {
  const schoolId = new mongoose.Types.ObjectId();

  it('blocks a seeded demo account outside demo mode', async () => {
    const user = await User.create({ username: 'demo_account', email: 'demo@example.com', password: await bcrypt.hash('Aa1234', 10), name: 'Demo', role: 'parent', school: schoolId, isDemoAccount: true });
    delete process.env.DEMO_MODE;
    await expect(AuthService.login({ username: user.username, password: 'Aa1234' })).rejects.toMatchObject({ code: 'DEMO_DISABLED' });
  });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
    await connectTestDb();
  }, 60000);

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe('login (تسجيل الدخول)', () => {
    it('يسجل الدخول بنجاح مع بيانات صحيحة ويرجع التوكن وبيانات المستخدم', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        username: 'parent_user',
        email: 'parent@example.com',
        password: hashedPassword,
        name: 'ولي الأمر الأول',
        role: 'parent',
        school: schoolId,
        isActive: true
      });

      const result = await AuthService.login({
        username: 'parent_user',
        password: 'password123'
      });

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.user.name).toBe('ولي الأمر الأول');
      expect(result.user.role).toBe('parent');
    });

    it('يرفض تسجيل الدخول بكلمة مرور خاطئة ويرمي INVALID_CREDENTIALS', async () => {
      const hashedPassword = await bcrypt.hash('correct_password', 10);
      await User.create({
        username: 'driver_user',
        email: 'driver@example.com',
        password: hashedPassword,
        name: 'سائق الحافلة',
        role: 'driver',
        school: schoolId,
        isActive: true
      });

      await expect(
        AuthService.login({
          username: 'driver_user',
          password: 'wrong_password'
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'INVALID_CREDENTIALS'
      });
    });

    it('يرفض تسجيل الدخول لاسم مستخدم غير موجود بنفس رسالة الخطأ لمنع التخمين', async () => {
      await expect(
        AuthService.login({
          username: 'non_existent_user',
          password: 'any_password'
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'INVALID_CREDENTIALS'
      });
    });

    it('يرفض تسجيل الدخول لحساب مُعطل (isActive: false) ويرمي ACCOUNT_INACTIVE', async () => {
      const hashedPassword = await bcrypt.hash('secret123', 10);
      await User.create({
        username: 'disabled_user',
        email: 'disabled@example.com',
        password: hashedPassword,
        name: 'مستخدم معطل',
        role: 'schooladmin',
        school: schoolId,
        isActive: false
      });

      await expect(
        AuthService.login({
          username: 'disabled_user',
          password: 'secret123'
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'ACCOUNT_INACTIVE'
      });
    });

    it('يرمي INVALID_CREDENTIALS إذا لم يتم تمرير كلمة المرور', async () => {
      await expect(
        AuthService.login({
          username: 'test_user'
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'INVALID_CREDENTIALS'
      });
    });
  });

  describe('registerRequest & registerVerify (تسجيل ولي أمر وربط الطالب)', () => {
    it('ينشئ رمز OTP بنجاح لبيانات طالب مطابقة وغير مربوط', async () => {
      process.env.DEMO_MODE = 'true';
      const nationalId = '1098765432';
      const dob = '2015-05-15';

      const student = await Student.create({
        name: 'سالم عبدالله الشهري',
        studentId: 'S260000001',
        school: schoolId,
        nationalId: encrypt(nationalId),
        dob: new Date(dob),
        normalizedName: 'سالم عبدالله الشهري',
        location: { type: 'Point', coordinates: [46.7, 24.7] }
      });

      const result = await AuthService.registerRequest({
        username: 'new_parent',
        email: 'new_parent@example.com',
        name: 'عبدالله الشهري',
        phone: '0501112233',
        nationalId,
        dob
      });

      expect(result).toBeDefined();
      expect(result.studentId.toString()).toBe(student._id.toString());
      expect(result.mockOtp).toHaveLength(6);
      delete process.env.DEMO_MODE;
      const standardResult = await AuthService.registerRequest({ username: 'standard_parent', email: 'standard@example.com', name: 'Test Parent', phone: '0501112244', nationalId, dob });
      expect(standardResult.mockOtp).toBeUndefined();
    });

    it('يرفض الطلب إذا كان البريد الإلكتروني أو اسم المستخدم مستخدماً مسبقاً (USER_EXISTS)', async () => {
      await User.create({
        username: 'existing_parent',
        email: 'existing@example.com',
        password: 'hashedpassword',
        name: 'ولي أمر حالي',
        role: 'parent',
        school: schoolId
      });

      await expect(
        AuthService.registerRequest({
          username: 'existing_parent',
          email: 'different@example.com',
          name: 'اسم تجريبي',
          phone: '0509998877',
          nationalId: '1098765432',
          dob: '2015-05-15'
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'USER_EXISTS'
      });
    });

    it('يرفض الطلب إذا لم تتطابق الهوية وتاريخ الميلاد مع أي طالب (STUDENT_NOT_FOUND)', async () => {
      await expect(
        AuthService.registerRequest({
          username: 'parent_x',
          email: 'parent_x@example.com',
          name: 'ولي أمر',
          phone: '0501234567',
          nationalId: '1000000000',
          dob: '2015-01-01'
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'STUDENT_NOT_FOUND'
      });
    });

    it('يرفض ربط طالب مربوط بولي أمر مسبقاً (STUDENT_ALREADY_LINKED)', async () => {
      const existingParentId = new mongoose.Types.ObjectId();
      const nationalId = '1088888888';
      const dob = '2016-08-20';

      await Student.create({
        name: 'فيصل عبدالرحمن',
        studentId: 'S260000002',
        school: schoolId,
        nationalId: encrypt(nationalId),
        dob: new Date(dob),
        normalizedName: 'فيصل عبدالرحمن',
        parentId: existingParentId
      });

      await expect(
        AuthService.registerRequest({
          username: 'another_parent',
          email: 'another@example.com',
          name: 'ولي أمر آخر',
          phone: '0555555555',
          nationalId,
          dob
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'STUDENT_ALREADY_LINKED'
      });
    });

    it('يمنع تجاوز معدل طلبات الـ OTP (أكثر من 3 طلبات في 15 دقيقة) (RATE_LIMIT_EXCEEDED)', async () => {
      const nationalId = '1077777777';
      const dob = '2014-04-10';
      const phone = '0566666666';

      const student = await Student.create({
        name: 'ريان أحمد',
        studentId: 'S260000003',
        school: schoolId,
        nationalId: encrypt(nationalId),
        dob: new Date(dob),
        normalizedName: 'ريان احمد'
      });

      // زرع 3 طلبات OTP سابقة خلال الـ 15 دقيقة
      await OTP.create([
        { phone, otp: '111111', studentId: student._id },
        { phone, otp: '222222', studentId: student._id },
        { phone, otp: '333333', studentId: student._id }
      ]);

      await expect(
        AuthService.registerRequest({
          username: 'rate_limited_parent',
          email: 'ratelimit@example.com',
          name: 'ولي أمر',
          phone,
          nationalId,
          dob
        })
      ).rejects.toMatchObject({
        statusCode: 429,
        message: 'RATE_LIMIT_EXCEEDED'
      });
    });
  });

  describe('forgotPassword & resetPassword (استعادة كلمة المرور)', () => {
    it('يرجع رسالة نجاح موحدة حتى لو لم يكن المستخدم موجوداً (منع تعداد المستخدمين User Enumeration)', async () => {
      const result = await AuthService.forgotPassword('non_existent_username', '0500000000');
      expect(result.success).toBe(true);
      expect(result.message).toContain('إذا كانت البيانات صحيحة');
    });

    it('يرفض إعادة تعيين كلمة المرور إذا كانت كلمة المرور أقل من 6 أحرف (VALIDATION_ERROR)', async () => {
      await expect(
        AuthService.resetPassword('fake_token', '12345')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'VALIDATION_ERROR'
      });
    });

    it('يرفض إعادة تعيين كلمة المرور برمز منتهي أو غير صالح (INVALID_RESET_TOKEN)', async () => {
      await expect(
        AuthService.resetPassword('invalid_jwt_token', 'new_valid_password_123')
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'INVALID_RESET_TOKEN'
      });
    });
  });
});
