// backend/src/routes/authRoutes.js
const express = require('express');
const { login, getCurrentUser, getWorkers, getDemoUsers } = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticateToken, getCurrentUser);
router.get('/demo-users', getDemoUsers);
router.get('/workers', authenticateToken, requireRole(['officer']), getWorkers);

module.exports = router;
