import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/AttendanceService';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busId, studentId, dateFrom, dateTo, tripType, page, limit } = req.query as Record<string, string | undefined>;
    const result = await AttendanceService.listAttendance(req.schoolId as string, {
      busId,
      studentId,
      dateFrom,
      dateTo,
      tripType,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined
    });

    res.json({
      success: true,
      attendance: result.records,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages
      }
    });
  } catch (err) {
    next(err);
  }
};

export const generateReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busId, tripType, dateFrom, dateTo, lang } = req.query as Record<string, string | undefined>;
    const result = await AttendanceService.generateReport(req.schoolId as string, {
      busId,
      tripType,
      dateFrom,
      dateTo,
      lang: (lang === 'ar' || lang === 'en') ? lang : undefined
    });

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="attendance-report-${result.dateLabel}.pdf"`);
    res.send(result.pdfBuffer);
  } catch (err) {
    next(err);
  }
};
