export type AttendanceEvent =
  | "boarding"
  | "exit"
  | "no_board"
  | "arrived_home"
  | "no_receiver"
  | "absent";

export type TripType = "to_school" | "to_home";
export type TripStatus = "active" | "completed";
