// Pure TypeScript contract — zero backend/Mongoose dependencies.
// All database IDs are typed as standard primitive strings for browser compatibility.
export interface IBaseBus {
  id: string;       // string, not Types.ObjectId
  schoolId: string; // string, not Types.ObjectId
  busId: string;
  capacity: number;
  isActive: boolean;
}
