import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, closeTestDb } from '../setupDb';
import { StudentService } from '../../src/services/StudentService';
import Student from '../../src/models/Student';
import User from '../../src/models/User';
import School from '../../src/models/School';
import { decrypt } from '../../src/utils/crypto';

// محاكاة إرسال الإشعارات
jest.mock('../../src/utils/NotificationService', () => ({
  create: jest.fn()
}));

describe('StudentService (خدمة إدارة الطلاب واستيراد البيانات)', () => {
  const schoolId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();

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
      name: 'مدرسة الرواد',
      schoolId: 'SCH-0002',
      emergencyContacts: [{ name: 'الإدارة', phone: '0501234567' }]
    });

    const hashedPassword = await bcrypt.hash('admin_pass_123', 10);
    await User.create({
      _id: adminId,
      username: 'school_admin',
      email: 'admin@school.com',
      password: hashedPassword,
      name: 'مدير المدرسة',
      role: 'schooladmin',
      school: schoolId
    });
  });

  describe('createStudent (تسجيل طالب جديد)', () => {
    it('ينشئ طالباً بنجاح مع تشفير الهوية الوطنية وتوليد معرف تسلسلي', async () => {
      const nationalId = '1099887766';
      const result = await StudentService.createStudent(schoolId.toString(), {
        name: 'فيصل سلطان العتيبي',
        nationalId,
        dob: '2016-03-15'
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('فيصل سلطان العتيبي');
      expect(result.studentId).toMatch(/^S\d{2}\d{7}$/);
      expect(result.nationalId).toBe('******7766'); // مقنع بآخر 4 أرقام

      const inDb = await Student.findById(result.id);
      expect(inDb).toBeDefined();
      expect(decrypt(inDb!.nationalId)).toBe(nationalId); // مشفر في القاعدة
      expect(inDb!.normalizedName).toBe('فيصل سلطان العتيبي');
    });

    it('يرفض الاسم الثنائي ويرمي VALIDATION_ERROR (قاعدة عمل: الاسم الثلاثي إجباري)', async () => {
      await expect(
        StudentService.createStudent(schoolId.toString(), {
          name: 'فيصل سلطان',
          nationalId: '1099887766',
          dob: '2016-03-15'
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'VALIDATION_ERROR'
      });
    });

    it('يرفض الهوية الوطنية غير الصحيحة ويرمي INVALID_NATIONAL_ID', async () => {
      await expect(
        StudentService.createStudent(schoolId.toString(), {
          name: 'محمد خالد السبيعي',
          nationalId: '3099887766', // يبدأ بـ 3
          dob: '2016-03-15'
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'INVALID_NATIONAL_ID'
      });
    });

    it('يرفض تسجيل طالب بنفس الاسم في نفس المدرسة (DUPLICATE_NAME)', async () => {
      await StudentService.createStudent(schoolId.toString(), {
        name: 'عبدالعزيز صالح الحربي',
        nationalId: '1011223344',
        dob: '2015-05-10'
      });

      await expect(
        StudentService.createStudent(schoolId.toString(), {
          name: 'عبدالعزيز صالح الحربي',
          nationalId: '1055667788',
          dob: '2015-05-10'
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'DUPLICATE_NAME'
      });
    });
  });

  describe('updateStudent (تحديث بيانات الطالب وقواعد الحماية)', () => {
    it('يرفض تعديل رقم الهوية إذا كان الطالب مربوطاً بالفعل بحساب ولي أمر (NATIONAL_ID_LOCKED)', async () => {
      const parentId = new mongoose.Types.ObjectId();
      const student = await Student.create({
        name: 'سعود فهد الدوسري',
        studentId: 'S260000050',
        school: schoolId,
        nationalId: 'encrypted_id',
        dob: new Date('2015-01-01'),
        normalizedName: 'سعود فهد الدوسري',
        parentId
      });

      await expect(
        StudentService.updateStudent(schoolId.toString(), student._id.toString(), {
          nationalId: '1099999999'
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'NATIONAL_ID_LOCKED'
      });
    });
  });

  describe('unlinkParent (فك ربط ولي الأمر وجدولة الحذف)', () => {
    it('يرفض فك الربط إذا كانت كلمة مرور المدير غير صحيحة (WRONG_PASSWORD)', async () => {
      const parentId = new mongoose.Types.ObjectId();
      const student = await Student.create({
        name: 'ماجد علي القحطاني',
        studentId: 'S260000060',
        school: schoolId,
        nationalId: 'enc_id',
        dob: new Date('2015-01-01'),
        normalizedName: 'ماجد علي القحطاني',
        parentId
      });

      await expect(
        StudentService.unlinkParent(
          schoolId.toString(),
          student._id.toString(),
          adminId.toString(),
          'wrong_password'
        )
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'WRONG_PASSWORD'
      });
    });

    it('يفك الربط بنجاح ويجدول حذف حساب ولي الأمر إذا لم يعد لديه طلاب آخرين', async () => {
      const parent = await User.create({
        username: 'unlinked_parent',
        email: 'parent_unlink@test.com',
        password: 'hash',
        name: 'ولي أمر مفكوك',
        role: 'parent',
        school: schoolId
      });

      const student = await Student.create({
        name: 'طلال بدر المطيري',
        studentId: 'S260000070',
        school: schoolId,
        nationalId: 'enc_id',
        dob: new Date('2015-01-01'),
        normalizedName: 'طلال بدر المطيري',
        parentId: parent._id
      });

      const result = await StudentService.unlinkParent(
        schoolId.toString(),
        student._id.toString(),
        adminId.toString(),
        'admin_pass_123'
      );

      expect(result.id.toString()).toBe(student._id.toString());

      const updatedStudent = await Student.findById(student._id);
      expect(updatedStudent?.parentId).toBeNull();
      expect(updatedStudent?.previousParentId?.toString()).toBe(parent._id.toString());
      expect(updatedStudent?.unlinkedAt).toBeDefined();

      // التحقق من جدولة حذف حساب ولي الأمر بعد مهلة 30 يوماً
      const updatedParent = await User.findById(parent._id);
      expect(updatedParent?.accountDeletionScheduledAt).toBeDefined();
      expect(updatedParent?.accountDeletionScheduledAt).not.toBeNull();
    });
  });

  describe('generateNextStudentId (توليد معرف الطالب التسلسلي)', () => {
    it('يولد معرفات تسلسلية منتظمة بدون تكرار', async () => {
      const id1 = await StudentService.generateNextStudentId('26');
      expect(id1).toBe('S260000001');

      await Student.create({
        name: 'طالب تسلسلي أول',
        studentId: id1,
        school: schoolId,
        nationalId: 'enc',
        dob: new Date(),
        normalizedName: 'طالب تسلسلي اول'
      });

      const id2 = await StudentService.generateNextStudentId('26');
      expect(id2).toBe('S260000002');
    });
  });

  describe('bulkUpload (الرفع والاستيراد الجماعي للطلاب من ملف CSV)', () => {
    it('يستورد قائمة طلاب بنجاح من ملف CSV صحيح', async () => {
      const csvContent =
        'name,nationalId,dob\n' +
        'ياسر أحمد الزهراني,1011122233,2015-06-01\n' +
        'بندر سعد الغامدي,1044455566,2016-07-02\n';

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await StudentService.bulkUpload(schoolId.toString(), buffer);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);

      const count = await Student.countDocuments({ school: schoolId });
      expect(count).toBe(2);
    });

    it('يتخطى الصفوف المعيبة والأسماء المكررة ويكمل استيراد البقية دون انهيار', async () => {
      const csvContent =
        'name,nationalId,dob\n' +
        'طارق فهد الشمري,1012345678,2015-01-01\n' +
        'اسم ثنائي,1022233344,2015-01-01\n' + // اسم غير ثلاثي -> تخطي
        'راشد محمد النعمي,3033344455,2015-01-01\n' + // هوية تبدأ بـ 3 -> تخطي
        'طارق فهد الشمري,1099999999,2015-01-01\n' + // اسم مكرر -> تخطي
        'وليد سامي العنزي,1088877766,2015-01-01\n'; // صحيح -> استيراد

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await StudentService.bulkUpload(schoolId.toString(), buffer);

      expect(result.imported).toBe(2); // طارق + وليد
      expect(result.skipped).toBe(3); // ثنائي + هوية خاطئة + مكرر
      expect(result.errors?.length).toBe(3);
    });
  });
});
