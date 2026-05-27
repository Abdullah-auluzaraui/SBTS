import User from '../models/User';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError';

export class UserService {
  static async createDriver(schoolId: string, data: any) {
    const { name, username, password, phone } = data;

    if (!name || !username || !password || !phone) {
      throw new AppError(400, 'VALIDATION_ERROR', 'الاسم واسم المستخدم وكلمة المرور ورقم الجوال مطلوبة');
    }

    if (!/^\d{10}$/.test(phone)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'رقم الجوال يجب أن يتكون من 10 أرقام');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'اسم المستخدم يجب أن يحتوي على حروف إنجليزية وأرقام فقط');
    }

    if (password.length < 6) {
      throw new AppError(400, 'VALIDATION_ERROR', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      throw new AppError(400, 'USERNAME_TAKEN', `اسم المستخدم "${username}" مستخدم بالفعل`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const driver = await User.create({
      name,
      username: username.toLowerCase(),
      email: `${username.toLowerCase()}@driver.sbts`,
      password: hashedPassword,
      role: 'driver',
      school: schoolId,
      phone: phone || null,
      isActive: true
    });

    return {
      id: driver._id,
      name: driver.name,
      username: driver.username,
      phone: driver.phone,
      isActive: driver.isActive
    };
  }

  static async listDrivers(schoolId: string, showAll: boolean) {
    const filter: any = { school: schoolId, role: 'driver' };
    if (!showAll) filter.isActive = true;

    return User.find(filter)
      .select('_id name username phone isActive createdAt')
      .sort({ createdAt: -1 });
  }

  static async updateDriverName(schoolId: string, driverId: string, name: string) {
    if (!name || name.trim() === '') {
      throw new AppError(400, 'VALIDATION_ERROR', 'الاسم مطلوب');
    }

    const driver = await User.findOne({ _id: driverId, school: schoolId, role: 'driver' });
    if (!driver) {
      throw new AppError(404, 'NOT_FOUND', 'السائق غير موجود');
    }

    driver.name = name.trim();
    await driver.save();

    return { id: driver._id, name: driver.name };
  }

  static async toggleDriverStatus(schoolId: string, driverId: string) {
    const driver = await User.findOne({ _id: driverId, school: schoolId, role: 'driver' });
    if (!driver) {
      throw new AppError(404, 'NOT_FOUND', 'السائق غير موجود');
    }

    driver.isActive = !driver.isActive;
    await driver.save();

    return {
      message: driver.isActive ? 'تم تفعيل حساب السائق' : 'تم تعليق حساب السائق',
      isActive: driver.isActive
    };
  }
}
