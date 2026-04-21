const AIResumeService = {
  extractTextFromFile: async () => "dummy text",
  parseResumeWithAI: async () => ({
    personalInfo: {},
    skills: [],
    experience: [],
    education: []
  }),
  analyzeResume: async () => ({
    score: 0,
    strengths: [],
    improvements: [],
    keywords: [],
    summary: ""
  }),
  enhanceResumeContent: async () => ({
    enhancedText: "",
    explanation: ""
  }),
  basicParseText: () => ({})
};
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Resume = require('../models/Resume');
const CareerSuggestion = require('../models/CareerSuggestion');

const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `resume-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

// Upload resume
router.post('/upload', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Extract text from uploaded file
    const fileBuffer = await fs.readFile(req.file.path);
    const extractedText = await AIResumeService.extractTextFromFile(fileBuffer, req.file.mimetype);

    if (!extractedText || extractedText.length < 50) {
      await fs.unlink(req.file.path); // Clean up file
      return res.status(400).json({ message: 'Could not extract sufficient text from the file' });
    }

    // Parse resume with AI (guarded)
    let parsedData;
    try {
      parsedData = await AIResumeService.parseResumeWithAI(extractedText);
    } catch (aiParseError) {
      console.error('AI parse failed during upload:', aiParseError);
      // Fallback to minimal parsedData so the upload can continue
      parsedData = {
        personalInfo: { name: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '' },
        summary: '',
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        projects: [],
        languages: [],
        _aiParseWarning: aiParseError.message || 'AI parse failed; see server logs.'
      };
    }

    // Create resume record
    const resume = new Resume({
      userId: req.user._id,
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      extractedText: extractedText,
      parsedData: parsedData
    });

    await resume.save();

    // Automatically trigger AI analysis after successful upload
    let analysisWarning = null;
    try {
      const analysis = await AIResumeService.analyzeResume(resume.parsedData);
      resume.aiAnalysis = {
        score: analysis.score,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        keywords: analysis.keywords,
        summary: analysis.summary,
        analyzedAt: new Date()
      };
      await resume.save();
    } catch (aiAnalysisError) {
      console.error('Auto-analysis failed after upload:', aiAnalysisError);
      analysisWarning = 'Resume uploaded successfully, but AI analysis failed. You can manually analyze it later.';
    }

    const responsePayload = {
      message: 'Resume uploaded and processed successfully',
      resume: {
        id: resume._id,
        originalFileName: resume.originalFileName,
        fileSize: resume.fileSize,
        parsedData: resume.parsedData,
        aiAnalysis: resume.aiAnalysis,
        createdAt: resume.createdAt
      }
    };

    // Add analysis warning if auto-analysis failed
    if (analysisWarning) {
      responsePayload.warning = analysisWarning;
    }

    // If AI returned a warning field, surface it to the client with 201
    if (resume.parsedData && resume.parsedData._aiParseWarning) {
      responsePayload.warning = resume.parsedData._aiParseWarning;
    }

    res.status(201).json(responsePayload);
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      message: error.message || 'Server error during resume upload' 
    });
  }
});

// Get user's resumes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const resumes = await Resume.find({ 
      userId: req.user._id, 
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({
      resumes: resumes.map(resume => ({
        id: resume._id,
        originalFileName: resume.originalFileName,
        fileSize: resume.fileSize,
        parsedData: resume.parsedData,
        aiAnalysis: resume.aiAnalysis,
        version: resume.version,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ message: 'Server error fetching resumes' });
  }
});

// Get specific resume
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json({
      resume: {
        id: resume._id,
        originalFileName: resume.originalFileName,
        fileSize: resume.fileSize,
        extractedText: resume.extractedText,
        parsedData: resume.parsedData,
        aiAnalysis: resume.aiAnalysis,
        enhancements: resume.enhancements,
        version: resume.version,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt
      }
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ message: 'Server error fetching resume' });
  }
});

// Analyze resume
router.post('/:id/analyze', authMiddleware, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Validate parsedData exists
    if (!resume.parsedData || Object.keys(resume.parsedData).length === 0) {
      return res.status(422).json({
        message: 'Resume has no parsed data to analyze. Please upload and parse the resume first.'
      });
    }

    // Analyze resume with AI (wrapped so failures produce informative responses)
    let analysis;
    try {
      analysis = await AIResumeService.analyzeResume(resume.parsedData);
    } catch (aiErr) {
      console.error('AI analysis failed:', aiErr);
      // Return 502 (bad gateway) to indicate upstream AI failure, include warning
      return res.status(502).json({
        message: 'AI service failed to analyze the resume. Try again later or enable OPENAI in server config.',
        _aiError: aiErr.message || String(aiErr)
      });
    }

    // Build aiAnalysis object with the requested shape and include parsed skills
    const aiAnalysis = {
      userId: req.user._id,
      score: analysis.score || 0,
      skills: resume.parsedData?.skills || [],
      // allow analysis to include missingSkills/skillGaps if present
      missingSkills: analysis.missingSkills || analysis.skillGaps || [],
      suggestions: analysis.suggestions || [],
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      overallFeedback: analysis.overallFeedback || '',
      lastAnalyzed: new Date()
    };

    resume.aiAnalysis = aiAnalysis;

    await resume.save();

    res.json({
      message: 'Resume analyzed successfully',
      analysis: resume.aiAnalysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ message: error.message || 'Server error during resume analysis' });
  }
});

// Re-parse resume (force parse using AI or basic parser)
router.post('/:id/parse', authMiddleware, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Use the extracted text to parse again
    let parsedData;
    try {
      parsedData = await AIResumeService.parseResumeWithAI(resume.extractedText);
    } catch (err) {
      console.error('Re-parse error:', err);
      parsedData = AIResumeService.basicParseText(resume.extractedText);
      parsedData._aiParseWarning = err.message || 'Re-parse failed; used basic parser fallback.';
    }

    resume.parsedData = parsedData;
    await resume.save();

    res.json({ message: 'Resume re-parsed successfully', parsedData: resume.parsedData });
  } catch (error) {
    console.error('Re-parse route error:', error);
    res.status(500).json({ message: 'Server error during resume re-parse' });
  }
});

// Enhance resume content
router.post('/:id/enhance', authMiddleware, async (req, res) => {
  try {
    const { originalText, enhancementType, context } = req.body;

    if (!originalText || !enhancementType) {
      return res.status(400).json({ 
        message: 'Original text and enhancement type are required' 
      });
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Enhance content with AI
    const enhancement = await AIResumeService.enhanceResumeContent(
      originalText, 
      enhancementType, 
      context
    );

    // Save enhancement
    resume.enhancements.push({
      type: enhancementType,
      originalText: originalText,
      enhancedText: enhancement.enhancedText,
      explanation: enhancement.explanation
    });

    await resume.save();

    res.json({
      message: 'Content enhanced successfully',
      enhancement: {
        type: enhancementType,
        originalText: originalText,
        enhancedText: enhancement.enhancedText,
        explanation: enhancement.explanation,
        createdAt: resume.enhancements[resume.enhancements.length - 1].createdAt
      }
    });
  } catch (error) {
    console.error('Enhancement error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error during content enhancement' 
    });
  }
});

// Delete resume
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Soft delete
    resume.isActive = false;
    await resume.save();

    // Clean up file
    try {
      await fs.unlink(resume.filePath);
    } catch (unlinkError) {
      console.error('Error cleaning up file:', unlinkError);
    }

    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error deleting resume' });
  }
});

module.exports = router;

