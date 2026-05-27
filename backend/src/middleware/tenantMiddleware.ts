import { Request, Response, NextFunction } from 'express';

const tenantMiddleware = (req: Request, res: Response, next: NextFunction): any => {
  const unscopedRoles = ['superadmin'];

  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (unscopedRoles.includes(req.user.role)) {
    return next();
  }

  if (!req.user.school) {
    return res.status(403).json({
      success: false,
      errorCode: 'NO_SCHOOL_ASSIGNED',
      message: 'Your account is not linked to any school. Contact the system administrator.'
    });
  }

  req.schoolId = String(req.user.school);
  next();
};

export = tenantMiddleware;
