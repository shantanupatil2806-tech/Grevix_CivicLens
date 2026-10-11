// backend/src/models/Issue.js
const mongoose = require('mongoose');

const StatusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      'Reported',
      'Under Review',
      'Accepted',
      'Rejected',
      'Assigned',
      'In Progress',
      'Pending Verification',
      'Resolved',
      'Acknowledged' // legacy support
    ],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  updatedBy: { type: String, default: 'Civic Admin' }
}, { _id: false });

const IssueSchema = new mongoose.Schema({
  ticketCode: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: [
      // 7 Primary Categories
      'Roads/Potholes',
      'Garbage/Waste',
      'Water Supply/Leakage',
      'Streetlights/Electricity',
      'Drainage',
      'Public Infrastructure',
      'Other',
      // Legacy compatibility
      'Roads',
      'Garbage',
      'Water',
      'Electricity'
    ],
    required: true
  },
  location: { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  imagePath: { type: String, default: null },
  photos: [{ type: String }],
  severityScore: { type: Number, default: 0 },
  priorityScore: { type: Number, default: 0 },
  severityFactors: [{ type: String }],
  categoryReasons: [{ type: String }],
  status: {
    type: String,
    enum: [
      'Reported',
      'Under Review',
      'Accepted',
      'Rejected',
      'Assigned',
      'In Progress',
      'Pending Verification',
      'Resolved',
      'Acknowledged'
    ],
    default: 'Reported'
  },
  // Private reporter info (only accessible to officers)
  reporter: {
    name: { type: String, default: 'Anonymous Citizen' },
    contact: { type: String, default: '' }
  },
  // Assignment & Officer Workflow
  assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedWorkerName: { type: String, default: null },
  assignedDepartment: { type: String, default: null },
  deadline: { type: Date, default: null },
  internalInstructions: { type: String, default: null },
  rejectionReason: { type: String, default: null },
  
  // Priority Override by Officer
  priorityOverride: {
    isOverridden: { type: Boolean, default: false },
    originalScore: { type: Number, default: null },
    overrideScore: { type: Number, default: null },
    reason: { type: String, default: null },
    overriddenBy: { type: String, default: null },
    overriddenAt: { type: Date, default: null }
  },

  // Completion Evidence by Worker
  completionEvidence: {
    notes: { type: String, default: '' },
    photos: [{ type: String }],
    submittedAt: { type: Date, default: null }
  },

  // Reopened Tracking
  reopenedHistory: [{
    reopenedAt: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
    reopenedBy: { type: String, default: 'Civic Officer' }
  }],

  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },
  duplicateReason: { type: String, default: null },
  statusHistory: [StatusHistorySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

IssueSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.isModified('status')) {
    if (!this.statusHistory) this.statusHistory = [];
    const lastEntry = this.statusHistory[this.statusHistory.length - 1];
    if (!lastEntry || lastEntry.status !== this.status) {
      this.statusHistory.push({
        status: this.status,
        timestamp: new Date(),
        note: `Status updated to ${this.status}`,
        updatedBy: 'Civic Admin'
      });
    }
  }
  next();
});

module.exports = mongoose.model('Issue', IssueSchema);

