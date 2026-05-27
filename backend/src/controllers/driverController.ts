import { Request, Response, NextFunction } from 'express';
import { TripService } from '../services/TripService';

export const getDriverDashboardData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driverId = (req as any).user._id;
    const { tripType, phase } = req.query as any;

    const data = await TripService.getDriverDashboardData(
      req.schoolId as string,
      driverId,
      tripType,
      phase
    );

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

export const getTodayStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driverId = (req as any).user._id;
    const result = await TripService.getTodayStatus(req.schoolId as string, driverId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const startTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driverId = (req as any).user._id;
    const { routePath, tripType } = req.body;

    const result = await TripService.startTrip(
      req.schoolId as string,
      driverId,
      routePath,
      tripType
    );

    if (result.resumed) {
      res.status(200).json({
        success: true,
        resumed: true,
        message: result.message,
        tripId: result.tripId
      });
    } else {
      res.status(201).json({
        success: true,
        resumed: false,
        message: result.message,
        tripId: result.tripId
      });
    }
  } catch (err) {
    next(err);
  }
};

export const endTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driverId = (req as any).user._id;
    const requestedTripType = req.body?.tripType;

    const result = await TripService.endTrip(
      req.schoolId as string,
      driverId,
      requestedTripType
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const markManualAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driverId = (req as any).user._id;
    const { studentId, busId, event, tripType, recordedBy } = req.body;

    const attendance = await TripService.markManualAttendance(
      req.schoolId as string,
      driverId,
      { studentId, busId, event, tripType, recordedBy }
    );

    res.status(200).json({
      success: true,
      message: 'تم تسجيل الحالة بنجاح',
      attendance
    });
  } catch (err) {
    next(err);
  }
};

export const updateTripLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driverId = (req as any).user._id;
    const { lat, lng } = req.body;

    const currentTarget = await TripService.updateTripLocation(
      req.schoolId as string,
      driverId,
      lat,
      lng
    );

    res.json({
      success: true,
      currentTarget
    });
  } catch (err) {
    next(err);
  }
};

export const setManualTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driverId = (req as any).user._id;
    const { studentId } = req.body;

    const currentTarget = await TripService.setManualTarget(
      req.schoolId as string,
      driverId,
      studentId
    );

    res.json({
      success: true,
      message: 'تم تحديث الوجهة يدوياً بنجاح',
      currentTarget
    });
  } catch (err) {
    next(err);
  }
};

export const undoManualAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driverId = (req as any).user._id;
    const { studentId, busId, tripType } = req.body;

    await TripService.undoManualAttendance(
      req.schoolId as string,
      driverId,
      { studentId, busId, tripType }
    );

    res.json({
      success: true,
      message: 'تم إلغاء حالة عدم الصعود بنجاح'
    });
  } catch (err) {
    next(err);
  }
};
