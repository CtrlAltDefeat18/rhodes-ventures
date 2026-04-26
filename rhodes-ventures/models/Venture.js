const mongoose = require('mongoose');

// ─── JOURNEY STAGES ──────────────────────────────────────────────
// Mirrors exactly what the frontend renders
const JOURNEY_STAGES = [
  'idea',
  'concept-validation',
  'prototype',
  'user-testing',
  'pilot',
  'pre-revenue',
  'early-revenue',
  'growth',
  'scale'
];

// ─── BMC SUBDOCUMENT ─────────────────────────────────────────────
const BMCSchema = new mongoose.Schema({
  keyPartners:           { type: String, default: '' },
  keyActivities:         { type: String, default: '' },
  keyResources:          { type: String, default: '' },
  valueProposition:      { type: String, default: '' },
  customerRelationships: { type: String, default: '' },
  channels:              { type: String, default: '' },
  customerSegments:      { type: String, default: '' },
  costStructure:         { type: String, default: '' },
  revenueStreams:        { type: String, default: '' },
}, { _id: false });

// ─── JOURNEY EVIDENCE SUBDOCUMENT ────────────────────────────────
const EvidenceSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  value: { type: String, default: '' },
}, { _id: false });

// ─── MAIN VENTURE SCHEMA ─────────────────────────────────────────
const VentureSchema = new mongoose.Schema({

  // ─── Ownership ────────────────────────────────────────────────
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true   // One venture per user for now
  },

  // ─── Publication state ────────────────────────────────────────
  // 'draft'     → in progress, not publicly visible
  // 'published' → complete, visible in the directory
  // 'archived'  → hidden by admin or user
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },

  // ─── Profile completeness (0–100) ────────────────────────────
  // Recalculated on every save. Displayed in dashboard.
  completeness: { type: Number, default: 0 },

  // ─── Which step the user last left off on (1–6) ──────────────
  lastStep: { type: Number, default: 1, min: 1, max: 6 },

  // ─── STEP 1: Basic Info ───────────────────────────────────────
  name:          { type: String, trim: true, default: '' },
  sector:        { type: String, trim: true, default: '' },
  tags:          [{ type: String, trim: true }],
  tagline:       { type: String, trim: true, default: '' },
  websiteUrl:    { type: String, trim: true, default: '' },

  // ─── STEP 2: Team ─────────────────────────────────────────────
  teamMembers: [{
    name:     { type: String, default: '' },
    role:     { type: String, default: '' },
    bio:      { type: String, default: '' },
  }],

  // ─── STEP 3: Journey Stage ────────────────────────────────────
  stage: {
    type: String,
    enum: JOURNEY_STAGES,
    default: 'idea'
  },
  stageDescription: { type: String, default: '' }, // Narrative of their current stage
  evidence: [EvidenceSchema],                        // Up to 6 evidence items

  // ─── STEP 4: Problem & Solution ───────────────────────────────
  problem:  { type: String, default: '' },
  solution: { type: String, default: '' },

  // ─── STEP 5: Business Model Canvas ───────────────────────────
  bmc: { type: BMCSchema, default: () => ({}) },

  // ─── STEP 6: Media / Links (optional enrichment) ─────────────
  pitchDeckUrl:   { type: String, default: '' },
  demoVideoUrl:   { type: String, default: '' },
  linkedinUrl:    { type: String, default: '' },

  // ─── Admin pre-fill flag ──────────────────────────────────────
  // When true, the data was seeded by admin. Owner sees a
  // banner inviting them to review and complete their profile.
  prefilled:     { type: Boolean, default: false },

  // ─── Test flag ───────────────────────────────────────────────
  isTestData:    { type: Boolean, default: false },

}, { timestamps: true });

// ─── COMPLETENESS CALCULATION ────────────────────────────────────
// Run this before every save to keep the score fresh
VentureSchema.pre('save', function (next) {
  const weights = [
    { field: () => this.name,             w: 15 },
    { field: () => this.sector,           w: 10 },
    { field: () => this.tagline,          w: 10 },
    { field: () => this.stage,            w: 10 },
    { field: () => this.stageDescription, w: 10 },
    { field: () => this.problem,          w: 15 },
    { field: () => this.solution,         w: 15 },
    { field: () => this.bmc && this.bmc.valueProposition, w: 10 },
    { field: () => this.evidence && this.evidence.length > 0, w: 5 },
  ];
  const total = weights.reduce((acc, { field, w }) => acc + (field() ? w : 0), 0);
  this.completeness = Math.min(total, 100);
  next();
});

// ─── STATIC: Journey stage metadata ──────────────────────────────
VentureSchema.statics.JOURNEY_STAGES = JOURNEY_STAGES;
VentureSchema.statics.STAGE_META = {
  'idea':             { label: 'Idea',             pct: 8,   desc: 'You have identified a problem and an initial idea for a solution.' },
  'concept-validation':{ label: 'Concept Validation', pct: 20, desc: 'You are gathering early feedback from potential users to validate your core assumptions.' },
  'prototype':        { label: 'Prototype',        pct: 33,  desc: 'You have built a basic working version of your product or service.' },
  'user-testing':     { label: 'User Testing',     pct: 46,  desc: 'Real users are testing your prototype and providing structured feedback.' },
  'pilot':            { label: 'Pilot',            pct: 58,  desc: 'You are running a controlled, limited launch to prove the business model.' },
  'pre-revenue':      { label: 'Pre-Revenue',      pct: 70,  desc: 'The model is proven; you are finalising pricing and acquiring first paying customers.' },
  'early-revenue':    { label: 'Early Revenue',    pct: 82,  desc: 'First paying customers are on board and the business is trading.' },
  'growth':           { label: 'Growth',           pct: 92,  desc: 'Revenue is recurring and growing. You are actively scaling operations.' },
  'scale':            { label: 'Scale',            pct: 100, desc: 'The business has achieved strong product-market fit and is scaling aggressively.' },
};

module.exports = mongoose.model('Venture', VentureSchema);