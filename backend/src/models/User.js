// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'officer', 'worker'], required: true, default: 'citizen' },
  department: { type: String, default: 'General' },
  phone: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

UserSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

const User = mongoose.model('User', UserSchema);

async function seedDefaultUsers() {
  try {
    const count = await User.countDocuments();
    if (count > 0) return;

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
    console.log('✅ Default users seeded successfully');
  } catch (err) {
    console.error('Error seeding default users:', err.message);
  }
}

module.exports = { User, seedDefaultUsers };
