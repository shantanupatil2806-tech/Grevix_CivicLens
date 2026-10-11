// backend/src/controllers/issueController.js
const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  analyzeCategory,
  normalizeCategory,
  computeSeverityDetails,
  detectDuplicatesWithReasons
} = require('../utils/analysis');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `issue-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

exports.uploadMiddleware = upload.single('photo');

function isOfficer(req) { return req.user && req.user.role === 'officer'; }
function isWorkerOrOfficer(req) { return req.user && (req.user.role === 'officer' || req.user.role === 'worker'); }

function sanitizeIssue(issue, req) {
  const obj = issue.toObject ? issue.toObject() : { ...issue };
  if (!isOfficer(req)) { delete obj.reporter; }
  // internalInstructions are visible to field workers and officers
  if (!isWorkerOrOfficer(req) && req.user) { delete obj.internalInstructions; }
  return obj;
}

function buildPhotoUrl(req, filename) {
  if (!filename) return null;
  const base = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/uploads/${filename}`;
}

exports.createIssue = async (req, res, next) => {
  try {
    const { title, description, category: rawCategory, location, latitude, longitude, severity, reporterName, reporterContact, clientId, clientCreatedAt, ticketCode, citizenId } = req.body;
    if (!title || !description || !location) return res.status(400).json({ error: 'title, description and location are required.' });

    // Idempotency: if clientId provided, check for existing issue
    if (clientId) {
      const existing = await Issue.findOne({ clientId });
      if (existing) {
        // Return the existing issue — prevents duplicates on retry
        return res.status(200).json(sanitizeIssue(existing, req));
      }
    }

    const category = normalizeCategory(rawCategory || 'Other');
    const issueData = {
      title: title.trim(), description: description.trim(), category,
      location: location.trim(), severity: severity || 'Medium', status: 'Reported',
      dashboardVisible: true,
      reporter: { name: reporterName ? reporterName.trim() : 'Anonymous', contact: reporterContact ? reporterContact.trim() : '' }
    };

    if (citizenId && citizenId.trim()) {
      issueData.citizenId = citizenId.trim();
      issueData.reporter.citizenId = citizenId.trim();
    }

    // Offline sync metadata
    if (clientId) issueData.clientId = clientId;
    issueData.serverReceivedAt = new Date();
    if (clientCreatedAt) issueData.clientCreatedAt = new Date(clientCreatedAt);
    if (ticketCode && ticketCode.trim()) issueData.ticketCode = ticketCode.trim();

    const lat = parseFloat(latitude); const lon = parseFloat(longitude);
    if (!isNaN(lat) && !isNaN(lon)) { issueData.coordinates = { lat, lng: lon }; }
    if (req.file) {
      const fullUrl = buildPhotoUrl(req, req.file.filename);
      issueData.photo = req.file.filename;
      issueData.photoUrl = fullUrl;
      issueData.imagePath = fullUrl;
      issueData.photos = [fullUrl];
    }
    const { score, label, factors } = computeSeverityDetails(issueData);
    issueData.priorityScore = score; issueData.severity = label; issueData.analysisFactors = factors;
    const issue = new Issue(issueData);
    issue.statusHistory.push({ status: 'Reported', note: 'Issue submitted by citizen' });

    try {
      await issue.save();
    } catch (saveErr) {
      // Handle race condition: duplicate clientId from concurrent requests
      if (saveErr.code === 11000 && clientId) {
        const existing = await Issue.findOne({ clientId });
        if (existing) return res.status(200).json(sanitizeIssue(existing, req));
      }
      throw saveErr;
    }

    res.status(201).json(sanitizeIssue(issue, req));
  } catch (err) { next(err); }
};

async function evaluateAutoClose(issueDoc) {
  if (issueDoc && issueDoc.status === 'Awaiting Citizen Confirmation') {
    const deadline = issueDoc.citizenFeedback?.autoCloseDeadline;
    if (deadline && new Date() > new Date(deadline)) {
      issueDoc.status = 'Closed';
      issueDoc.citizenFeedback.isConfirmed = true;
      issueDoc.statusHistory.push({
        status: 'Closed',
        note: 'Ticket auto-closed after 5-day citizen verification window without dispute.',
        changedBy: 'System Automation'
      });
      await issueDoc.save();
    }
  }
}

exports.getIssues = async (req, res, next) => {
  try {
    const { category, severity, status, search, citizenId, publicOnly, dashboardOnly, limit = 200 } = req.query;
    const filter = {};
    if (dashboardOnly === 'true') filter.dashboardVisible = true;
    if (citizenId) filter.citizenId = citizenId.trim();
    if (category) filter.category = normalizeCategory(category);
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    // Public community map / feed: hide Rejected and unreviewed drafts
    if (publicOnly === 'true') {
      filter.status = { '$nin': ['Rejected'] };
    }

    if (search) filter['$or'] = [
      { title: { '$regex': search, '$options': 'i' } },
      { description: { '$regex': search, '$options': 'i' } },
      { location: { '$regex': search, '$options': 'i' } },
      { ticketCode: { '$regex': search, '$options': 'i' } }
    ];

    // Lazy auto-close check on expired issues
    const now = new Date();
    await Issue.updateMany(
      {
        status: 'Awaiting Citizen Confirmation',
        'citizenFeedback.autoCloseDeadline': { '$lte': now }
      },
      {
        '$set': { status: 'Closed', 'citizenFeedback.isConfirmed': true },
        '$push': {
          statusHistory: {
            status: 'Closed',
            timestamp: now,
            note: 'Ticket auto-closed after 5-day citizen verification window without dispute.',
            updatedBy: 'System Automation'
          }
        }
      }
    );

    const issues = await Issue.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit)).lean();
    const sanitized = issues.map(issue => {
      if (!isOfficer(req)) { delete issue.reporter; delete issue.internalInstructions; }
      return issue;
    });
    res.json({ issues: sanitized, isDatabase: true });
  } catch (err) { next(err); }
};

exports.getIssueById = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id).populate('assignedWorker', 'name email department');
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });
    await evaluateAutoClose(issue);
    res.json(sanitizeIssue(issue, req));
  } catch (err) { next(err); }
};

exports.updateIssue = async (req, res, next) => {
  try {
    const allowed = ['title', 'description', 'category', 'location', 'severity', 'latitude', 'longitude'];
    const updates = {};
    for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
    if (updates.category) updates.category = normalizeCategory(updates.category);
    if (updates.title || updates.description || updates.category) {
      const existing = await Issue.findById(req.params.id).lean();
      const merged = { ...existing, ...updates };
      const { score, label, factors } = computeSeverityDetails(merged);
      updates.priorityScore = score; updates.severity = label; updates.analysisFactors = factors;
    }
    const issue = await Issue.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });
    res.json(sanitizeIssue(issue, req));
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const validStatuses = [
      'Reported','Under Review','Accepted','Rejected','Assigned',
      'In Progress','Pending Verification','Resolved','Acknowledged',
      'Awaiting Citizen Confirmation','Closed'
    ];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status value.' });
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    if (status === 'Resolved' || status === 'Awaiting Citizen Confirmation') {
      issue.status = 'Awaiting Citizen Confirmation';
      issue.resolvedAt = new Date();
      if (!issue.citizenFeedback) {
        issue.citizenFeedback = { isConfirmed: false, disputeCount: 0, disputes: [] };
      }
      issue.citizenFeedback.autoCloseDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      issue.statusHistory.push({
        status: 'Awaiting Citizen Confirmation',
        note: note || 'Marked resolved by officer. Awaiting citizen confirmation (5-day window).',
        changedBy: req.user ? req.user.name : 'Officer'
      });
    } else {
      issue.status = status;
      issue.statusHistory.push({ status, note: note || '', changedBy: req.user ? req.user.name : 'System' });
    }

    await issue.save();
    res.json(sanitizeIssue(issue, req));
  } catch (err) { next(err); }
};

exports.analyzeIssuePreview = async (req, res, next) => {
  try {
    const { title, description, category: rawCategory } = req.body;
    if (!title && !description) return res.status(400).json({ error: 'title or description is required for analysis.' });
    const catAnalysis = analyzeCategory(title, description);
    const category = rawCategory ? normalizeCategory(rawCategory) : catAnalysis.category;
    const { score, label, factors } = computeSeverityDetails({ title, description, category });
    const allIssues = await Issue.find({ status: { '$nin': ['Resolved', 'Rejected'] } }).select('title description category location').lean();
    const dupResult = detectDuplicatesWithReasons({ title, description, category }, allIssues);
    res.json({
      suggestedCategory: catAnalysis.category, categoryConfidence: catAnalysis.confidence, categoryReasons: catAnalysis.reasons,
      priorityScore: score, priorityLabel: label, priorityFactors: factors,
      potentialDuplicate: dupResult ? { id: dupResult.duplicate._id, title: dupResult.duplicate.title, location: dupResult.duplicate.location, category: dupResult.duplicate.category, reason: dupResult.reason, similarity: dupResult.similarity } : null
    });
  } catch (err) { next(err); }
};

exports.reviewIssue = async (req, res, next) => {
  try {
    const { decision, rejectionReason } = req.body;
    if (!['accept','reject'].includes(decision)) return res.status(400).json({ error: "decision must be 'accept' or 'reject'." });
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });
    if (decision === 'accept') {
      issue.status = 'Accepted';
      issue.statusHistory.push({ status: 'Accepted', note: 'Reviewed and accepted by officer', changedBy: req.user.name });
    } else {
      if (!rejectionReason) return res.status(400).json({ error: 'rejectionReason is required when rejecting.' });
      issue.status = 'Rejected'; issue.rejectionReason = rejectionReason;
      issue.statusHistory.push({ status: 'Rejected', note: `Rejected: ${rejectionReason}`, changedBy: req.user.name });
    }
    await issue.save(); res.json(sanitizeIssue(issue, req));
  } catch (err) { next(err); }
};

exports.overridePriority = async (req, res, next) => {
  try {
    const { overrideScore, reason } = req.body;
    const score = parseInt(overrideScore);
    if (isNaN(score) || score < 1 || score > 100) return res.status(400).json({ error: 'overrideScore must be 1-100.' });
    if (!reason) return res.status(400).json({ error: 'reason is required.' });
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });
    issue.priorityOverride = { isOverridden: true, originalScore: issue.priorityScore, overrideScore: score, reason, overriddenBy: req.user.name, overriddenAt: new Date() };
    issue.priorityScore = score;
    if (score >= 80) issue.severity = 'Critical';
    else if (score >= 60) issue.severity = 'High';
    else if (score >= 40) issue.severity = 'Medium';
    else issue.severity = 'Low';
    issue.statusHistory.push({ status: issue.status, note: `Priority overridden to ${score}/100 - ${reason}`, changedBy: req.user.name });
    await issue.save(); res.json(sanitizeIssue(issue, req));
  } catch (err) { next(err); }
};

exports.assignWorker = async (req, res, next) => {
  try {
    const { workerId, workerName, department, deadline, internalInstructions } = req.body;
    if (!workerName) return res.status(400).json({ error: 'workerName is required.' });
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });
    if (workerId && mongoose.Types.ObjectId.isValid(workerId)) issue.assignedWorker = workerId;
    issue.assignedWorkerName = workerName; issue.assignedDepartment = department || '';
    if (deadline) issue.deadline = new Date(deadline);
    if (internalInstructions) issue.internalInstructions = internalInstructions;
    issue.status = 'Assigned';
    issue.statusHistory.push({ status: 'Assigned', note: `Assigned to ${workerName}${department ? ` (${department})` : ''}`, changedBy: req.user.name });
    await issue.save(); res.json(sanitizeIssue(issue, req));
  } catch (err) { next(err); }
};

exports.toggleUpvote = async (req, res, next) => {
  try {
    const { citizenId } = req.body;
    if (!citizenId || !citizenId.trim()) {
      return res.status(400).json({ error: 'citizenId is required to endorse an issue.' });
    }
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    if (!issue.upvotedByCitizens) issue.upvotedByCitizens = [];
    const cleanId = citizenId.trim();
    const existingIdx = issue.upvotedByCitizens.indexOf(cleanId);

    let action = 'added';
    if (existingIdx !== -1) {
      issue.upvotedByCitizens.splice(existingIdx, 1);
      action = 'removed';
    } else {
      issue.upvotedByCitizens.push(cleanId);
    }
    issue.upvoteCount = issue.upvotedByCitizens.length;

    // Recalculate priority score factoring in community upvotes (capped at +15)
    const { score, label, factors } = computeSeverityDetails(issue);
    issue.priorityScore = score;
    issue.severity = label;
    issue.severityFactors = factors;

    await issue.save();
    const sanitized = sanitizeIssue(issue, req);
    res.json({
      ...sanitized,
      hasUpvoted: action === 'added',
      upvoteAction: action
    });
  } catch (err) { next(err); }
};

exports.uploadWorkerEvidence = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    const actorName = req.user ? req.user.name : 'Maintenance Crew';
    const notes = req.body.notes || req.body.progressNote || '';

    if (!issue.completionEvidence) {
      issue.completionEvidence = { notes: '', photos: [], submittedAt: new Date() };
    }
    if (notes) issue.completionEvidence.notes = notes;
    issue.completionEvidence.submittedAt = new Date();
    issue.completionEvidence.submittedBy = actorName;

    if (req.file) {
      const fullUrl = buildPhotoUrl(req, req.file.filename);
      if (!issue.completionEvidence.photos) issue.completionEvidence.photos = [];
      issue.completionEvidence.photos.push(fullUrl);
    }

    await issue.save();
    res.json(sanitizeIssue(issue, req));
  } catch (err) { next(err); }
};

exports.workerUpdateTask = async (req, res, next) => {
  try {
    const { progressNote, markComplete, evidencePhotos } = req.body;
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });
    const actorName = req.user ? req.user.name : 'Worker';

    const photosList = Array.isArray(evidencePhotos) ? evidencePhotos : [];
    if (req.file) {
      photosList.push(buildPhotoUrl(req, req.file.filename));
    }

    if (markComplete) {
      issue.status = 'Pending Verification';
      issue.completionEvidence = {
        notes: progressNote || 'Work completed',
        photos: photosList,
        submittedAt: new Date(),
        submittedBy: actorName
      };
      issue.statusHistory.push({ status: 'Pending Verification', note: `Work completed by ${actorName}. Awaiting officer verification.`, changedBy: actorName });
    } else {
      issue.status = 'In Progress';
      if (progressNote) {
        if (!issue.completionEvidence) issue.completionEvidence = { notes: '', photos: [] };
        issue.completionEvidence.notes = progressNote;
      }
      issue.statusHistory.push({ status: 'In Progress', note: progressNote || 'Work in progress', changedBy: actorName });
    }
    await issue.save(); res.json(sanitizeIssue(issue, req));
  } catch (err) { next(err); }
};

exports.verifyAndResolve = async (req, res, next) => {
  try {
    const { approved, returnReason } = req.body;
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });
    if (approved) {
      // Step into "Awaiting Citizen Confirmation" with 5-day auto-close countdown
      issue.status = 'Awaiting Citizen Confirmation';
      issue.resolvedAt = new Date();
      if (!issue.citizenFeedback) {
        issue.citizenFeedback = { isConfirmed: false, disputeCount: 0, disputes: [] };
      }
      issue.citizenFeedback.autoCloseDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      issue.statusHistory.push({
        status: 'Awaiting Citizen Confirmation',
        note: 'Work approved by officer. Awaiting citizen confirmation (5-day window).',
        changedBy: req.user.name
      });
    } else {
      issue.status = 'In Progress';
      issue.statusHistory.push({ status: 'In Progress', note: `Returned for rework: ${returnReason || 'Officer requested additional work'}`, changedBy: req.user.name });
    }
    await issue.save(); res.json(sanitizeIssue(issue, req));
  } catch (err) { next(err); }
};

exports.verifyCitizenFeedback = async (req, res, next) => {
  try {
    const { decision, citizenId, ticketCode, reason } = req.body;
    if (!decision || !['confirm', 'dispute'].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'confirm' or 'dispute'." });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    // Security check: Only the original citizen reporter can confirm or dispute
    const callerId = (citizenId || '').trim();
    const callerTicket = (ticketCode || '').trim();
    const isOriginalReporter = (
      (callerId && (issue.citizenId === callerId || issue.reporter?.citizenId === callerId)) ||
      (callerTicket && issue.ticketCode && issue.ticketCode.toLowerCase() === callerTicket.toLowerCase())
    );

    if (!isOriginalReporter) {
      return res.status(403).json({
        error: 'Security verification failed: Only the original reporter can confirm resolution or dispute this ticket.'
      });
    }

    if (!issue.citizenFeedback) {
      issue.citizenFeedback = { isConfirmed: false, disputeCount: 0, disputes: [] };
    }

    if (decision === 'confirm') {
      issue.status = 'Closed';
      issue.citizenFeedback.isConfirmed = true;
      issue.citizenFeedback.confirmedAt = new Date();
      issue.statusHistory.push({
        status: 'Closed',
        note: 'Resolution verified and accepted by citizen. Ticket permanently closed.',
        changedBy: issue.reporter?.name || 'Citizen Reporter'
      });
      await issue.save();
      return res.json(sanitizeIssue(issue, req));
    }

    if (decision === 'dispute') {
      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'Please provide a reason explaining why the issue is not fixed.' });
      }

      // Anti-abuse: Capped at maximum 2 disputes per ticket
      const currentDisputes = issue.citizenFeedback.disputeCount || 0;
      if (currentDisputes >= 2) {
        return res.status(400).json({
          error: 'Maximum dispute limit (2) reached for this ticket. Please contact municipal headquarters directly.'
        });
      }

      let disputePhotoUrl = null;
      if (req.file) {
        disputePhotoUrl = buildPhotoUrl(req, req.file.filename);
      }

      issue.citizenFeedback.disputeCount = currentDisputes + 1;
      issue.citizenFeedback.disputes.push({
        reason: reason.trim(),
        photo: disputePhotoUrl,
        timestamp: new Date(),
        citizenId: callerId
      });

      issue.status = 'In Progress';
      issue.reopenedHistory.push({
        reopenedAt: new Date(),
        reason: `Citizen dispute: ${reason.trim()}`,
        reopenedBy: issue.reporter?.name || 'Citizen Reporter',
        isCitizenDispute: true
      });

      issue.statusHistory.push({
        status: 'In Progress',
        note: `Resolution disputed by citizen (${issue.citizenFeedback.disputeCount}/2): ${reason.trim()}`,
        changedBy: 'Citizen Dispute'
      });

      await issue.save();
      return res.json(sanitizeIssue(issue, req));
    }
  } catch (err) { next(err); }
};

exports.reopenIssue = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'reason is required to reopen an issue.' });
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });
    issue.reopenedHistory.push({ reopenedAt: new Date(), reason, reopenedBy: req.user.name, isCitizenDispute: false });
    issue.status = 'Under Review';
    issue.statusHistory.push({ status: 'Under Review', note: `Reopened: ${reason}`, changedBy: req.user.name });
    await issue.save(); res.json(sanitizeIssue(issue, req));
  } catch (err) { next(err); }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const [total, resolved, inProgress, critical, byCategory, byStatus, avgResolutionMs, todayCount, pendingVerification] = await Promise.all([
      Issue.countDocuments(),
      Issue.countDocuments({ status: 'Resolved' }),
      Issue.countDocuments({ status: { '$in': ['Assigned', 'In Progress'] } }),
      Issue.countDocuments({ severity: 'Critical' }),
      Issue.aggregate([{ '$group': { _id: '$category', count: { '$sum': 1 } } }]),
      Issue.aggregate([{ '$group': { _id: '$status', count: { '$sum': 1 } } }]),
      Issue.aggregate([{ '$match': { status: 'Resolved', resolvedAt: { '$exists': true } } }, { '$group': { _id: null, avg: { '$avg': { '$subtract': ['$resolvedAt', '$createdAt'] } } } }]),
      Issue.countDocuments({ createdAt: { '$gte': new Date(new Date().setHours(0,0,0,0)) } }),
      Issue.countDocuments({ status: 'Pending Verification' })
    ]);
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const avgResolutionDays = avgResolutionMs.length > 0 ? Math.round(avgResolutionMs[0].avg / (1000 * 60 * 60 * 24)) : null;
    res.json({ total, resolved, inProgress, critical, pendingVerification, resolutionRate, avgResolutionDays, todayCount,
      byCategory: byCategory.reduce((acc, item) => { acc[item._id || 'Unknown'] = item.count; return acc; }, {}),
      byStatus: byStatus.reduce((acc, item) => { acc[item._id || 'Unknown'] = item.count; return acc; }, {})
    });
  } catch (err) { next(err); }
};
