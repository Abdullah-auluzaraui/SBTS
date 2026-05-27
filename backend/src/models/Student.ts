import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILocationPoint {
  type: 'Point';
  coordinates: number[]; // [longitude, latitude]
}

export interface IStudent extends Document {
  name: string;
  studentId: string;
  school: mongoose.Types.ObjectId;
  location: ILocationPoint;
  nationalId: string; // Encrypted
  dob: Date;
  normalizedName: string;
  parentId?: mongoose.Types.ObjectId | null;
  previousParentId?: mongoose.Types.ObjectId | null;
  unlinkedAt?: Date | null;
  unlinkedBy?: mongoose.Types.ObjectId | null;
  nfcTagId?: string | null;
  assignedBus?: mongoose.Types.ObjectId | null;
  grade?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>({
  name:     { type: String, required: true },
  studentId: { type: String, required: true, unique: true }, // e.g., "S260000001"
  school:   { type: Schema.Types.ObjectId, ref: 'School', required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  nationalId: { type: String, required: true }, // Stored encrypted
  dob: { type: Date, required: true },
  normalizedName: { type: String, required: true }, // For fuzzy matching
  parentId: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true, default: null },
  previousParentId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  unlinkedAt:       { type: Date, default: null },
  unlinkedBy:       { type: Schema.Types.ObjectId, ref: 'User', default: null },
  nfcTagId: { type: String, unique: true, sparse: true },
  assignedBus: { type: Schema.Types.ObjectId, ref: 'Bus', default: null },
  grade: { type: String, default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Create a 2dsphere index to support fast geographic queries
studentSchema.index({ location: '2dsphere' });

export const Student: Model<IStudent> = mongoose.models.Student || mongoose.model<IStudent>('Student', studentSchema);
export default Student;
