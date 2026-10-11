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
      'Awaiting Citizen Confirmation',
      'Closed',
      'Acknowledged' // legacy support
    ],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  updatedBy: { type: String, default: 'Civic Admin' }
}, { _id: false });

const DisputeSchema = new mongoose.Schema({
  reason: { type: String, required: true },
  photo: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
  citizenId: { type: String, default: null }
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
      'Awaiting Citizen Confirmation',
      'Closed',
      'Acknowledged'
    ],
    default: 'Reported'
  },
  // Community Impact / Upvotes ("Me Too")
  upvoteCount: { type: Number, default: 0 },
  upvotedByCitizens: [{ type: String }], // Array of citizenIds

  // Private reporter info (only accessible to officers)
  reporter: {
    name: { type: String, default: 'Anonymous Citizen' },
    contact: { type: String, default: '' },
    citizenId: { type: String, default: null }
  },
  citizenId: { type: String, default: null, index: true },
  dashboardVisible: { type: Boolean, default: false },
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

  // Completion Evidence by Worker / Officer (After-Repair Proof)
  completionEvidence: {
    notes: { type: String, default: '' },
    photos: [{ type: String }], // URLs of after-repair photos
    submittedAt: { type: Date, default: null },
    submittedBy: { type: String, default: null }
  },

  // Citizen Resolution Verification Loop & Abuse Protection
  citizenFeedback: {
    isConfirmed: { type: Boolean, default: false },
    confirmedAt: { type: Date, default: null },
    autoCloseDeadline: { type: Date, default: null }, // e.g. 5 days after resolution
    disputeCount: { type: Number, default: 0 }, // Capped at 2 reopens max
    disputes: [DisputeSchema]
  },

  // Reopened Tracking
  reopenedHistory: [{
    reopenedAt: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
    reopenedBy: { type: String, default: 'Civic Officer' },
    isCitizenDispute: { type: Boolean, default: false }
  }],

  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },
  duplicateReason: { type: String, default: null },
  statusHistory: [StatusHistorySchema],

  // Offline sync support
  clientId: { type: String, default: undefined },       // Client-generated UUID for idempotency (undefined avoids duplicate null keys in sparse index)
  serverReceivedAt: { type: Date, default: null },    // When server first received this report
  clientCreatedAt: { type: Date, default: null },     // Original creation time from client device

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Unique sparse index: allows null clientId (existing online reports) but prevents duplicate syncs
IssueSchema.index({ clientId: 1 }, { unique: true, sparse: true });

IssueSchema.pre('save', function () {
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
});

module.exports = mongoose.model('Issue', IssueSchema);

