import { Router, Request, Response } from 'express';
import User from '../models/User';
import Student from '../models/Student';
import Bus from '../models/Bus';
import { runSeed } from '../seed-demo';

const router = Router();

const DEMO_ACCOUNTS: Record<string, { username: string; name: string; role: string; roleAr: string }> = {
  superadmin: {
    username: 'superadmin',
    name: 'مدير النظام',
    role: 'superadmin',
    roleAr: 'مدير النظام (Super Admin)'
  },
  schooladmin: {
    username: 's_admin',
    name: 'صالح الغامدي',
    role: 'schooladmin',
    roleAr: 'مدير المدرسة (School Admin)'
  },
  driver: {
    username: 'driver01',
    name: 'محمد سعد العتيبي',
    role: 'driver',
    roleAr: 'سائق الحافلة (Driver)'
  },
  parent: {
    username: 'parent001',
    name: 'ولي الأمر',
    role: 'parent',
    roleAr: 'ولي الأمر (Parent)'
  }
};

const isDemoEnabled = (): boolean =>
  process.env.DEMO_MODE === 'true';

/**
 * GET /api/demo/credentials
 */
router.get('/credentials', (_req: Request, res: Response): void => {
  if (!isDemoEnabled()) {
    res.status(403).json({
      success: false,
      errorCode: 'DEMO_DISABLED',
      message: 'الوضع التجريبي غير مفعّل في هذه البيئة.'
    });
    return;
  }
  res.json({
    success: true,
    data: {
      accounts: DEMO_ACCOUNTS,
      defaultPassword: 'Aa1234'
    }
  });
});

/**
 * GET /api/demo/health
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  if (!isDemoEnabled()) {
    res.status(403).json({ success: false, errorCode: 'DEMO_DISABLED' });
    return;
  }
  try {
    const [superAdmin, schoolAdmin, driver, parent, busCount, studentCount, assignedStudentCount] = await Promise.all([
      User.findOne({ username: 'superadmin', isActive: true }).lean(),
      User.findOne({ username: 's_admin', isActive: true }).lean(),
      User.findOne({ username: 'driver01', isActive: true }).lean(),
      User.findOne({ username: 'parent001', isActive: true }).lean(),
      Bus.countDocuments({ isActive: true }),
      Student.countDocuments({ isActive: true }),
      Student.countDocuments({ assignedBus: { $ne: null } })
    ]);

    const checks = {
      superadminExists: !!superAdmin,
      schooladminExists: !!schoolAdmin,
      driverExists: !!driver,
      parentExists: !!parent,
      busesReady: busCount >= 1,
      studentsReady: studentCount >= 20,
      studentsAssigned: assignedStudentCount > 0
    };

    const healthy = Object.values(checks).every(Boolean);

    res.json({
      success: true,
      healthy,
      checks,
      stats: {
        buses: busCount,
        students: studentCount,
        assignedStudents: assignedStudentCount
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      healthy: false,
      error: error.message
    });
  }
});

/**
 * POST /api/demo/reset
 */
router.post('/reset', async (_req: Request, res: Response): Promise<void> => {
  if (!isDemoEnabled()) {
    res.status(403).json({
      success: false,
      errorCode: 'DEMO_DISABLED',
      message: 'إعادة ضبط البيانات متاحة فقط في بيئة العرض التجريبي (Demo Mode).'
    });
    return;
  }

  try {
    await runSeed();
    res.json({
      success: true,
      message: 'تم إعادة ضبط البيانات التجريبية بنجاح.'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'فشل في إعادة ضبط البيانات',
      error: error.message
    });
  }
});

export default router;
