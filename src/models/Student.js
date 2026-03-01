const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  studentId: { type: String, required: true, unique: true },
  grade: { type: String },
  nfcTagId: { type: String, unique: true, sparse: true },
  assignedBus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
  parents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);