import { GPSCoordinate } from "./gps";
import { AttendanceEvent, TripType, TripStatus } from "./attendance";

export interface ServerToClientEvents {
  "bus:location": (data: {
    busId: string;
    lat: number;
    lng: number;
  }) => void;

  "student:status": (data: {
    busId: string;
    studentId: string;
    event: AttendanceEvent;
    tripType: TripType;
  }) => void;

  "trip:status": (data: {
    tripId: string;
    status: TripStatus;
    tripType: TripType;
  }) => void;
}

export interface ClientToServerEvents {
  "driver:location_update": (data: GPSCoordinate & { tripId: string }) => void;
  "driver:set_target": (data: { studentId: string; tripId: string }) => void;
}
