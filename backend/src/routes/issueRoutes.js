// backend/src/routes/issueRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/issueController');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');

// Public / optional-auth routes
router.get('/', optionalAuth, ctrl.getIssues);
router.get('/analytics', authenticateToken, requireRole(['officer']), ctrl.getAnalytics);
router.get('/:id', optionalAuth, ctrl.getIssueById);

router.post('/', optionalAuth, ctrl.uploadMiddleware, ctrl.createIssue);
router.post('/analyze', ctrl.analyzeIssuePreview);

router.patch('/:id', authenticateToken, requireRole(['officer']), ctrl.updateIssue);
router.patch('/:id/status', optionalAuth, ctrl.updateStatus);

// Officer-only workflow actions
router.post('/:id/review', authenticateToken, requireRole(['officer']), ctrl.reviewIssue);
router.post('/:id/priority-override', authenticateToken, requireRole(['officer']), ctrl.overridePriority);
router.post('/:id/assign', authenticateToken, requireRole(['officer']), ctrl.assignWorker);
router.post('/:id/verify-resolve', authenticateToken, requireRole(['officer']), ctrl.verifyAndResolve);
router.post('/:id/reopen', authenticateToken, requireRole(['officer']), ctrl.reopenIssue);

// Worker (or officer) actions
router.post('/:id/worker-update', authenticateToken, requireRole(['worker', 'officer']), ctrl.uploadMiddleware, ctrl.workerUpdateTask);
router.post('/:id/worker-evidence', authenticateToken, requireRole(['worker', 'officer']), ctrl.uploadMiddleware, ctrl.uploadWorkerEvidence);

// Citizen closed-loop community actions
router.post('/:id/upvote', optionalAuth, ctrl.toggleUpvote);
router.post('/:id/verify-citizen', optionalAuth, ctrl.uploadMiddleware, ctrl.verifyCitizenFeedback);

module.exports = router;
