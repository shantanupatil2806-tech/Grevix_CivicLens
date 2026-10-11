// backend/src/routes/authRoutes.js
const express = require('express');
const {
  login,
  changePassword,
  forgotPassword,
  getCurrentUser,
  getWorkers,
  getDemoUsers,
  adminListUsers,
  adminCreateUser,
  adminUpdateUser
} = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// General Staff Auth
router.post('/login', login);
router.post('/change-password', authenticateToken, changePassword);
router.post('/forgot-password', forgotPassword);
router.get('/me', authenticateToken, getCurrentUser);
router.get('/demo-users', getDemoUsers);
router.get('/workers', authenticateToken, requireRole(['officer', 'admin']), getWorkers);

// Admin User Management
router.get('/admin/users', authenticateToken, requireRole(['admin']), adminListUsers);
router.post('/admin/users', authenticateToken, requireRole(['admin']), adminCreateUser);
router.patch('/admin/users/:id', authenticateToken, requireRole(['admin']), adminUpdateUser);

module.exports = router;
