import { Request, Response, NextFunction } from 'express';
import { BusService } from '../services/BusService';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bus = await BusService.createBus(req.schoolId as string, req.body);
    res.status(201).json({ success: true, message: 'Bus created successfully', bus });
  } catch (err) {
    next(err);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const showAll = req.query.all === 'true';
    const buses = await BusService.listBuses(req.schoolId as string, showAll);
    res.json({ success: true, buses });
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bus = await BusService.updateBus(req.schoolId as string, req.params.id as string, req.body);
    res.json({ success: true, message: 'Bus updated successfully', bus });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await BusService.removeBus(req.schoolId as string, req.params.id as string);
    res.json({ success: true, message: 'Bus deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

export const toggleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bus = await BusService.toggleBusStatus(req.schoolId as string, req.params.id as string);
    res.json({ success: true, message: bus.isActive ? 'Bus activated' : 'Bus deactivated', isActive: bus.isActive });
  } catch (err) {
    next(err);
  }
};

export const listDrivers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const drivers = await BusService.listDrivers(req.schoolId as string);
    res.json({ success: true, drivers });
  } catch (err) {
    next(err);
  }
};

export const autoAssign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const confirm = req.body.confirm === true;
    const result = await BusService.autoAssign(req.schoolId as string, confirm);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const assignStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentIds } = req.body;
    const result = await BusService.assignStudents(req.schoolId as string, req.params.id as string, studentIds);
    res.json({
      success: true,
      message: result.assignedCount > 0 ? `تم تعيين ${result.assignedCount} طالب للحافلة بنجاح` : 'تم إلغاء تعيين جميع الطلاب من الحافلة',
      assigned: result.assignedCount,
      blocked: result.blocked.length > 0 ? result.blocked : undefined
    });
  } catch (err) {
    next(err);
  }
};

export const getActiveLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await BusService.getActiveLocation(req.schoolId as string, req.params.id as string);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};
