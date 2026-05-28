import { Request, Response, NextFunction } from 'express';
import { StudentService } from '../services/StudentService';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const student = await StudentService.createStudent(req.schoolId as string, req.body);
    res.status(201).json({ success: true, message: 'Student created successfully', student });
  } catch (err) {
    next(err);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const busId = req.query.busId as string | undefined;
    const showAll = req.query.all === 'true';
    const students = await StudentService.listStudents(req.schoolId as string, busId, showAll);
    res.json({ success: true, students });
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const student = await StudentService.updateStudent(req.schoolId as string, req.params.id as string, req.body);
    res.json({ success: true, message: `Student "${student.name}" updated successfully` });
  } catch (err) {
    next(err);
  }
};

export const unlinkParent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { password } = req.body || {};
    const adminUserId = req.user!._id.toString();
    const result = await StudentService.unlinkParent(req.schoolId as string, req.params.id as string, adminUserId, password);
    res.json({
      success: true,
      message: 'Parent unlinked successfully',
      student: result
    });
  } catch (err) {
    next(err);
  }
};

export const relinkParent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { password } = req.body || {};
    const adminUserId = req.user!._id.toString();
    const result = await StudentService.relinkParent(req.schoolId as string, req.params.id as string, adminUserId, password);
    res.json({
      success: true,
      message: 'Parent relinked successfully',
      student: result
    });
  } catch (err) {
    next(err);
  }
};

export const toggleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const student = await StudentService.toggleStudentStatus(req.schoolId as string, req.params.id as string);
    res.json({
      success: true,
      message: student.isActive ? `Student "${student.name}" activated successfully` : `Student "${student.name}" disabled successfully`,
      isActive: student.isActive
    });
  } catch (err) {
    next(err);
  }
};

export const getUnassigned = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const students = await StudentService.getUnassigned(req.schoolId as string);
    res.json({ success: true, students });
  } catch (err) {
    next(err);
  }
};

export const bulkUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, errorCode: 'NO_FILE', message: 'CSV file is required' });
      return;
    }
    const result = await StudentService.bulkUpload(req.schoolId as string, req.file.buffer);
    res.status(201).json({
      success: true,
      message: 'CSV data uploaded successfully',
      ...result
    });
  } catch (err) {
    next(err);
  }
};
