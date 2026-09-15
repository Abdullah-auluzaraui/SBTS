import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

const PROTECTED_USERNAMES = ['superadmin', 's_admin', 'driver01', 'driver02', 'parent001', 'parent002'];

export const demoGuard = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
  // Active in demo mode
  const isDemo = process.env.DEMO_MODE === 'true';
  if (!isDemo) return next();

  const method = req.method.toUpperCase();
  const path = req.path.toLowerCase();

  const pathParts = req.path.split('/').filter(Boolean);
  const lastSegment = pathParts[pathParts.length - 1];
  const possibleId = (lastSegment && /^[0-9a-fA-F]{24}$/.test(lastSegment)) ? lastSegment : null;

  // 1. Block DELETE requests targeting protected accounts
  if (method === 'DELETE') {
    const targetId = req.params.id || req.body?.id || possibleId;
    if (targetId) {
      const user = await User.findById(targetId).select('username');
      if (user && PROTECTED_USERNAMES.includes(user.username)) {
        return res.status(403).json({
          success: false,
          errorCode: 'DEMO_PROTECTED',
          message: 'لا يمكن حذف الحسابات التجريبية الأساسية في وضع العرض (Demo Mode).'
        });
      }
    }
  }

  // 2. Block password modifications or inactivation of protected accounts
  if (method === 'PUT' || method === 'PATCH' || method === 'POST') {
    if (path.includes('password') || req.body?.password || req.body?.isActive === false) {
      const targetId = req.params.id || req.body?.id || (req.user as any)?._id || possibleId;
      if (targetId) {
        const user = await User.findById(targetId).select('username');
        if (user && PROTECTED_USERNAMES.includes(user.username)) {
          return res.status(403).json({
            success: false,
            errorCode: 'DEMO_PROTECTED',
            message: 'لا يمكن تغيير كلمة المرور أو تعطيل الحسابات التجريبية في وضع العرض.'
          });
        }
      }
    }
  }

  next();
};

export default demoGuard;
