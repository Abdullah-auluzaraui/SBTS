import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWaypoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface IRoute extends Document {
  school: mongoose.Types.ObjectId;
  name: string;
  waypoints: IWaypoint[];
  students: mongoose.Types.ObjectId[];
  polyline: string;
  driver: mongoose.Types.ObjectId | null;
  estimatedDuration?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const routeSchema = new Schema<IRoute>({
  school:            { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name:              { type: String, required: true },
  waypoints:         [{
    lat:   { type: Number, required: true },
    lng:   { type: Number, required: true },
    label: { type: String }
  }],
  // Array of students picked up on this route
  students:          [{ type: Schema.Types.ObjectId, ref: 'Student' }],
  // Encoded street path returned by OSRM API
  polyline:          { type: String, default: '' },
  driver:            { type: Schema.Types.ObjectId, ref: 'User', default: null },
  estimatedDuration: { type: Number }, // minutes
  isActive:          { type: Boolean, default: true }
}, { timestamps: true });

export const Route: Model<IRoute> = mongoose.models.Route || mongoose.model<IRoute>('Route', routeSchema);
export default Route;
