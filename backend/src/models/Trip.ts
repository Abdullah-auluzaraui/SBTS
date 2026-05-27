import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITripRoutePath {
  lat: number;
  lng: number;
}

export interface ITripTarget {
  studentId: mongoose.Types.ObjectId | null;
  setBy: 'auto' | 'driver';
  setAt: Date | null;
}

export interface ITripLocation {
  lat: number | null;
  lng: number | null;
  updatedAt: Date | null;
}

export interface ITrip extends Document {
  school: mongoose.Types.ObjectId;
  bus: mongoose.Types.ObjectId;
  driver: mongoose.Types.ObjectId;
  tripType: 'to_school' | 'to_home' | null;
  status: 'active' | 'completed';
  routePath: ITripRoutePath[];
  currentTarget: ITripTarget;
  lastLocation: ITripLocation;
  prevLocation: ITripLocation;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const tripSchema = new Schema<ITrip>({
  school:    { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  bus:       { type: Schema.Types.ObjectId, ref: 'Bus', required: true },
  driver:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tripType:  { type: String, enum: ['to_school', 'to_home'], default: null },
  status:    { type: String, enum: ['active', 'completed'], default: 'active' },
  routePath: [{ lat: Number, lng: Number }],
  currentTarget: {
    studentId:   { type: Schema.Types.ObjectId, ref: 'Student', default: null },
    setBy:       { type: String, enum: ['auto', 'driver'], default: 'auto' },
    setAt:       { type: Date, default: null }
  },
  lastLocation: {
    lat:       { type: Number, default: null },
    lng:       { type: Number, default: null },
    updatedAt: { type: Date, default: null }
  },
  prevLocation: {
    lat:       { type: Number, default: null },
    lng:       { type: Number, default: null },
    updatedAt: { type: Date, default: null }
  },
  startedAt:   { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

tripSchema.index({ bus: 1, startedAt: -1 });

export const Trip: Model<ITrip> = mongoose.models.Trip || mongoose.model<ITrip>('Trip', tripSchema);
export default Trip;
