import { Request, Response, NextFunction } from 'express';
import { SchoolService } from '../services/SchoolService';

export const getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ success: true, message: `Welcome Admin ${req.user!.name}` });
  } catch (err) {
    next(err);
  }
};

export const getSchool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const school = await SchoolService.getSchoolInfo(req.schoolId as string);
    res.json({ success: true, school });
  } catch (err) {
    next(err);
  }
};

export const updateSchoolLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lat, lng } = req.body;
    const location = await SchoolService.updateSchoolLocation(
      req.schoolId as string,
      parseFloat(lat),
      parseFloat(lng)
    );
    res.json({ success: true, message: 'School location updated', location });
  } catch (err) {
    next(err);
  }
};

export const updateSchoolEmergencyContacts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { contacts } = req.body;
    const emergencyContacts = await SchoolService.updateSchoolEmergencyContacts(
      req.schoolId as string,
      contacts
    );
    res.json({ success: true, message: 'Emergency contacts updated', emergencyContacts });
  } catch (err) {
    next(err);
  }
};
