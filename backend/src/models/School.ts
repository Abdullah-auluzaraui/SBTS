import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmergencyContact {
  name: string;
  phone: string;
}

export interface ISchool extends Document {
  name: string;
  schoolId: string;
  contact?: {
    phone?: string;
    email?: string;
  };
  location?: {
    type: 'Point';
    coordinates: number[]; // [lng, lat]
  };
  emergencyContacts: IEmergencyContact[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyContactSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true }
});

const schoolSchema = new Schema<ISchool>({
  name:     { type: String, required: true, trim: true },
  schoolId: { type: String, required: true, unique: true, uppercase: true }, // e.g., "SCH-0001"
  contact:  {
    phone: { type: String },
    email: { type: String, lowercase: true }
  },
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  emergencyContacts: [emergencyContactSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

schoolSchema.index({ location: '2dsphere' });

export const School: Model<ISchool> = mongoose.models.School || mongoose.model<ISchool>('School', schoolSchema);
export default School;
