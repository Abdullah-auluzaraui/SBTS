import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendance extends Document {
  school: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  bus: mongoose.Types.ObjectId;
  driver: mongoose.Types.ObjectId | null;
  trip: mongoose.Types.ObjectId | null;
  event: 'boarding' | 'exit' | 'absent' | 'arrived_home' | 'no_board' | 'no_receiver';
  tripType: 'to_school' | 'to_home' | null;
  timestamp: Date;
  recordedBy: 'NFC' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>({
  school:     { type: Schema.Types.ObjectId, ref: 'School', required: true },
  student:    { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  bus:        { type: Schema.Types.ObjectId, ref: 'Bus', required: true },
  driver:     { type: Schema.Types.ObjectId, ref: 'User', default: null },
  trip:       { type: Schema.Types.ObjectId, ref: 'Trip', default: null },
  event:      { type: String, enum: ['boarding', 'exit', 'absent', 'arrived_home', 'no_board', 'no_receiver'], required: true },
  tripType:   { type: String, enum: ['to_school', 'to_home'], default: null },
  timestamp:  { type: Date, default: Date.now },
  recordedBy: { type: String, enum: ['NFC', 'manual'], default: 'NFC' }
}, { timestamps: true });

attendanceSchema.index({ school: 1, timestamp: -1 });
attendanceSchema.index({ school: 1, bus: 1, timestamp: -1 });
attendanceSchema.index({ school: 1, bus: 1, tripType: 1, timestamp: -1 });
attendanceSchema.index({ school: 1, student: 1, timestamp: -1 });

export const Attendance: Model<IAttendance> = mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', attendanceSchema);
export default Attendance;
