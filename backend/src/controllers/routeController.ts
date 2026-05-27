import { Request, Response, NextFunction } from 'express';
import { RouteService } from '../services/RouteService';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const route = await RouteService.createRoute(req.schoolId as string, req.body);
    res.status(201).json({ success: true, message: 'Route created successfully', route });
  } catch (err) {
    next(err);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const routes = await RouteService.listRoutes(req.schoolId as string);
    res.json({ success: true, routes });
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const route = await RouteService.updateRoute(req.schoolId as string, req.params.id as string, req.body);
    res.json({ success: true, message: 'Route updated successfully', route });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await RouteService.removeRoute(req.schoolId as string, req.params.id as string);
    res.json({ success: true, message: 'Route deactivated successfully' });
  } catch (err) {
    next(err);
  }
};
