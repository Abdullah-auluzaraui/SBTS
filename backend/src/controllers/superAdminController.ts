import { Request, Response, NextFunction } from 'express';
import { SchoolService } from '../services/SchoolService';
import { AppError } from '../utils/AppError';

export const createInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { schoolName, contactEmail, contactPhone } = req.body;
    if (!schoolName || !contactEmail) {
      throw new AppError(400, 'VALIDATION_ERROR');
    }

    const result = await SchoolService.createSchoolInvitation(schoolName, contactEmail, contactPhone);
    res.status(201).json({
      success: true,
      school: result.school,
      invitation: {
        email: contactEmail,
        link: result.invitationLink,
        expiresAt: result.expiresAt
      }
    });
  } catch (err) {
    next(err);
  }
};

export const resendInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { schoolId } = req.params;
    const { email } = req.body;
    
    const result = await SchoolService.resendSchoolInvitation(schoolId as string, email as string);
    res.json({
      success: true,
      message: 'Invitation resent successfully',
      invitation: {
        email: result.email,
        link: result.invitationLink,
        expiresAt: result.expiresAt
      }
    });
  } catch (err) {
    next(err);
  }
};

export const listSchools = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const allSchools = req.query.all === 'true';
    const enriched = await SchoolService.listAllSchools(allSchools);
    res.json({ success: true, schools: enriched });
  } catch (err) {
    next(err);
  }
};

export const toggleSchoolStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await SchoolService.toggleStatus(id as string);
    res.json({
      success: true,
      message: `School "${result.name}" is now ${result.isActive ? 'active' : 'inactive'}`,
      isActive: result.isActive
    });
  } catch (err) {
    next(err);
  }
};
