// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'officer', 'worker', 'admin'], required: true, default: 'citizen' },
  department: { type: String, default: 'General' },
  phone: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  active: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

UserSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

const User = mongoose.model('User', UserSchema);

async function seedDefaultUsers() {
  try {
    // Only seed default users in development or testing environments
    if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_USERS !== 'true') {
      console.log('ℹ️ Production environment detected: default test-user seeding skipped.');
      return;
    }

    // Ensure Admin user always exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const adminHash = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Municipal Admin',
        email: 'admin@civiclens.gov',
        passwordHash: adminHash,
        role: 'admin',
        department: 'Civic Administration',
        phone: '+91 99999 00000',
        mustChangePassword: false
      });
      console.log('✅ Default Municipal Admin created (admin@civiclens.gov / admin123)');
    }

    const count = await User.countDocuments();
    if (count > 1) return;

    const defaultUsers = [
      {
        name: 'John Jones',
        email: 'officer@civiclens.gov',
        password: 'password123',
        role: 'officer',
        department: 'Municipal Operations',
        phone: '+91 98230 11223'
      },
      {
        name: 'Ramesh Kumar',
        email: 'worker.roads@civiclens.gov',
        password: 'password123',
        role: 'worker',
        department: 'Roads & Infrastructure',
        phone: '+91 98765 43210'
      },
      {
        name: 'Suresh Patel',
        email: 'worker.water@civiclens.gov',
        password: 'password123',
        role: 'worker',
        department: 'Water & Sewage',
        phone: '+91 98765 43211'
      },
      {
        name: 'Sunita Sharma',
        email: 'worker.sanitation@civiclens.gov',
        password: 'password123',
        role: 'worker',
        department: 'Solid Waste & Sanitation',
        phone: '+91 98765 43212'
      },
      {
        name: 'Priya Sharma',
        email: 'citizen@civiclens.gov',
        password: 'password123',
        role: 'citizen',
        department: 'Citizen Resident',
        phone: '+91 91234 56789'
      }
    ];

    for (const u of defaultUsers) {
      const existing = await User.findOne({ email: u.email });
      if (!existing) {
        const passwordHash = await bcrypt.hash(u.password, 10);
        await User.create({
          name: u.name,
          email: u.email,
          passwordHash,
          role: u.role,
          department: u.department,
          phone: u.phone
        });
      }
    }
    console.log('✅ Default users seeded successfully');
  } catch (err) {
    console.error('Error seeding default users:', err.message);
  }
}

module.exports = { User, seedDefaultUsers };
