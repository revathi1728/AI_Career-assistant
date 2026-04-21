const mongoose = require('mongoose');

const careerSuggestionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true
  },
  suggestions: [{
    type: {
      type: String,
      enum: ['job_role', 'skill_development', 'certification', 'education', 'career_path']
    },
    title: String,
    description: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    category: String,
    estimatedTime: String,
    resources: [{
      title: String,
      url: String,
      type: String
    }],
    skills: [String],
    salaryRange: {
      min: Number,
      max: Number
    },
    jobMarket: {
      demand: String,
      growth: String,
      competition: String
    }
  }],
  careerPath: [{
    step: Number,
    title: String,
    description: String,
    timeline: String,
    requirements: [String],
    outcomes: [String]
  }],
  skillGaps: [{
    skill: String,
    currentLevel: String,
    targetLevel: String,
    importance: String,
    learningPath: [String]
  }],
  jobRecommendations: [{
    title: String,
    company: String,
    location: String,
    salary: String,
    matchScore: Number,
    requirements: [String],
    description: String,
    applyUrl: String,
    source: String
  }],
  industryInsights: {
    trendingSkills: [String],
    emergingRoles: [String],
    marketTrends: [String],
    salaryInsights: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Index for better query performance
careerSuggestionSchema.index({ userId: 1, createdAt: -1 });
careerSuggestionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CareerSuggestion', careerSuggestionSchema);
