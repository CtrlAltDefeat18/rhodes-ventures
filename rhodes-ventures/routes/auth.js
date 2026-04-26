const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const Venture = require('../models/Venture');
const { protect } = require('../middleware/auth');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ─── POST /api/auth/register ──────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, studentNumber, password, isTestUser } = req.body;

    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: 'First name, last name, email and password are required.' });

    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });

    // Promote to admin if email matches ADMIN_EMAIL env var
    const role = email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase()
      ? 'admin'
      : 'student';

    const user = await User.create({
      firstName, lastName, email, studentNumber, password, role,
      isTestUser: isTestUser || false,
    });

    // Auto-create an empty venture draft for this user
    await Venture.create({ owner: user._id, isTestData: isTestUser || false });

    const token = signToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Incorrect email or password.' });

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────
// Returns current user + their venture draft status
router.get('/me', protect, async (req, res) => {
  try {
    const venture = await Venture.findOne({ owner: req.user._id });
    res.json({ user: req.user, venture });
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch profile.' });
  }
});

// ─── PATCH /api/auth/me ───────────────────────────────────────────
// Update basic user info (name, faculty, year)
router.patch('/me', protect, async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName', 'faculty', 'yearOfStudy', 'studentNumber'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Update failed.' });
  }
});

module.exports = router;