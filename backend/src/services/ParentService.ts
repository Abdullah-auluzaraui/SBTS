import mongoose from 'mongoose';
import Student from '../models/Student';
import OTP, { IOTP } from '../models/OTP';
import User from '../models/User';
import Bus from '../models/Bus';
import Trip from '../models/Trip';
import Attendance from '../models/Attendance';
import { ISchool } from '../models/School';
import { decrypt } from '../utils/crypto';
import { AppError } from '../utils/AppError';
import { StudentService } from './StudentService';

export class ParentService {
  static async requestLinking(schoolId: string | undefined, parentUser: { _id: mongoose.Types.ObjectId; phone?: string }, nationalId: string, dob: string, phoneInput?: string) {
    const phone = parentUser.phone || phoneInput;
    if (!phone) {
      throw new AppError(400, 'INVALID_INPUT', 'جميع الحقول مطلوبة (الهوية، تاريخ الميلاد، رقم الجوال)');
    }
    if (!nationalId || !dob) {
      throw new AppError(400, 'INVALID_INPUT', 'جميع الحقول مطلوبة (الهوية، تاريخ الميلاد)');
    }

    const schoolFilter = schoolId ? { school: schoolId } : {};
    const students = await Student.find(schoolFilter);

    if (students.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'لم يتم العثور على طالب بهذه البيانات');
    }

    const inputDate = new Date(dob).toISOString().split('T')[0];
    const student = students.find(s => {
      const dbDate = new Date(s.dob).toISOString().split('T')[0];
      const dbNationalId = decrypt(s.nationalId);
      return dbDate === inputDate && dbNationalId === nationalId.trim();
    });

    if (!student) {
      throw new AppError(404, 'NOT_FOUND', 'بيانات الهوية أو تاريخ الميلاد غير متطابقة');
    }

    if (student.parentId) {
      throw new AppError(400, 'ALREADY_LINKED', 'هذا الطالب مرتبط بحساب ولي أمر بالفعل');
    }

    const recentOtps = await OTP.countDocuments({ phone, createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) } });
    if (recentOtps >= 3) {
      throw new AppError(429, 'RATE_LIMIT_EXCEEDED', 'لقد تجاوزت الحد المسموح من المحاولات. يرجى المحاولة لاحقاً.');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.create({
      phone,
      otp: otpCode,
      studentId: student._id
    });

    console.log(`\n========================================`);
    console.log(`📱 MOCK SMS: To ${phone}`);
    console.log(`🔑 OTP Code for linking ${student.name}: ${otpCode}`);
    console.log(`⏳ Expires in 5 minutes.`);
    console.log(`========================================\n`);

    return { studentId: student._id };
  }

  static async verifyLinking(schoolId: string | undefined, parentUser: { _id: mongoose.Types.ObjectId; phone?: string }, otp: string, studentId: string, phoneInput?: string) {
    const phone = parentUser.phone || phoneInput;
    if (!phone || !otp || !studentId) {
      throw new AppError(400, 'INVALID_INPUT', 'البيانات غير مكتملة');
    }

    const otps: IOTP[] = await OTP.find({ phone, studentId });
    if (otps.length === 0) {
      throw new AppError(400, 'INVALID_OTP', 'رمز التحقق غير صالح أو منتهي الصلاحية');
    }

    let validOtpDoc: IOTP | null = null;
    for (const doc of otps) {
      const isMatch = await doc.matchOTP(otp);
      if (isMatch) {
        validOtpDoc = doc;
        break;
      }
    }

    if (!validOtpDoc) {
      throw new AppError(400, 'INVALID_OTP', 'رمز التحقق غير صحيح');
    }

    const student = await Student.findById(studentId);
    if (!student) {
      throw new AppError(404, 'NOT_FOUND', 'الطالب غير موجود');
    }

    if (student.parentId) {
      throw new AppError(400, 'ALREADY_LINKED', 'الطالب مرتبط بالفعل');
    }

    if (schoolId && String(student.school) !== String(schoolId)) {
      throw new AppError(403, 'ACCESS_DENIED', 'هذا الطالب ينتمي لمدرسة أخرى.');
    }

    const priorGhostOwner = student.previousParentId;

    student.parentId = parentUser._id;
    student.previousParentId = null;
    student.unlinkedAt = null;
    student.unlinkedBy = null;
    await student.save();

    const parent = await User.findById(parentUser._id);
    if (parent && !parent.phone) {
      parent.phone = phone;
      await parent.save();
    }

    await StudentService.refreshParentDeletionSchedule(String(parentUser._id));
    if (priorGhostOwner && String(priorGhostOwner) !== String(parentUser._id)) {
      await StudentService.refreshParentDeletionSchedule(String(priorGhostOwner));
    }

    await OTP.deleteMany({ phone });

    return {
      phone,
      student: { id: student._id, name: student.name, studentId: student.studentId }
    };
  }

  static async updateLocation(parentId: string, studentId: string, lat: number, lng: number) {
    if (lat === undefined || lng === undefined) {
      throw new AppError(400, 'INVALID_INPUT', 'Latitude and Longitude are required');
    }

    const student = await Student.findOne({ _id: studentId, parentId });
    if (!student) {
      throw new AppError(404, 'NOT_FOUND', 'Student not found or not linked to your account');
    }

    student.location = {
      type: 'Point',
      coordinates: [lng, lat]
    };
    
    await student.save();
    return student.location;
  }

  static async relink(parentId: string, studentId: string, nationalId: string) {
    if (!studentId || !nationalId || !String(nationalId).trim()) {
      throw new AppError(400, 'INVALID_INPUT', 'بيانات غير مكتملة');
    }

    const student = await Student.findById(studentId);
    if (!student) {
      throw new AppError(404, 'NOT_FOUND', 'الطالب غير موجود');
    }

    const isMyGhost =
      student.previousParentId &&
      String(student.previousParentId) === String(parentId) &&
      student.unlinkedAt &&
      !student.parentId;
    if (!isMyGhost) {
      throw new AppError(403, 'ACCESS_DENIED', 'هذا الطالب غير متاح لإعادة الربط');
    }

    const storedId = decrypt(student.nationalId);
    if (storedId !== String(nationalId).trim()) {
      throw new AppError(400, 'INVALID_INPUT', 'الهوية الوطنية غير مطابقة');
    }

    student.parentId = new mongoose.Types.ObjectId(parentId);
    student.previousParentId = null;
    student.unlinkedAt = null;
    student.unlinkedBy = null;
    await student.save();

    await StudentService.refreshParentDeletionSchedule(parentId);

    return { id: student._id, name: student.name, studentId: student.studentId };
  }

  static async getStudents(parentId: string) {
    const students = await Student.find({
      $or: [
        { parentId },
        { previousParentId: parentId, unlinkedAt: { $ne: null } }
      ]
    })
      .populate('school', 'name contact.phone emergencyContacts')
      .populate({
        path: 'assignedBus',
        select: 'busId capacity',
        populate: {
          path: 'driver',
          select: 'name phone'
        }
      })
      .sort({ createdAt: -1 });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const studentIds = students.map(s => s._id);
    const todayEvents = await Attendance.find({
      student: { $in: studentIds },
      timestamp: { $gte: startOfDay }
    }).sort({ timestamp: -1 }).lean();

    const latestEventByStudent: Record<string, string> = {};
    for (const e of todayEvents) {
      if (!latestEventByStudent[String(e.student)]) {
        latestEventByStudent[String(e.student)] = e.event;
      }
    }

    const tagged = students.map(s => {
      const isLinked = String(s.parentId || '') === String(parentId);
      const obj = s.toObject() as unknown as Record<string, unknown> & { linkStatus?: string; latestEvent?: string | null; assignedBus?: unknown };
      obj.linkStatus = isLinked ? 'LINKED' : 'UNLINKED';
      obj.latestEvent = latestEventByStudent[String(s._id)] || null;
      
      if (!isLinked) {
        obj.assignedBus = null;
      }
      return obj;
    });

    const parent = await User.findById(parentId).select('accountDeletionScheduledAt');

    return {
      students: tagged,
      account: {
        deletionScheduledAt: parent?.accountDeletionScheduledAt || null
      }
    };
  }

  static async getBusLive(busId: string, parentId: string, schoolId?: string) {
    let bus = null;
    if (mongoose.Types.ObjectId.isValid(busId)) {
      bus = await Bus.findById(busId).populate<{ school: ISchool }>('school', 'name location');
    }
    if (!bus) {
      bus = await Bus.findOne({ busId }).populate<{ school: ISchool }>('school', 'name location');
    }
    if (!bus) {
      throw new AppError(404, 'NOT_FOUND', 'الحافلة غير موجودة');
    }

    const myStudentInBus = await Student.findOne({
      assignedBus: bus._id,
      parentId
    });
    if (!myStudentInBus) {
      throw new AppError(403, 'ACCESS_DENIED', 'ليس لديك إذن لتتبع هذه الحافلة');
    }

    const tripQuery: any = { bus: bus._id, status: 'active' };
    if (schoolId) {
      tripQuery.school = schoolId;
    } else if (bus.school) {
      tripQuery.school = (bus.school as any)._id || bus.school;
    }

    const trip = await Trip.findOne(tripQuery);

    const myStudents = await Student.find({ assignedBus: bus._id, parentId })
      .select('name location');

    return {
      tripActive: !!trip,
      routePath: trip ? trip.routePath : [],
      lastLocation: trip ? trip.lastLocation : null,
      school: bus.school ? {
        name: bus.school.name,
        location: bus.school.location
      } : null,
      myStudents
    };
  }
}
