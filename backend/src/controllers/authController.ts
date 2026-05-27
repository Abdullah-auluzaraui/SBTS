import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AppError } from '../utils/AppError';

export const registerRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await AuthService.registerRequest(req.body);
    res.json({
      success: true,
      message: 'تم إرسال رمز التحقق إلى جوالك',
      ...result
    });
  } catch (err) {
    next(err);
  }
};

export const registerVerify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await AuthService.registerVerify(req.body);
    res.status(201).json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await AuthService.login(req.body);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

export const verifyInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.query.token as string;
    if (!token) {
      throw new AppError(400, 'NO_TOKEN');
    }
    const result = await AuthService.verifyInvitation(token);
    res.json({
      success: true,
      invitation: result
    });
  } catch (err) {
    next(err);
  }
};

export const acceptInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await AuthService.acceptInvitation(req.body);
    res.status(201).json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, phone } = req.body;
    if (!username || !phone) {
      throw new AppError(400, 'VALIDATION_ERROR');
    }
    const result = await AuthService.forgotPassword(username, phone);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone, otpCode } = req.body;
    if (!phone || !otpCode) {
      throw new AppError(400, 'VALIDATION_ERROR');
    }
    const result = await AuthService.verifyOtp(phone, otpCode);
    res.json({ success: true, message: 'تم التحقق بنجاح', ...result });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      throw new AppError(400, 'VALIDATION_ERROR');
    }
    const result = await AuthService.resetPassword(resetToken, newPassword);
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.' });
  } catch (err) {
    next(err);
  }
};
