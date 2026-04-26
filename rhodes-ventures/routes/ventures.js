const router  = require('express').Router();
const Venture = require('../models/Venture');
const { protect } = require('../middleware/auth');

// ─── GET /api/ventures ────────────────────────────────────────────
// Public: returns only published ventures (visible on landing page)
router.get('/', async (req, res) => {
  try {
    const ventures = await Venture.find({ status: 'published', isTestData: false })
      .populate('owner', 'firstName lastName email')
      .sort({ updatedAt: -1 });
    res.json({ ventures, stageMeta: Venture.STAGE_META });
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch ventures.' });
  }
});

// ─── GET /api/ventures/mine ───────────────────────────────────────
// Protected: returns the current user's venture (any status/draft)
router.get('/mine', protect, async (req, res) => {
  try {
    let venture = await Venture.findOne({ owner: req.user._id });
    if (!venture) {
      venture = await Venture.create({ owner: req.user._id });
    }
    res.json({ venture, stageMeta: Venture.STAGE_META });
  } catch (err) {
    res.status(500).json({ message: 'Could not load your venture.' });
  }
});

// ─── PATCH /api/ventures/mine/step/:step ─────────────────────────
// Protected: save a single profile-builder step and advance lastStep
//
// Steps:
//   1 = Basic Info (name, sector, tagline, tags, websiteUrl)
//   2 = Team (teamMembers array)
//   3 = Journey Stage (stage, stageDescription, evidence array)
//   4 = Problem & Solution (problem, solution)
//   5 = Business Model Canvas (bmc object)
//   6 = Media (pitchDeckUrl, demoVideoUrl, linkedinUrl)
//
// On step 6 save we auto-publish if completeness >= 60.
router.patch('/mine/step/:step', protect, async (req, res) => {
  try {
    const step = parseInt(req.params.step, 10);
    if (step < 1 || step > 6) return res.status(400).json({ message: 'Invalid step.' });

    const venture = await Venture.findOne({ owner: req.user._id });
    if (!venture) return res.status(404).json({ message: 'Venture not found.' });

    // Map step number → allowed fields
    const stepFields = {
      1: ['name', 'sector', 'tagline', 'tags', 'websiteUrl'],
      2: ['teamMembers'],
      3: ['stage', 'stageDescription', 'evidence'],
      4: ['problem', 'solution'],
      5: ['bmc'],
      6: ['pitchDeckUrl', 'demoVideoUrl', 'linkedinUrl'],
    };

    const allowed = stepFields[step];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        venture[field] = req.body[field];
      }
    });

    // Advance lastStep if this step is further than where they've been
    if (step >= venture.lastStep) venture.lastStep = Math.min(step + 1, 6);

    // Auto-publish on final step if sufficiently complete
    if (step === 6 && venture.completeness >= 60) {
      venture.status = 'published';
    }

    await venture.save();  // triggers completeness pre-save hook

    res.json({
      venture,
      message: step === 6
        ? venture.status === 'published'
          ? 'Your venture is now live on the directory!'
          : 'Progress saved. Complete more sections to publish.'
        : 'Progress saved.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not save progress.' });
  }
});

// ─── POST /api/ventures/mine/publish ─────────────────────────────
// Force-publish a venture (if admin pre-filled it or user is ready)
router.post('/mine/publish', protect, async (req, res) => {
  try {
    const venture = await Venture.findOneAndUpdate(
      { owner: req.user._id },
      { status: 'published' },
      { new: true }
    );
    res.json({ venture, message: 'Venture published successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not publish venture.' });
  }
});

// ─── POST /api/ventures/mine/unpublish ───────────────────────────
router.post('/mine/unpublish', protect, async (req, res) => {
  try {
    const venture = await Venture.findOneAndUpdate(
      { owner: req.user._id },
      { status: 'draft' },
      { new: true }
    );
    res.json({ venture, message: 'Venture set back to draft.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not unpublish venture.' });
  }
});

module.exports = router;