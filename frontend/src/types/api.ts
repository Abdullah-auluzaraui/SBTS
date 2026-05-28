import { AttendanceEvent, TripType } from '../../../shared/types/attendance';
import { GPSCoordinate } from '../../../shared/types/gps';

export interface IEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface IApiDriver {
  _id: string;
  name: string;
  username: string;
  phone?: string;
  isActive: boolean;
}

export interface IApiStudent {
  id: string;
  _id?: string;
  name: string;
  studentId: string;
  school: string;
  nationalId: string;
  dob: string;
  parentLinked: boolean;
  parentName?: string;
  parentId?: string | null;
  previousParentId?: string | null;
  previousParentName?: string | null;
  assignedBus?: string | null;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  } | null;
  isActive: boolean;
}

export interface IApiSchool {
  _id: string;
  schoolId: string;
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  emergencyContacts?: IEmergencyContact[];
  isActive: boolean;
}

export interface IApiRoute {
  _id: string;
  routeId: string;
  name: string;
  startLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  endLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  waypoints: Array<{
    type: 'Point';
    coordinates: [number, number];
    _id: string;
  }>;
  pathCoordinates?: GPSCoordinate[];
  isActive: boolean;
}

export interface IApiBus {
  _id: string;
  busId: string;
  capacity: number;
  route: IApiRoute | null;
  driver: IApiDriver | null;
  isActive: boolean;
}

export interface IAttendanceRecord {
  _id: string;
  school: string | IApiSchool;
  student: IApiStudent | null;
  bus: IApiBus | null;
  driver: IApiDriver | null;
  event: AttendanceEvent;
  tripType: TripType | null;
  timestamp: string;
  recordedBy: 'NFC' | 'manual';
}

export interface IPagination {
  total: number;
  page: number;
  pages: number;
}

// Wrapper structures
export interface BusListResponse {
  buses: IApiBus[];
}

export interface DriverListResponse {
  drivers: IApiDriver[];
}

export interface StudentListResponse {
  students: IApiStudent[];
}

export interface AttendanceListResponse {
  attendance: IAttendanceRecord[];
  pagination: IPagination;
}

export interface RouteListResponse {
  routes: IApiRoute[];
}
