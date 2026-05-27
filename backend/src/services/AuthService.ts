import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Student from '../models/Student';
import Invitation from '../models/Invitation';
import OTP from '../models/OTP';
import { decrypt } from '../utils/crypto';
import generateToken from '../utils/generateToken';
import { AppError } from '../utils/AppError';

export class AuthService {
  static async registerRequest(data: {
    username: string;
    email: string;
    name: string;
    phone: string;
    nationalId: string;
    dob: string;
  }) {
    const { username, email, name, phone, nationalId, dob } = data;

    // Check for duplicate parent email or username
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      throw new AppError(400, 'USER_EXISTS');
    }

    // Find the student by nationalId + dob
    const inputDate = new Date(dob).toISOString().split('T')[0];
    const allStudents: any[] = await Student.find({});
    const student = allStudents.find(s => {
      const dbDate = new Date(s.dob).toISOString().split('T')[0];
      const dbNationalId = decrypt(s.nationalId);
      return dbDate === inputDate && dbNationalId === nationalId.trim();
    });

    if (!student) {
      throw new AppError(404, 'STUDENT_NOT_FOUND');
    }

    if (student.parentId) {
      throw new AppError(400, 'STUDENT_ALREADY_LINKED');
    }

    // Rate Limiting Check (max 3 unverified OTPs for this phone in last 15 mins)
    const recentOtps = await OTP.countDocuments({ phone, createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) } });
    if (recentOtps >= 3) {
      throw new AppError(429, 'RATE_LIMIT_EXCEEDED');
    }

    // Generate and save OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({ phone, otp: otpCode, studentId: student._id });

    // Mock SMS
    console.log(`\n========================================`);
    console.log(`📱 MOCK SMS: To ${phone}`);
    console.log(`🔑 OTP Code for linking ${student.name}: ${otpCode}`);
    console.log(`⏳ Expires in 5 minutes.`);
    console.log(`========================================\n`);

    return {
      studentId: student._id,
      mockOtp: otpCode
    };
  }

  static async registerVerify(data: {
    username: string;
    email: string;
    password: string;
    name: string;
    phone: string;
    otp: string;
    studentId: string;
  }) {
    const { username, email, password, name, phone, otp, studentId } = data;

    // Verify OTP
    const otps: any[] = await OTP.find({ phone, studentId });
    if (otps.length === 0) {
      throw new AppError(400, 'OTP_EXPIRED');
    }

    let validOtpDoc = null;
    for (const doc of otps) {
      const isMatch = await doc.matchOTP(otp);
      if (isMatch) {
        validOtpDoc = doc;
        break;
      }
    }

    if (!validOtpDoc) {
      throw new AppError(400, 'INVALID_OTP');
    }

    // Fetch Student
    const student = await Student.findById(studentId);
    if (!student) {
      throw new AppError(404, 'STUDENT_NOT_FOUND');
    }

    if (student.parentId) {
      throw new AppError(400, 'STUDENT_ALREADY_LINKED');
    }

    // Double check email/username duplicate before account creation
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      throw new AppError(400, 'USER_EXISTS');
    }

    // Create User Account
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hash,
      name,
      phone,
      role: 'parent',
      school: student.school
    });

    // Link Student
    student.parentId = user._id;
    await student.save();

    // Clean up OTP
    await OTP.deleteMany({ phone });

    const token = generateToken(user);

    return {
      token,
      user: { id: user._id, name: user.name, role: user.role, schoolId: user.school, phone: user.phone || null }
    };
  }

  static async login(data: { username: string; password?: string }) {
    const { username, password } = data;
    if (!password) {
      throw new AppError(400, 'INVALID_CREDENTIALS');
    }

    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      throw new AppError(400, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError(403, 'ACCOUNT_INACTIVE');
    }

    const match = await bcrypt.compare(password, user.password || '');
    if (!match) {
      throw new AppError(400, 'INVALID_CREDENTIALS');
    }

    const token = generateToken(user);

    return {
      token,
      user: { id: user._id, name: user.name, role: user.role, schoolId: user.school || null, phone: user.phone || null }
    };
  }

  static async verifyInvitation(token: string) {
    const invitation: any = await Invitation.findOne({ token }).populate('school', 'name schoolId');
    if (!invitation) {
      throw new AppError(404, 'INVALID_TOKEN');
    }

    if (invitation.isUsed) {
      throw new AppError(400, 'TOKEN_USED');
    }

    if (invitation.expiresAt < new Date()) {
      throw new AppError(400, 'TOKEN_EXPIRED');
    }

    return {
      schoolName: invitation.school.name,
      schoolId: invitation.school.schoolId,
      email: invitation.email
    };
  }

  static async acceptInvitation(data: { token: string; username: string; password?: string; phone: string }) {
    const { token, username, password, phone } = data;
    if (!password) {
      throw new AppError(400, 'VALIDATION_ERROR');
    }

    const invitation: any = await Invitation.findOne({ token }).populate('school');
    if (!invitation) {
      throw new AppError(404, 'INVALID_TOKEN');
    }
    if (invitation.isUsed) {
      throw new AppError(400, 'TOKEN_USED');
    }
    if (invitation.expiresAt < new Date()) {
      throw new AppError(400, 'TOKEN_EXPIRED');
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      throw new AppError(400, 'USER_EXISTS');
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email: invitation.email,
      password: hash,
      name: invitation.school.name,
      role: 'schooladmin',
      school: invitation.school._id,
      phone,
      isPhoneVerified: true,
      isActive: true
    });

    invitation.isUsed = true;
    await invitation.save();

    const jwtToken = generateToken(user);

    return {
      token: jwtToken,
      user: { id: user._id, name: user.name, role: user.role, schoolId: user.school, phone: user.phone || null }
    };
  }

  static async forgotPassword(username: string, phone: string) {
    const user = await User.findOne({ username, phone });
    if (!user) {
      // Return success message to prevent user enumeration
      return { success: true, message: 'إذا كانت البيانات صحيحة، سيصلك رمز التحقق' };
    }

    const recent = await OTP.countDocuments({
      phone,
      purpose: 'forgot-password',
      createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) }
    });
    if (recent >= 3) {
      throw new AppError(429, 'RATE_LIMIT_EXCEEDED');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({ phone, otp: otpCode, purpose: 'forgot-password' });

    console.log(`\n========================================`);
    console.log(`📱 MOCK SMS [forgot-password]: To ${phone}`);
    console.log(`🔑 OTP Code: ${otpCode}`);
    console.log(`⏳ Expires in 5 minutes.`);
    console.log(`========================================\n`);

    return {
      success: true,
      message: 'تم إرسال رمز التحقق إلى جوالك',
      mockOtp: otpCode
    };
  }

  static async verifyOtp(phone: string, otpCode: string) {
    const otps: any[] = await OTP.find({ phone, purpose: 'forgot-password' });
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

    const user = await User.findOne({ phone });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND');
    }

    const resetToken = jwt.sign(
      { id: user._id, purpose: 'reset-password' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '10m' }
    );

    await OTP.deleteMany({ phone, purpose: 'forgot-password' });

    return {
      resetToken
    };
  }

  static async resetPassword(resetToken: string, newPassword?: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new AppError(400, 'VALIDATION_ERROR');
    }

    let payload: any;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET || 'secret');
    } catch {
      throw new AppError(401, 'INVALID_RESET_TOKEN');
    }

    if (payload.purpose !== 'reset-password') {
      throw new AppError(401, 'INVALID_RESET_TOKEN');
    }

    const hash = await bcrypt.hash(newPassword, 10);
    const updated = await User.findByIdAndUpdate(
      payload.id,
      { password: hash },
      { new: true, runValidators: false }
    );
    if (!updated) {
      throw new AppError(404, 'USER_NOT_FOUND');
    }

    return {
      success: true
    };
  }
}
