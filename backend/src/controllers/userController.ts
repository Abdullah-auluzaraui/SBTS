import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';

export const createDriver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driver = await UserService.createDriver(req.schoolId as string, req.body);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء حساب السائق بنجاح',
      driver
    });
  } catch (err) {
    next(err);
  }
};

export const listDrivers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const showAll = req.query.all === 'true';
    const drivers = await UserService.listDrivers(req.schoolId as string, showAll);
    res.json({ success: true, drivers });
  } catch (err) {
    next(err);
  }
};

export const updateDriverName = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.body;
    const driverId = req.params.id as string;
    const driver = await UserService.updateDriverName(req.schoolId as string, driverId, name);
    res.json({
      success: true,
      message: 'تم تحديث اسم السائق بنجاح',
      driver
    });
  } catch (err) {
    next(err);
  }
};

export const toggleDriverStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driverId = req.params.id as string;
    const result = await UserService.toggleDriverStatus(req.schoolId as string, driverId);
    res.json({
      success: true,
      message: result.message,
      isActive: result.isActive
    });
  } catch (err) {
    next(err);
  }
};
