import { Request, Response, NextFunction } from 'express';

const roleMiddleware = (rolesArray: string[]) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    if (!req.user || !rolesArray.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        errorCode: 'ACCESS_DENIED',
        message: 'You are not allowed to access this resource'
      });
    }
    next();
  };
};

export = roleMiddleware;
