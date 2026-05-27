import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBus extends Document {
  school: mongoose.Types.ObjectId;
  busId: string;
  capacity: number;
  route: mongoose.Types.ObjectId | null;
  driver: mongoose.Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const busSchema = new Schema<IBus>({
  school:   { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  busId:    { type: String, required: true, unique: true, uppercase: true }, // e.g., "BUS-001"
  capacity: { type: Number, required: true, min: 1, max: 100 },
  route:    { type: Schema.Types.ObjectId, ref: 'Route', default: null },
  driver:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Bus: Model<IBus> = mongoose.models.Bus || mongoose.model<IBus>('Bus', busSchema);
export default Bus;
