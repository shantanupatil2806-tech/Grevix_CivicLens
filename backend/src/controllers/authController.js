// backend/src/controllers/authController.js
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
        phone: user.phone
      }
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
 * List available workers for assignment (Officer only)
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

module.exports = {
  login,
  getCurrentUser,
  getWorkers,
  getDemoUsers
};
