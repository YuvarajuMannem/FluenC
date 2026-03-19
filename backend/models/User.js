const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  originalText: { type: String },
  correctedText: { type: String },
  mistakes: [
    {
      original: String,
      corrected: String,
      explanation: String,
      type: String,
    },
  ],
  cefrAnalysis: {
    overallLevel: String,
    c1Elements: [String],
    c2Elements: [String],
    score: Number,
    feedback: String,
  },
  timestamp: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema({
  title: { type: String, default: 'New Conversation' },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    conversations: [conversationSchema],
    stats: {
      totalMessages: { type: Number, default: 0 },
      c1Count: { type: Number, default: 0 },
      c2Count: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);