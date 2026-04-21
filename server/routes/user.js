const express = require('express');
const User = require('../models/User');
const Resume = require('../models/Resume');
const CareerSuggestion = require('../models/CareerSuggestion');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get user dashboard data
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    // Get user's resumes count
    const resumesCount = await Resume.countDocuments({
      userId: req.user._id,
      isActive: true
    });

    // Get user's career suggestions count
    const suggestionsCount = await CareerSuggestion.countDocuments({
      userId: req.user._id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    // Get recent resumes
    const recentResumes = await Resume.find({
      userId: req.user._id,
      isActive: true
    })
    .select('originalFileName aiAnalysis createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

    // Get recent career suggestions
    const recentSuggestions = await CareerSuggestion.find({
      userId: req.user._id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    .populate('resumeId', 'originalFileName')
    .select('suggestions careerPath createdAt')
    .sort({ createdAt: -1 })
    .limit(3);

    // Calculate completion rate for suggestions
    let completedSuggestions = 0;
    let totalSuggestions = 0;
    
    recentSuggestions.forEach(suggestion => {
      suggestion.suggestions.forEach(s => {
        totalSuggestions++;
        if (s.completed) completedSuggestions++;
      });
    });

    const completionRate = totalSuggestions > 0 
      ? Math.round((completedSuggestions / totalSuggestions) * 100) 
      : 0;

    // Calculate Resume Score (average of all analyzed resumes)
    const analyzedResumes = await Resume.find({
      userId: req.user._id,
      isActive: true,
      'aiAnalysis.score': { $exists: true, $ne: null }
    });

    const resumeScore = analyzedResumes.length > 0
      ? Math.round(analyzedResumes.reduce((sum, resume) => sum + (resume.aiAnalysis?.score || 0), 0) / analyzedResumes.length)
      : 0;

    // Calculate Profile Completion Percentage
    const user = req.user;
    const profileFields = [
      user.name,
      user.email,
      user.profile?.phone,
      user.profile?.location,
      user.profile?.bio,
      user.profile?.linkedin,
      user.profile?.github,
      user.profile?.website,
      resumesCount > 0 ? 'resume' : null, // Include resume as a profile field
      user.preferences?.jobTypes?.length > 0 ? 'jobTypes' : null,
      user.preferences?.industries?.length > 0 ? 'industries' : null,
      user.preferences?.location,
      user.preferences?.salaryRange?.min && user.preferences?.salaryRange?.max ? 'salaryRange' : null
    ];

    const completedFields = profileFields.filter(field => {
      if (!field) return false;
      if (typeof field === 'string') return field.trim() !== '';
      return true; // for non-string fields like arrays or objects
    }).length;
    const profileCompletion = Math.round((completedFields / profileFields.length) * 100);

    res.json({
      dashboard: {
        stats: {
          resumesCount,
          suggestionsCount,
          completionRate,
          resumeScore,
          profileCompletion
        },
        recentResumes: recentResumes.map(resume => ({
          id: resume._id,
          fileName: resume.originalFileName,
          score: resume.aiAnalysis?.score || 0,
          createdAt: resume.createdAt
        })),
        recentSuggestions: recentSuggestions.map(suggestion => ({
          id: suggestion._id,
          resumeName: suggestion.resumeId?.originalFileName,
          suggestionsCount: suggestion.suggestions.length,
          createdAt: suggestion.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

// Get user statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Resume statistics
    const resumeStats = await Resume.aggregate([
      { $match: { userId: req.user._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalResumes: { $sum: 1 },
          avgScore: { $avg: '$aiAnalysis.score' },
          totalEnhancements: { $sum: { $size: '$enhancements' } }
        }
      }
    ]);

    // Career suggestion statistics
    const suggestionStats = await CareerSuggestion.aggregate([
      { $match: { userId: req.user._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalSuggestions: { $sum: 1 },
          totalCareerPaths: { $sum: { $size: '$careerPath' } },
          totalSkillGaps: { $sum: { $size: '$skillGaps' } }
        }
      }
    ]);

    // Monthly activity
    const monthlyActivity = await Resume.aggregate([
      { $match: { userId: req.user._id, isActive: true } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      stats: {
        resumes: resumeStats[0] || {
          totalResumes: 0,
          avgScore: 0,
          totalEnhancements: 0
        },
        suggestions: suggestionStats[0] || {
          totalSuggestions: 0,
          totalCareerPaths: 0,
          totalSkillGaps: 0
        },
        monthlyActivity
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
});

// Update user preferences
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const { preferences } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { preferences },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error updating preferences' });
  }
});

// Get user activity log
router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get resumes activity
    const resumes = await Resume.find({
      userId: req.user._id,
      isActive: true
    })
    .select('originalFileName createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Get career suggestions activity
    const suggestions = await CareerSuggestion.find({
      userId: req.user._id,
      isActive: true
    })
    .populate('resumeId', 'originalFileName')
    .select('createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Combine and sort activities
    const activities = [
      ...resumes.map(resume => ({
        type: 'resume',
        id: resume._id,
        title: resume.originalFileName,
        action: 'uploaded',
        date: resume.createdAt
      })),
      ...suggestions.map(suggestion => ({
        type: 'suggestion',
        id: suggestion._id,
        title: `Career suggestions for ${suggestion.resumeId?.originalFileName}`,
        action: 'generated',
        date: suggestion.createdAt
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      activities: activities.slice(0, parseInt(limit)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: activities.length
      }
    });
  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({ message: 'Server error fetching activity' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { profile, preferences } = req.body;
    
    const updateData = {};
    if (profile) updateData.profile = profile;
    if (preferences) updateData.preferences = preferences;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Export user data
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const resumes = await Resume.find({
      userId: req.user._id,
      isActive: true
    });
    const suggestions = await CareerSuggestion.find({
      userId: req.user._id,
      isActive: true
    }).populate('resumeId');

    const exportData = {
      user: user,
      resumes: resumes,
      careerSuggestions: suggestions,
      exportedAt: new Date()
    };

    res.json({
      message: 'Data exported successfully',
      data: exportData
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Server error exporting data' });
  }
});

module.exports = router;
