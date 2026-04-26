const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  // ─── Identity ────────────────────────────────────────────────
  firstName:     { type: String, required: true, trim: true },
  lastName:      { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  studentNumber: { type: String, trim: true },
  faculty:       { type: String, trim: true },
  yearOfStudy:   { type: String },

  // ─── Auth ────────────────────────────────────────────────────
  password:      { type: String, required: true, minlength: 8 },
  role:          { type: String, enum: ['student', 'admin'], default: 'student' },

  // ─── Flags ───────────────────────────────────────────────────
  isTestUser:    { type: Boolean, default: false },  // for dev/testing — can be bulk-cleared
  isVerified:    { type: Boolean, default: false },  // future: email verification

  // ─── Timestamps ──────────────────────────────────────────────
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare plain password with stored hash
UserSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Never expose password in JSON responses
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);