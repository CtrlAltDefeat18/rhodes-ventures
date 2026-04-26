const router  = require('express').Router();
const User    = require('../models/User');
const Venture = require('../models/Venture');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require a valid JWT AND role === 'admin'
router.use(protect, adminOnly);

// ─── GET /api/admin/users ─────────────────────────────────────────
// List every registered user with their venture summary
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const ventures = await Venture.find();
    const ventureMap = {};
    ventures.forEach(v => { ventureMap[v.owner.toString()] = v; });

    const data = users.map(u => ({
      user: u,
      venture: ventureMap[u._id.toString()] || null,
    }));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch users.' });
  }
});

// ─── POST /api/admin/prefill/:userId ─────────────────────────────
// Admin pre-fills a venture for a registered student.
// The student will see a "please review and complete" banner.
router.post('/prefill/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Merge prefill data into venture — don't overwrite fields already
    // entered by the student (only update empty/default fields)
    const venture = await Venture.findOne({ owner: user._id });
    if (!venture) return res.status(404).json({ message: 'Venture record not found.' });

    const fillable = [
      'name','sector','tagline','tags','problem','solution',
      'stage','stageDescription','evidence','bmc','teamMembers',
      'pitchDeckUrl','websiteUrl'
    ];
    fillable.forEach(field => {
      if (req.body[field] !== undefined) {
        // Only overwrite if field is empty / default
        const current = venture[field];
        const isEmpty =
          current === '' ||
          current === null ||
          (Array.isArray(current) && current.length === 0) ||
          (typeof current === 'object' && !Array.isArray(current) &&
           Object.values(current).every(v => v === ''));
        if (isEmpty) venture[field] = req.body[field];
      }
    });

    venture.prefilled = true;
    venture.lastStep   = req.body.lastStep || 5; // let student start at review
    await venture.save();

    res.json({ venture, message: `Venture pre-filled for ${user.firstName} ${user.lastName}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Pre-fill failed.' });
  }
});

// ─── DELETE /api/admin/test-data ─────────────────────────────────
// Wipes ALL users and ventures flagged as test data.
// Safe to run between test sessions.
router.delete('/test-data', async (req, res) => {
  try {
    const testUsers = await User.find({ isTestUser: true });
    const testUserIds = testUsers.map(u => u._id);

    const usersDeleted    = (await User.deleteMany({ isTestUser: true })).deletedCount;
    const venturesDeleted = (await Venture.deleteMany({
      $or: [{ isTestData: true }, { owner: { $in: testUserIds } }]
    })).deletedCount;

    res.json({
      message: `Cleared ${usersDeleted} test users and ${venturesDeleted} test ventures.`,
      usersDeleted, venturesDeleted,
    });
  } catch (err) {
    res.status(500).json({ message: 'Clear failed.' });
  }
});

// ─── PATCH /api/admin/venture/:ventureId ─────────────────────────
// Direct admin edit of any venture field
router.patch('/venture/:ventureId', async (req, res) => {
  try {
    const venture = await Venture.findByIdAndUpdate(
      req.params.ventureId,
      req.body,
      { new: true, runValidators: true }
    );
    if (!venture) return res.status(404).json({ message: 'Venture not found.' });
    res.json({ venture });
  } catch (err) {
    res.status(500).json({ message: 'Update failed.' });
  }
});

// ─── POST /api/admin/venture/:ventureId/publish ───────────────────
router.post('/venture/:ventureId/publish', async (req, res) => {
  try {
    const venture = await Venture.findByIdAndUpdate(
      req.params.ventureId,
      { status: req.body.status || 'published' },
      { new: true }
    );
    res.json({ venture });
  } catch (err) {
    res.status(500).json({ message: 'Status update failed.' });
  }
});

// ─── GET /api/admin/stage-meta ────────────────────────────────────
router.get('/stage-meta', (req, res) => {
  res.json({ stageMeta: Venture.STAGE_META, stages: Venture.JOURNEY_STAGES });
});

module.exports = router;