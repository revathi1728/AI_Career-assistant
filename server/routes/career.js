const AIResumeService = {
  extractTextFromFile: async () => "dummy text",
  parseResumeWithAI: async () => ({}),
  analyzeResume: async () => ({}),
  enhanceResumeContent: async () => ({}),
  basicParseText: () => ({})
};
const express = require('express');
const Resume = require('../models/Resume');
const CareerSuggestion = require('../models/CareerSuggestion');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Generate career suggestions for a resume
router.post('/generate/:resumeId', authMiddleware, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      userId: req.user._id,
      isActive: true
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check if suggestions already exist and are recent
    const existingSuggestion = await CareerSuggestion.findOne({
      userId: req.user._id,
      resumeId: resume._id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (existingSuggestion) {
      return res.json({
        message: 'Career suggestions retrieved successfully',
        suggestions: existingSuggestion
      });
    }

    // Generate new suggestions with AI
    const suggestions = await AIResumeService.generateCareerSuggestions(
      resume.parsedData,
      req.user.preferences || {}
    );

    // Sanitize the suggestions data to ensure proper structure
    const sanitizedSuggestions = (suggestions.suggestions || []).map(suggestion => {
      // Ensure resources is properly structured
      let resources = [];
      if (suggestion.resources) {
        if (Array.isArray(suggestion.resources)) {
          resources = suggestion.resources.filter(resource => 
            resource && typeof resource === 'object' && resource.title && resource.url
          );
        } else if (typeof suggestion.resources === 'string') {
          // If it's a string, try to parse it
          try {
            const parsed = JSON.parse(suggestion.resources);
            if (Array.isArray(parsed)) {
              resources = parsed.filter(resource => 
                resource && typeof resource === 'object' && resource.title && resource.url
              );
            }
          } catch (e) {
            console.warn('Failed to parse resources string:', suggestion.resources);
            resources = [];
          }
        }
      }

      return {
        type: suggestion.type || 'job_role',
        title: suggestion.title || 'Career Suggestion',
        description: suggestion.description || '',
        priority: suggestion.priority || 'medium',
        category: suggestion.category || '',
        estimatedTime: suggestion.estimatedTime || '',
        resources: resources,
        skills: Array.isArray(suggestion.skills) ? suggestion.skills : [],
        salaryRange: suggestion.salaryRange || {},
        jobMarket: suggestion.jobMarket || {}
      };
    });

    // Create career suggestion record
    const careerSuggestion = new CareerSuggestion({
      userId: req.user._id,
      resumeId: resume._id,
      suggestions: sanitizedSuggestions,
      careerPath: suggestions.careerPath || [],
      skillGaps: suggestions.skillGaps || [],
      jobRecommendations: suggestions.jobRecommendations || [],
      industryInsights: suggestions.industryInsights || {}
    });

    await careerSuggestion.save();

    res.json({
      message: 'Career suggestions generated successfully',
      suggestions: careerSuggestion
    });
  } catch (error) {
    console.error('Career suggestions error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: error.message || 'Server error generating career suggestions' 
    });
  }
});

// Get career suggestions for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const suggestions = await CareerSuggestion.find({
      userId: req.user._id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    .populate('resumeId', 'originalFileName parsedData')
    .sort({ createdAt: -1 });

    res.json({
      suggestions: suggestions.map(suggestion => ({
        id: suggestion._id,
        resumeId: suggestion.resumeId,
        suggestions: suggestion.suggestions,
        careerPath: suggestion.careerPath,
        skillGaps: suggestion.skillGaps,
        jobRecommendations: suggestion.jobRecommendations,
        industryInsights: suggestion.industryInsights,
        createdAt: suggestion.createdAt,
        expiresAt: suggestion.expiresAt
      }))
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ message: 'Server error fetching career suggestions' });
  }
});

// Get specific career suggestion
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const suggestion = await CareerSuggestion.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).populate('resumeId', 'originalFileName parsedData');

    if (!suggestion) {
      return res.status(404).json({ message: 'Career suggestion not found or expired' });
    }

    res.json({
      suggestion: {
        id: suggestion._id,
        resumeId: suggestion.resumeId,
        suggestions: suggestion.suggestions,
        careerPath: suggestion.careerPath,
        skillGaps: suggestion.skillGaps,
        jobRecommendations: suggestion.jobRecommendations,
        industryInsights: suggestion.industryInsights,
        createdAt: suggestion.createdAt,
        expiresAt: suggestion.expiresAt
      }
    });
  } catch (error) {
    console.error('Get suggestion error:', error);
    res.status(500).json({ message: 'Server error fetching career suggestion' });
  }
});

// Update career suggestion (mark as completed, add notes, etc.)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { action, data } = req.body;

    const suggestion = await CareerSuggestion.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!suggestion) {
      return res.status(404).json({ message: 'Career suggestion not found' });
    }

    switch (action) {
      case 'mark_completed':
        // Mark a specific suggestion as completed
        if (data.suggestionIndex !== undefined) {
          if (!suggestion.suggestions[data.suggestionIndex]) {
            return res.status(400).json({ message: 'Invalid suggestion index' });
          }
          suggestion.suggestions[data.suggestionIndex].completed = true;
          suggestion.suggestions[data.suggestionIndex].completedAt = new Date();
        }
        break;
      
      case 'add_note':
        // Add a note to a suggestion
        if (data.suggestionIndex !== undefined && data.note) {
          if (!suggestion.suggestions[data.suggestionIndex]) {
            return res.status(400).json({ message: 'Invalid suggestion index' });
          }
          if (!suggestion.suggestions[data.suggestionIndex].notes) {
            suggestion.suggestions[data.suggestionIndex].notes = [];
          }
          suggestion.suggestions[data.suggestionIndex].notes.push({
            note: data.note,
            createdAt: new Date()
          });
        }
        break;
      
      case 'update_priority':
        // Update priority of a suggestion
        if (data.suggestionIndex !== undefined && data.priority) {
          if (!suggestion.suggestions[data.suggestionIndex]) {
            return res.status(400).json({ message: 'Invalid suggestion index' });
          }
          suggestion.suggestions[data.suggestionIndex].priority = data.priority;
        }
        break;
      
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    await suggestion.save();

    res.json({
      message: 'Career suggestion updated successfully',
      suggestion: suggestion
    });
  } catch (error) {
    console.error('Update suggestion error:', error);
    res.status(500).json({ message: 'Server error updating career suggestion' });
  }
});

// Refresh career suggestions (generate new ones)
router.post('/:id/refresh', authMiddleware, async (req, res) => {
  try {
    const suggestion = await CareerSuggestion.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    }).populate('resumeId');

    if (!suggestion) {
      return res.status(404).json({ message: 'Career suggestion not found' });
    }

    // Deactivate old suggestion
    suggestion.isActive = false;
    await suggestion.save();

    // Generate new suggestions
    const newSuggestions = await AIResumeService.generateCareerSuggestions(
      suggestion.resumeId.parsedData,
      req.user.preferences || {}
    );

    // Create new career suggestion record
    const newCareerSuggestion = new CareerSuggestion({
      userId: req.user._id,
      resumeId: suggestion.resumeId._id,
      suggestions: newSuggestions.suggestions || [],
      careerPath: newSuggestions.careerPath || [],
      skillGaps: newSuggestions.skillGaps || [],
      jobRecommendations: newSuggestions.jobRecommendations || [],
      industryInsights: newSuggestions.industryInsights || {}
    });

    await newCareerSuggestion.save();

    res.json({
      message: 'Career suggestions refreshed successfully',
      suggestions: newCareerSuggestion
    });
  } catch (error) {
    console.error('Refresh suggestions error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error refreshing career suggestions' 
    });
  }
});

// Delete career suggestion
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const suggestion = await CareerSuggestion.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!suggestion) {
      return res.status(404).json({ message: 'Career suggestion not found' });
    }

    // Soft delete
    suggestion.isActive = false;
    await suggestion.save();

    res.json({ message: 'Career suggestion deleted successfully' });
  } catch (error) {
    console.error('Delete suggestion error:', error);
    res.status(500).json({ message: 'Server error deleting career suggestion' });
  }
});

module.exports = router;
