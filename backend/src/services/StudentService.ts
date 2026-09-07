import mongoose from 'mongoose';
import Student from '../models/Student';
import User from '../models/User';
import { AppError } from '../utils/AppError';
import { encrypt, decrypt, maskData } from '../utils/crypto';
import { normalizeArabicName, isValidSaudiId } from '../utils/textUtils';
import NotificationService from '../utils/NotificationService';
import bcrypt from 'bcryptjs';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

const PARENT_DELETION_GRACE_DAYS = 30;

export class StudentService {
  static PARENT_DELETION_GRACE_DAYS = PARENT_DELETION_GRACE_DAYS;

  static async refreshParentDeletionSchedule(parentId: string) {
    if (!parentId) return;
    const activeLinkedCount = await Student.countDocuments({
      parentId,
      isActive: { $ne: false }
    });

    const parent = await User.findById(parentId);
    if (!parent || parent.role !== 'parent') return;

    if (activeLinkedCount === 0) {
      if (!parent.accountDeletionScheduledAt) {
        const deletionDate = new Date(Date.now() + PARENT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
        parent.accountDeletionScheduledAt = deletionDate;
        await parent.save();
      }
    } else if (parent.accountDeletionScheduledAt) {
      parent.accountDeletionScheduledAt = null as unknown as Date;
      await parent.save();
    }
  }

  static async generateNextStudentId(yearStr: string): Promise<string> {
    const prefix = `S${yearStr}`;
    const latestStudents = await Student.aggregate([
      { $match: { studentId: { $regex: `^${prefix}` } } },
      { $addFields: { numericPart: { $toInt: { $substr: ["$studentId", 3, -1] } } } },
      { $sort: { numericPart: -1 } },
      { $limit: 1 }
    ]);

    let counter = 1;
    if (latestStudents && latestStudents.length > 0) {
      if (latestStudents[0].numericPart) {
        counter = latestStudents[0].numericPart + 1;
      } else if (latestStudents[0].studentId) {
        const numericPart = latestStudents[0].studentId.replace(prefix, '');
        counter = parseInt(numericPart, 10) + 1;
      }
    }

    const paddedCounter = counter.toString().padStart(7, '0');
    return `${prefix}${paddedCounter}`;
  }

  static async createStudent(schoolId: string, data: { name: string; nationalId: string; dob: string; assignedBus?: string; grade?: string }) {
    const { name, nationalId, dob, assignedBus, grade } = data;

    if (!name || name.trim() === '') {
      throw new AppError(400, 'VALIDATION_ERROR', 'اسم الطالب مطلوب');
    }

    if (!nationalId || !dob) {
      throw new AppError(400, 'VALIDATION_ERROR', 'رقم الهوية وتاريخ الميلاد حقول إجبارية');
    }

    const cleanedNationalId = nationalId.toString().trim();
    if (!isValidSaudiId(cleanedNationalId)) {
      throw new AppError(400, 'INVALID_NATIONAL_ID', 'رقم الهوية غير صحيح، يجب أن يتكون من 10 أرقام ويبدأ بـ 1 أو 2');
    }

    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 3) {
      throw new AppError(400, 'VALIDATION_ERROR', 'يجب إدخال الاسم الثلاثي للطالب (مثال: خالد محمد العتيبي)');
    }

    const existingName = await Student.findOne({ school: schoolId, name: name.trim() });
    if (existingName) {
      throw new AppError(400, 'DUPLICATE_NAME', 'يوجد طالب مسجل بنفس هذا الاسم في المدرسة بالفعل');
    }

    const yearStr = new Date().getFullYear().toString().slice(-2);
    const studentId = await this.generateNextStudentId(yearStr);

    const student = await Student.create({
      name: name.trim(),
      nationalId: encrypt(nationalId),
      dob: new Date(dob),
      normalizedName: normalizeArabicName(name),
      studentId,
      grade: grade || null,
      school: schoolId,
      assignedBus: assignedBus || null
    });

    return {
      id: student._id,
      name: student.name,
      studentId: student.studentId,
      nationalId: maskData(nationalId),
      grade: student.grade,
      parentLinked: !!student.parentId
    };
  }

  static async listStudents(schoolId: string, busId?: string, showAll?: boolean) {
    const filter: Record<string, unknown> = { school: schoolId };
    if (busId) filter.assignedBus = busId;
    if (!showAll) filter.isActive = { $ne: false };

    const students = await Student.find(filter)
      .populate('assignedBus', 'busId')
      .populate('parentId', 'name username')
      .populate('previousParentId', 'name')
      .sort({ createdAt: -1 });

    return students.map(s => {
      let decryptedNationalId = null;
      try {
        decryptedNationalId = s.nationalId ? decrypt(s.nationalId) : null;
      } catch (e) {}

      return {
        _id: s._id,
        id: s._id,
        name: s.name,
        studentId: s.studentId,
        nationalId: decryptedNationalId ? maskData(decryptedNationalId) : null,
        parentLinked: !!s.parentId,
        parentName: (s.parentId as unknown as { name: string })?.name || null,
        previousParentId: (s.previousParentId as unknown as { _id: string })?._id || null,
        previousParentName: (s.previousParentId as unknown as { name: string })?.name || null,
        assignedBus: (s.assignedBus as unknown as { busId: string })?.busId || null,
        location: s.location || null,
        isActive: s.isActive !== false
      };
    });
  }

  static async updateStudent(schoolId: string, id: string, data: { name?: string; nationalId?: string }) {
    const student = await Student.findOne({ _id: id, school: schoolId });
    if (!student) {
      throw new AppError(404, 'STUDENT_NOT_FOUND');
    }

    const { name, nationalId } = data;

    if (name && name.trim() !== '') {
      const nameParts = name.trim().split(/\s+/);
      if (nameParts.length < 3) {
        throw new AppError(400, 'VALIDATION_ERROR');
      }
      const duplicate = await Student.findOne({ school: schoolId, name: name.trim(), _id: { $ne: id } });
      if (duplicate) {
        throw new AppError(400, 'DUPLICATE_NAME');
      }
      student.name = name.trim();
      student.normalizedName = normalizeArabicName(name);
    }

    if (nationalId && nationalId.trim() !== '') {
      if (student.parentId) {
        throw new AppError(403, 'NATIONAL_ID_LOCKED');
      }
      const cleaned = nationalId.trim();
      if (!isValidSaudiId(cleaned)) {
        throw new AppError(400, 'INVALID_NATIONAL_ID', 'رقم الهوية غير صحيح، يجب أن يتكون من 10 أرقام ويبدأ بـ 1 أو 2');
      }
      student.nationalId = encrypt(cleaned);
    }

    await student.save();
    return student;
  }

  static async unlinkParent(schoolId: string, id: string, adminUserId: string, passwordConfirm: string) {
    if (!passwordConfirm || typeof passwordConfirm !== 'string') {
      throw new AppError(400, 'PASSWORD_REQUIRED');
    }

    const admin = await User.findById(adminUserId).select('+password');
    if (!admin) {
      throw new AppError(401, 'UNAUTHORIZED');
    }

    const passwordMatch = await bcrypt.compare(passwordConfirm, admin.password!);
    if (!passwordMatch) {
      throw new AppError(401, 'WRONG_PASSWORD');
    }

    const student = await Student.findOne({ _id: id, school: schoolId });
    if (!student) {
      throw new AppError(404, 'STUDENT_NOT_FOUND');
    }

    if (!student.parentId) {
      throw new AppError(400, 'NOT_LINKED');
    }

    const formerParentId = student.parentId;
    student.previousParentId = formerParentId;
    student.parentId = null;
    student.unlinkedAt = new Date();
    student.unlinkedBy = admin._id as unknown as mongoose.Types.ObjectId;
    await student.save();

    await this.refreshParentDeletionSchedule(String(formerParentId));

    NotificationService.create(
      formerParentId,
      schoolId,
      'admin_notice',
      'ACCOUNT_UNLINKED',
      { studentId: student._id }
    );

    return {
      id: student._id,
      name: student.name,
      unlinkedAt: student.unlinkedAt
    };
  }

  static async relinkParent(schoolId: string, id: string, adminUserId: string, passwordConfirm: string) {
    if (!passwordConfirm || typeof passwordConfirm !== 'string') {
      throw new AppError(400, 'PASSWORD_REQUIRED');
    }

    const admin = await User.findById(adminUserId).select('+password');
    if (!admin) {
      throw new AppError(401, 'UNAUTHORIZED');
    }

    const passwordMatch = await bcrypt.compare(passwordConfirm, admin.password!);
    if (!passwordMatch) {
      throw new AppError(401, 'WRONG_PASSWORD');
    }

    const student = await Student.findOne({ _id: id, school: schoolId });
    if (!student) {
      throw new AppError(404, 'STUDENT_NOT_FOUND');
    }

    if (!student.previousParentId) {
      throw new AppError(400, 'NO_PREVIOUS_PARENT');
    }

    if (student.parentId) {
      throw new AppError(400, 'ALREADY_LINKED');
    }

    student.parentId = student.previousParentId;
    student.previousParentId = null;
    student.unlinkedAt = null;
    student.unlinkedBy = null;
    await student.save();

    await this.refreshParentDeletionSchedule(String(student.parentId));

    const parent = await User.findById(student.parentId).select('name');

    return {
      id: student._id,
      name: student.name,
      parentName: parent?.name || null
    };
  }

  static async toggleStudentStatus(schoolId: string, id: string) {
    const student = await Student.findOne({ _id: id, school: schoolId });
    if (!student) {
      throw new AppError(404, 'STUDENT_NOT_FOUND');
    }

    student.isActive = !student.isActive;
    await student.save();
    return student;
  }

  static async getUnassigned(schoolId: string) {
    return Student.find({
      school: schoolId,
      assignedBus: null,
      isActive: { $ne: false },
      'location.coordinates.0': { $ne: 0 }
    }).select('name studentId location');
  }

  static async bulkUpload(schoolId: string, fileBuffer: Buffer) {
    if (!fileBuffer) {
      throw new AppError(400, 'NO_FILE');
    }

    const rows: Array<Record<string, string>> = [];
    const stream = Readable.from(fileBuffer.toString());

    const firstLine = fileBuffer.toString().split('\n')[0] || '';
    const separator = firstLine.includes(';') ? ';' : ',';

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csvParser({
          separator: separator,
          headers: ['name', 'nationalId', 'dob']
        }))
        .on('data', (row: Record<string, string>) => {
          const cleanRow: Record<string, string> = {};
          for (const key in row) {
            let val = row[key];
            if (typeof val === 'string') {
              val = val.replace(/^\uFEFF/, '').trim();
            }
            cleanRow[key] = val;
          }
          rows.push(cleanRow);
        })
        .on('end', () => resolve())
        .on('error', reject);
    });

    if (rows.length === 0) {
      throw new AppError(400, 'EMPTY_FILE');
    }

    let imported = 0;
    let skipped = 0;
    const errors: Array<{ key: string; name?: string; message?: string }> = [];

    const existingStudents = await Student.find({ school: schoolId }).select('name');
    const existingNameSet = new Set(existingStudents.map(s => s.name));

    const yearStr = new Date().getFullYear().toString().slice(-2);
    const nextStudentIdStr = await this.generateNextStudentId(yearStr);
    let nextCounter = parseInt(nextStudentIdStr.replace(`S${yearStr}`, ''), 10);

    for (const row of rows) {
      const rawName = row.name;
      const rawNationalId = row.nationalId;
      const rawDob = row.dob;

      // Skip CSV header row if present
      if (
        rawName &&
        (rawName.toLowerCase() === 'name' || rawName.trim() === 'الاسم' || rawName.trim() === 'اسم الطالب') &&
        (rawNationalId?.toLowerCase().includes('national') || rawNationalId?.includes('هوية'))
      ) {
        continue;
      }

      if (!rawName || rawName.trim() === '') {
        skipped++;
        errors.push({ key: 'skipNoName' });
        continue;
      }

      if (!rawNationalId || !rawDob) {
        skipped++;
        errors.push({ key: 'skipMissingData', name: rawName.trim() });
        continue;
      }

      const cleanedNationalId = rawNationalId.toString().trim();
      if (!isValidSaudiId(cleanedNationalId)) {
        skipped++;
        errors.push({ key: 'skipInvalidNationalId', name: rawName.trim() });
        continue;
      }

      const name = rawName.trim();
      const nameParts = name.split(/\s+/);
      if (nameParts.length < 3) {
        skipped++;
        errors.push({ key: 'skipShortName', name });
        continue;
      }

      if (existingNameSet.has(name)) {
        skipped++;
        errors.push({ key: 'skipDuplicateName', name });
        continue;
      }

      const paddedCounter = nextCounter.toString().padStart(7, '0');
      const studentId = `S${yearStr}${paddedCounter}`;
      nextCounter++;

      let parsedDate = null;
      const dateStr = rawDob.toString().trim();
      const match = dateStr.match(/^(\d{1,2})[\/\-\s]+(\d{1,2})[\/\-\s]+(\d{4})$/);
      if (match) {
        parsedDate = new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
      } else {
        parsedDate = new Date(dateStr);
      }

      if (isNaN(parsedDate.getTime())) {
        skipped++;
        errors.push({ key: 'skipInvalidDate', name });
        continue;
      }

      try {
        await Student.create({
          name,
          nationalId: encrypt(rawNationalId.toString().trim()),
          dob: parsedDate,
          normalizedName: normalizeArabicName(name),
          studentId,
          school: schoolId
        });

        existingNameSet.add(name);
        imported++;
      } catch (insertErr: unknown) {
        skipped++;
        const err = insertErr as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
        if (err.code === 11000 && err.keyPattern && err.keyPattern.studentId) {
          errors.push({ key: 'skipIdConflict', name });
        } else {
          errors.push({ key: 'skipGeneric', name, message: err.message });
        }
      }
    }

    return {
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
