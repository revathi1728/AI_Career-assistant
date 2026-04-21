const express = require('express');
const User = require('../models/User');
const Resume = require('../models/Resume');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Overview metrics
router.get('/overview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalResumes = await Resume.countDocuments();
    const avgScoreAgg = await Resume.aggregate([
      { $match: { 'aiAnalysis.score': { $exists: true } } },
      { $group: { _id: null, avgScore: { $avg: '$aiAnalysis.score' } } }
    ]);
    const avgScore = avgScoreAgg[0]?.avgScore || 0;

    // popular roles (if stored in suggestions)
    const popularRolesAgg = await Resume.aggregate([
      { $unwind: { path: '$aiAnalysis.suggestions', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$aiAnalysis.suggestions', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({ totalUsers, totalResumes, avgScore, popularRoles: popularRolesAgg });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ message: 'Failed to load overview' });
  }
});

// List users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(500);
    res.json({ users });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// List resumes
router.get('/resumes', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const resumes = await Resume.find().sort({ createdAt: -1 }).limit(500).populate('userId', 'name email');
    res.json({ resumes });
  } catch (error) {
    console.error('Admin resumes error:', error);
    res.status(500).json({ message: 'Failed to load resumes' });
  }
});

module.exports = router;
