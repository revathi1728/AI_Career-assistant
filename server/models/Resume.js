const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  extractedText: {
    type: String,
    required: true
  },
  parsedData: {
    personalInfo: {
      name: String,
      email: String,
      phone: String,
      location: String,
      linkedin: String,
      github: String,
      website: String
    },
    summary: String,
    experience: [{
      company: String,
      position: String,
      duration: String,
      description: String,
      location: String
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      graduationYear: String,
      gpa: String
    }],
    skills: [String],
    certifications: [{
      name: String,
      issuer: String,
      date: String
    }],
    projects: [{
      name: String,
      description: String,
      technologies: [String],
      url: String
    }],
    languages: [{
      language: String,
      proficiency: String
    }]
  },
  aiAnalysis: {
    strengths: [String],
    weaknesses: [String],
    suggestions: [String],
    score: Number,
    lastAnalyzed: Date
  },
  enhancements: [{
    type: {
      type: String,
      enum: ['content', 'formatting', 'keywords', 'skills']
    },
    originalText: String,
    enhancedText: String,
    explanation: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Index for better query performance
resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ 'parsedData.skills': 1 });

module.exports = mongoose.model('Resume', resumeSchema);
