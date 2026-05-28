import { Request, Response, NextFunction } from 'express';
import { ParentService } from '../services/ParentService';

export const requestLinking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nationalId, dob, phone } = req.body;
    const result = await ParentService.requestLinking(
      req.schoolId,
      req.user!,
      nationalId,
      dob,
      phone
    );

    res.json({
      success: true,
      message: 'تم إرسال رمز التحقق إلى جوالك',
      studentId: result.studentId
    });
  } catch (err) {
    next(err);
  }
};

export const verifyLinking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { otp, studentId, phone } = req.body;
    const result = await ParentService.verifyLinking(
      req.schoolId,
      req.user!,
      otp,
      studentId,
      phone
    );

    res.json({
      success: true,
      message: 'تم ربط الطالب بنجاح',
      phone: result.phone,
      student: result.student
    });
  } catch (err) {
    next(err);
  }
};

export const updateLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lat, lng } = req.body;
    const studentId = req.params.id as string;
    const parentId = req.user!._id.toString();

    const location = await ParentService.updateLocation(parentId, studentId, lat, lng);

    res.json({
      success: true,
      message: 'Location updated successfully',
      location
    });
  } catch (err) {
    next(err);
  }
};

export const relink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentId, nationalId } = req.body || {};
    const parentId = req.user!._id.toString();

    const student = await ParentService.relink(parentId, studentId, nationalId);

    res.json({
      success: true,
      message: 'تم إعادة الربط بنجاح',
      student
    });
  } catch (err) {
    next(err);
  }
};

export const getStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parentId = req.user!._id.toString();
    const result = await ParentService.getStudents(parentId);

    res.json({
      success: true,
      students: result.students,
      account: result.account
    });
  } catch (err) {
    next(err);
  }
};

export const getBusLive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const busId = req.params.busId as string;
    const parentId = req.user!._id.toString();

    const result = await ParentService.getBusLive(busId, parentId, req.schoolId);

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};
