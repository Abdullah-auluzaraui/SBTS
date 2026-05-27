import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import OTP from '../models/OTP';
import { AppError } from '../utils/AppError';

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED');
    }
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone || null,
        isPhoneVerified: user.isPhoneVerified,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED');
    }
    const { name, email, username } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND');
    }

    if (name !== undefined) {
      if (user.role === 'driver') {
        throw new AppError(403, 'DRIVER_NAME_READONLY');
      }
      if (!name.trim()) {
        throw new AppError(400, 'VALIDATION_ERROR');
      }
      user.name = name.trim();
    }

    if (email !== undefined) {
      if (user.role !== 'schooladmin') {
        throw new AppError(403, 'ACTION_FORBIDDEN');
      }
      const existing = await User.findOne({ email, _id: { $ne: user._id } });
      if (existing) {
        throw new AppError(400, 'EMAIL_TAKEN');
      }
      user.email = email.trim().toLowerCase();
    }

    if (username !== undefined) {
      if (!['parent', 'schooladmin'].includes(user.role)) {
        throw new AppError(403, 'ACTION_FORBIDDEN');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new AppError(400, 'VALIDATION_ERROR');
      }
      const taken = await User.findOne({ username, _id: { $ne: user._id } });
      if (taken) {
        throw new AppError(400, 'USERNAME_TAKEN');
      }
      user.username = username.trim();
    }

    await user.save();

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      user: { name: user.name, email: user.email, username: user.username }
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED');
    }
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError(400, 'VALIDATION_ERROR');
    }
    if (newPassword.length < 6) {
      throw new AppError(400, 'VALIDATION_ERROR');
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND');
    }

    const match = await bcrypt.compare(currentPassword, user.password || '');
    if (!match) {
      throw new AppError(400, 'INVALID_CREDENTIALS');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    next(err);
  }
};

export const requestPhoneChange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED');
    }
    const { newPhone } = req.body;

    if (!newPhone || !/^\d{10}$/.test(newPhone)) {
      throw new AppError(400, 'VALIDATION_ERROR');
    }

    const taken = await User.findOne({ phone: newPhone, _id: { $ne: req.user._id } });
    if (taken) {
      throw new AppError(400, 'USER_EXISTS');
    }

    const recent = await OTP.countDocuments({
      phone: newPhone,
      purpose: 'change-phone',
      createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) }
    });
    if (recent >= 3) {
      throw new AppError(429, 'RATE_LIMIT_EXCEEDED');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({ phone: newPhone, otp: otpCode, purpose: 'change-phone' });

    console.log(`\n========================================`);
    console.log(`📱 MOCK SMS [change-phone]: To ${newPhone}`);
    console.log(`🔑 OTP Code: ${otpCode}`);
    console.log(`⏳ Expires in 5 minutes.`);
    console.log(`========================================\n`);

    res.json({
      success: true,
      message: 'تم إرسال رمز التحقق إلى الرقم الجديد',
      mockOtp: otpCode
    });
  } catch (err) {
    next(err);
  }
};

export const verifyPhoneChange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED');
    }
    const { newPhone, otpCode } = req.body;

    if (!newPhone || !otpCode) {
      throw new AppError(400, 'VALIDATION_ERROR');
    }

    const otps: any[] = await OTP.find({ phone: newPhone, purpose: 'change-phone' });
    if (otps.length === 0) {
      throw new AppError(400, 'OTP_EXPIRED');
    }

    let validDoc = null;
    for (const doc of otps) {
      if (await doc.matchOTP(otpCode)) { validDoc = doc; break; }
    }
    if (!validDoc) {
      throw new AppError(400, 'INVALID_OTP');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND');
    }
    user.phone = newPhone;
    user.isPhoneVerified = true;
    await user.save();

    await OTP.deleteMany({ phone: newPhone, purpose: 'change-phone' });

    res.json({
      success: true,
      message: 'تم تحديث رقم الجوال بنجاح',
      phone: newPhone
    });
  } catch (err) {
    next(err);
  }
};
