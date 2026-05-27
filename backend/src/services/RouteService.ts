import Route from '../models/Route';
import { AppError } from '../utils/AppError';

export class RouteService {
  static async createRoute(schoolId: string, data: {
    name: string;
    students?: string[];
    polyline?: string;
    driver?: string | null;
    estimatedDuration?: number | null;
  }) {
    const { name, students, polyline, driver, estimatedDuration } = data;

    if (!name) {
      throw new AppError(400, 'VALIDATION_ERROR');
    }

    return Route.create({
      school: schoolId,
      name,
      students: students || [],
      polyline: polyline || '',
      driver: driver || null,
      estimatedDuration: estimatedDuration || null
    });
  }

  static async listRoutes(schoolId: string) {
    return Route.find({ school: schoolId, isActive: true })
      .populate('driver', 'name username')
      .populate('students', 'name location') // Populate students to show on map
      .sort({ createdAt: -1 });
  }

  static async updateRoute(schoolId: string, id: string, data: {
    name?: string;
    students?: string[];
    polyline?: string;
    driver?: string | null;
    estimatedDuration?: number | null;
  }) {
    const route = await Route.findOne({ _id: id, school: schoolId });
    if (!route) {
      throw new AppError(404, 'ROUTE_NOT_FOUND');
    }

    const { name, students, polyline, driver, estimatedDuration } = data;
    if (name !== undefined) route.name = name;
    if (students !== undefined) route.students = students as any;
    if (polyline !== undefined) route.polyline = polyline;
    if (driver !== undefined) route.driver = driver as any;
    if (estimatedDuration !== undefined) route.estimatedDuration = estimatedDuration;

    await route.save();
    return route;
  }

  static async removeRoute(schoolId: string, id: string) {
    const route = await Route.findOne({ _id: id, school: schoolId });
    if (!route) {
      throw new AppError(404, 'ROUTE_NOT_FOUND');
    }

    route.isActive = false;
    await route.save();
    return route;
  }
}
