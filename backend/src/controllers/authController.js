// backend/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const { User } = require('../models/User');
const { generateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact Municipal Administrator.' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        mustChangePassword: user.mustChangePassword || false
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/change-password
 * Headers: Authorization: Bearer <token>
 * Body: { currentPassword, newPassword }
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentPassword) {
      const valid = await user.comparePassword(currentPassword);
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't disclose account existence for security
      return res.json({ message: 'If an account exists with this email, password reset instructions have been dispatched.' });
    }

    // In a production app, send reset link with temporary token.
    // For demo/municipal staging, provide a clear response:
    return res.json({
      message: 'Password reset request submitted. A Municipal Administrator can also reset your credentials from the Admin Console.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */
async function getCurrentUser(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/workers
 * List available workers for assignment (Officer or Admin)
 */
async function getWorkers(req, res, next) {
  try {
    const workers = await User.find({ role: 'worker', active: true })
      .select('_id name email department phone')
      .lean();
    return res.json({ workers });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/demo-users
 * Returns list of demo profiles for one-click testing
 */
async function getDemoUsers(req, res, next) {
  try {
    const users = await User.find({ active: true })
      .select('_id name email role department phone')
      .lean();
    return res.json({ users });
  } catch (err) {
    next(err);
  }
}

/**
 * --- ADMIN USER MANAGEMENT ENDPOINTS ---
 */

/**
 * GET /api/auth/admin/users
 * Returns all staff & users (Admin only)
 */
async function adminListUsers(req, res, next) {
  try {
    const users = await User.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ users });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/admin/users
 * Create a new staff account (Officer or Worker) (Admin only)
 * Body: { name, email, password, role, department, phone }
 */
async function adminCreateUser(req, res, next) {
  try {
    const { name, email, password, role, department, phone } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, initial password, and role are required' });
    }

    if (!['officer', 'worker', 'admin', 'citizen'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email address already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      department: department ? department.trim() : (role === 'worker' ? 'Roads & Infrastructure' : 'Municipal Operations'),
      phone: phone ? phone.trim() : '',
      mustChangePassword: true, // enforce password change on first staff login
      active: true
    });

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        phone: newUser.phone,
        active: newUser.active
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/auth/admin/users/:id
 * Update staff user details, department, or activate/deactivate (Admin only)
 */
async function adminUpdateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, department, phone, active, role, newPassword } = req.body;
    const resetPassword = typeof newPassword === 'string' ? newPassword.trim() : '';

    if (resetPassword && resetPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name !== undefined) user.name = name.trim();
    if (department !== undefined) user.department = department.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (active !== undefined) user.active = Boolean(active);
    if (role !== undefined && ['officer', 'worker', 'admin'].includes(role)) user.role = role;
    if (resetPassword) {
      user.passwordHash = await bcrypt.hash(resetPassword, 10);
      user.mustChangePassword = true;
    }

    await user.save();
    return res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        active: user.active
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  changePassword,
  forgotPassword,
  getCurrentUser,
  getWorkers,
  getDemoUsers,
  adminListUsers,
  adminCreateUser,
  adminUpdateUser
};
