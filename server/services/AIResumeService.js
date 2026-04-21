const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OPENAI_ENABLED = process.env.OPENAI_ENABLED !== 'false';

class AIResumeService {
  
  // Extract text from uploaded file
  static async extractTextFromFile(fileBuffer, mimeType) {
    try {
      let text = '';
      
      if (mimeType === 'application/pdf') {
        const pdfData = await pdfParse(fileBuffer);
        text = pdfData.text;
      } else if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        text = result.value;
      } else if (mimeType === 'text/plain') {
        text = fileBuffer.toString('utf-8');
      } else {
        throw new Error('Unsupported file type');
      }
      
      return text.trim();
    } catch (error) {
      console.error('Text extraction error:', error);
      throw new Error('Failed to extract text from file');
    }
  }

  // Basic rule-based parser to extract common fields without AI
  static basicParseText(text) {
    try {
      const normalized = (text || '').replace(/\r\n/g, '\n');

      // Heuristics: name = first non-empty short line
      const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
      let name = '';
      if (lines.length) {
        // prefer first line if it contains letters and a space and is not too long
        const first = lines[0];
        if (/^[A-Za-z ,.'-]{2,100}$/.test(first) && first.split(' ').length <= 5) {
          name = first;
        } else {
          // fallback: try to find a line that looks like a name
          const candidate = lines.find(l => /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(l));
          name = candidate || first;
        }
      }

      // Email
      const emailMatch = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
      const email = emailMatch ? emailMatch[0] : '';

      // Phone
      const phoneMatch = text.match(/(\+?\d{1,3}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/);
      const phone = phoneMatch ? phoneMatch[0] : '';

      // Skills: try to capture under a Skills heading or comma-separated lists
      let skills = [];
      const skillsSection = normalized.match(/(?:skills|technical skills|core competencies|technologies)[:\n]+([\s\S]{0,500}?)(?:\n\n|\n[A-Z]|$)/i);
      if (skillsSection && skillsSection[1]) {
        const skillsText = skillsSection[1];
        // Split by common delimiters and clean up
        skills = skillsText.split(/[,;·•|\u2022\n]/)
          .map(s => s.trim())
          .filter(s => s && s.length > 1 && s.length < 50)
          .slice(0, 20);
      } else {
        // Enhanced fallback: look for more comprehensive skill words
        const techSkills = text.match(/\b(JavaScript|Java|Python|React|Node\.?js|C#|C\+\+|SQL|AWS|Docker|Kubernetes|HTML|CSS|TypeScript|MongoDB|Angular|Vue|PHP|Ruby|Go|Rust|Swift|Kotlin|Flutter|Django|Flask|Spring|Express|PostgreSQL|MySQL|Redis|Git|Jenkins|Terraform|Ansible|Linux|Windows|MacOS|Agile|Scrum|REST|GraphQL|API|Microservices|DevOps|CI\/CD|Machine Learning|AI|Data Science|Pandas|NumPy|TensorFlow|PyTorch|Tableau|Power BI|Excel|Photoshop|Figma|Sketch)\b/gi) || [];
        const softSkills = text.match(/\b(Leadership|Communication|Problem Solving|Team Work|Project Management|Time Management|Critical Thinking|Analytical|Creative|Adaptable|Collaborative)\b/gi) || [];
        skills = Array.from(new Set([...techSkills, ...softSkills])).slice(0, 30);
      }

      // Experience: capture section between Experience and next header
      let experience = [];
      const expSection = normalized.match(/(?:experience|work experience|employment|professional experience|work history|career history|professional background)[:\n]+([\s\S]*?)(?:education|skills|certifications|projects|awards|personal|references|$)/i);
      if (expSection && expSection[1]) {
        const expText = expSection[1];
        // Split by double newlines or lines that look like job titles/companies
        const entries = expText.split(/\n\s*\n|\n(?=[A-Z][^a-z]*(?:,|\s+\d{4}|\s+\w+\s+\d{4}))/);
        
        for (const entry of entries) {
          if (entry.trim().length < 10) continue;
          
          const lines = entry.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length === 0) continue;
          
          let company = '', position = '', duration = '', description = '';
          
          // Try to identify company, position, and duration from first few lines
          for (let i = 0; i < Math.min(3, lines.length); i++) {
            const line = lines[i];
            
            // Check if line contains dates (duration)
            if (/\b\d{4}\b.*\b\d{4}\b|\b\d{4}\s*-\s*(?:\d{4}|present|current)/i.test(line)) {
              duration = line;
            }
            // Check if line looks like a company (often has Inc, LLC, Corp, etc.)
            else if (/\b(inc|llc|corp|company|ltd|limited|technologies|systems|solutions|group|consulting)\b/i.test(line) || 
                     (line.length < 60 && !duration && !company)) {
              company = line;
            }
            // Otherwise treat as position
            else if (!position && line.length < 80) {
              position = line;
            }
          }
          
          // Remaining lines are description
          const descLines = lines.slice(Math.min(3, lines.length));
          description = descLines.join(' ').substring(0, 500);
          
          if (company || position) {
            experience.push({
              company: company || 'Company Name',
              position: position || 'Position',
              duration: duration || '',
              description: description,
              location: ''
            });
          }
        }
      }

      // If no experience found, try alternative extraction methods
      if (experience.length === 0) {
        // Look for any lines with years that might be experience
        const yearLines = normalized.split('\n').filter(line => 
          /\b(19|20)\d{2}\b/.test(line) && 
          line.length > 10 && 
          line.length < 200 &&
          !/education|degree|graduation|school|university|college/i.test(line)
        );
        
        for (const line of yearLines.slice(0, 5)) {
          experience.push({
            company: 'Company Name',
            position: line.split(/\d{4}/)[0].trim() || 'Position',
            duration: line.match(/\b(19|20)\d{2}.*?(19|20)\d{2}|\b(19|20)\d{2}\s*-\s*(?:present|current)|\b(19|20)\d{2}/i)?.[0] || '',
            description: line,
            location: ''
          });
        }
      }

      // Education: improved capture
      let education = [];
      const eduSection = normalized.match(/(?:education|academic background|qualifications)[:\n]+([\s\S]*?)(?:experience|skills|certifications|projects|awards|$)/i);
      if (eduSection && eduSection[1]) {
        const eduText = eduSection[1];
        const entries = eduText.split(/\n\s*\n|\n(?=[A-Z][^a-z]*(?:university|college|institute|school))/i);
        
        for (const entry of entries) {
          if (entry.trim().length < 5) continue;
          
          const lines = entry.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length === 0) continue;
          
          let institution = '', degree = '', field = '', graduationYear = '';
          
          for (const line of lines) {
            // Check for graduation year
            const yearMatch = line.match(/\b(19|20)\d{2}\b/);
            if (yearMatch && !graduationYear) {
              graduationYear = yearMatch[0];
            }
            
            // Check for degree keywords
            if (/\b(bachelor|master|phd|doctorate|diploma|certificate|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|b\.?tech|m\.?tech)\b/i.test(line)) {
              degree = line;
            }
            // Check for institution keywords
            else if (/\b(university|college|institute|school|academy)\b/i.test(line)) {
              institution = line;
            }
            // If no specific keywords, use first line as institution
            else if (!institution && lines.indexOf(line) === 0) {
              institution = line;
            }
          }
          
          if (institution || degree) {
            education.push({
              institution: institution || 'Educational Institution',
              degree: degree || '',
              field: field,
              graduationYear: graduationYear,
              gpa: ''
            });
          }
        }
      }

      // Certifications: capture certifications section
      let certifications = [];
      const certSection = normalized.match(/(?:certifications?|licenses?|credentials?)[:\n]+([\s\S]*?)(?:experience|education|skills|projects|awards|$)/i);
      if (certSection && certSection[1]) {
        const certLines = certSection[1].split('\n').map(l => l.trim()).filter(Boolean);
        certifications = certLines.slice(0, 10).map(line => ({
          name: line,
          issuer: '',
          date: ''
        }));
      }

      // Projects: capture projects section
      let projects = [];
      const projectSection = normalized.match(/(?:projects?|portfolio|work samples?)[:\n]+([\s\S]*?)(?:experience|education|skills|certifications|awards|$)/i);
      if (projectSection && projectSection[1]) {
        const projectText = projectSection[1];
        const entries = projectText.split(/\n\s*\n|\n(?=[A-Z][^a-z]*:)/);
        
        for (const entry of entries) {
          if (entry.trim().length < 10) continue;
          
          const lines = entry.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length === 0) continue;
          
          const name = lines[0];
          const description = lines.slice(1).join(' ').substring(0, 300);
          
          // Extract technologies mentioned in the description
          const techMatches = description.match(/\b(JavaScript|Java|Python|React|Node\.?js|HTML|CSS|TypeScript|MongoDB|SQL|AWS|Docker|Git)\b/gi) || [];
          
          projects.push({
            name: name,
            description: description,
            technologies: Array.from(new Set(techMatches)).slice(0, 10),
            url: ''
          });
        }
      }

      return {
        personalInfo: { name: name || '', email: email || '', phone: phone || '', location: '', linkedin: '', github: '', website: '' },
        summary: '',
        experience,
        education,
        skills,
        certifications,
        projects,
        languages: []
      };
    } catch (err) {
      console.error('basicParseText error:', err);
      return {
        personalInfo: { name: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '' },
        summary: '',
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        projects: [],
        languages: []
      };
    }
  }

  // Parse resume using AI
  static async parseResumeWithAI(text) {
    try {
      const prompt = `
        Analyze the following resume text and extract structured information. 
        Return a JSON object with the following structure:
        {
          "personalInfo": {
            "name": "string",
            "email": "string", 
            "phone": "string",
            "location": "string",
            "linkedin": "string",
            "github": "string",
            "website": "string"
          },
          "summary": "string",
          "experience": [
            {
              "company": "string",
              "position": "string", 
              "duration": "string",
              "description": "string",
              "location": "string"
            }
          ],
          "education": [
            {
              "institution": "string",
              "degree": "string",
              "field": "string", 
              "graduationYear": "string",
              "gpa": "string"
            }
          ],
          "skills": ["string"],
          "certifications": [
            {
              "name": "string",
              "issuer": "string",
              "date": "string"
            }
          ],
          "projects": [
            {
              "name": "string",
              "description": "string",
              "technologies": ["string"],
              "url": "string"
            }
          ],
          "languages": [
            {
              "language": "string",
              "proficiency": "string"
            }
          ]
        }
        
        Resume text:
        ${text}
      `;

      if (!OPENAI_ENABLED) {
        console.warn('OPENAI_DISABLED: returning mock parsed data for development');
        const basic = AIResumeService.basicParseText(text);
        basic._aiParseWarning = 'AI disabled in development. Used basic rule-based parser.';
        return basic;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert resume parser. Extract information accurately and return only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const parsedData = JSON.parse(response.choices[0].message.content);
      return parsedData;
    } catch (error) {
      // If JSON.parse failed or OpenAI returned an error, attempt to recover
      try {
        if (error && error.response && error.response.data) {
          console.error('OpenAI API error during parse:', error.response.data);
        } else {
          console.error('AI parsing error:', error);
        }
      } catch (logErr) {
        console.error('Error logging AI parse error', logErr);
      }

      // Try to salvage malformed JSON from the last response if available
      try {
        const lastText = (error && error.response && error.response.data && error.response.data.choices && error.response.data.choices[0] && error.response.data.choices[0].message && error.response.data.choices[0].message.content)
          || (typeof error === 'string' ? error : null);

        if (lastText) {
          const match = lastText.match(/\{[\s\S]*\}/);
          if (match) {
            const recovered = JSON.parse(match[0]);
            console.warn('Recovered JSON from malformed AI response');
            return recovered;
          }
        }
      } catch (recoverErr) {
        console.error('Recovery parse failed:', recoverErr);
      }

      // As a last resort, attempt a basic rule-based parse so the UI can show meaningful fields
      console.warn('AI parsing failed; falling back to basic rule-based parse');
      const basic = AIResumeService.basicParseText(text);
      basic._aiParseWarning = 'AI parsing failed or returned malformed output. Used basic rule-based parser.';
      return basic;
    }
  }

  // Analyze resume and provide suggestions
  static async analyzeResume(parsedData) {
    try {
      if (!OPENAI_ENABLED) {
        console.warn('OPENAI_DISABLED: returning mock analysis for development');
        // Calculate a basic score based on resume completeness
        const basicScore = AIResumeService.calculateBasicScore(parsedData);
        return {
          strengths: parsedData.skills?.slice(0, 3) || ['Professional Experience'],
          weaknesses: ['Enable AI analysis for detailed feedback'],
          suggestions: ['AI disabled in development. Enable OPENAI_ENABLED to get real analysis.'],
          score: basicScore,
          overallFeedback: `AI disabled in development. Basic score calculated: ${basicScore}/100`
        };
      }
      const prompt = `
        Analyze this resume data and provide detailed feedback and suggestions.
        Return a JSON object with:
        {
          "strengths": ["string"],
          "weaknesses": ["string"], 
          "suggestions": ["string"],
          "score": number (0-100),
          "overallFeedback": "string"
        }
        
        Resume data:
        ${JSON.stringify(parsedData, null, 2)}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional career counselor and resume expert. Provide constructive feedback and actionable suggestions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      return analysis;
    } catch (error) {
      console.error('Resume analysis error:', error);

      // Try to recover JSON from response if available
      try {
        const lastText = (error && error.response && error.response.data && error.response.data.choices && error.response.data.choices[0] && error.response.data.choices[0].message && error.response.data.choices[0].message.content)
          || (typeof error === 'string' ? error : null);

        if (lastText) {
          const match = lastText.match(/\{[\s\S]*\}/);
          if (match) {
            const recovered = JSON.parse(match[0]);
            console.warn('Recovered analysis JSON from malformed AI response');
            return recovered;
          }
        }
      } catch (recoverErr) {
        console.error('Recovery parse failed for analysis:', recoverErr);
      }

      // Return a safe fallback analysis so callers don't get a 500 in dev
      const basicScore = AIResumeService.calculateBasicScore(parsedData);
      return {
        strengths: parsedData.skills?.slice(0, 3) || ['Professional Experience'],
        weaknesses: ['AI analysis unavailable'],
        suggestions: ['Analysis failed or AI unavailable. See server logs for details.'],
        score: basicScore,
        overallFeedback: `Analysis unavailable. Basic score calculated: ${basicScore}/100`,
        _aiAnalysisWarning: 'AI analysis failed; see server logs.'
      };
    }
  }

  // Calculate a basic score based on resume completeness
  static calculateBasicScore(parsedData) {
    let score = 0;
    
    // Personal info (20 points max)
    if (parsedData.personalInfo?.name) score += 5;
    if (parsedData.personalInfo?.email) score += 5;
    if (parsedData.personalInfo?.phone) score += 5;
    if (parsedData.personalInfo?.location) score += 5;
    
    // Experience (30 points max)
    if (parsedData.experience?.length > 0) {
      score += 15;
      if (parsedData.experience.length >= 2) score += 10;
      if (parsedData.experience.some(exp => exp.description && exp.description.length > 50)) score += 5;
    }
    
    // Education (15 points max)
    if (parsedData.education?.length > 0) {
      score += 10;
      if (parsedData.education.some(edu => edu.degree)) score += 5;
    }
    
    // Skills (20 points max)
    if (parsedData.skills?.length > 0) {
      score += 10;
      if (parsedData.skills.length >= 5) score += 5;
      if (parsedData.skills.length >= 10) score += 5;
    }
    
    // Additional sections (15 points max)
    if (parsedData.summary && parsedData.summary.length > 20) score += 5;
    if (parsedData.certifications?.length > 0) score += 5;
    if (parsedData.projects?.length > 0) score += 5;
    
    return Math.min(score, 100);
  }

  // Enhance resume content
  static async enhanceResumeContent(originalText, enhancementType, context = '') {
    try {
      if (!OPENAI_ENABLED) {
        console.warn('OPENAI_DISABLED: returning original text as enhanced content for development');
        return {
          enhancedText: originalText,
          explanation: `AI disabled in development. Returned original text for enhancement type: ${enhancementType}`
        };
      }
      let prompt = '';
      
      switch (enhancementType) {
        case 'summary':
          prompt = `Rewrite this professional summary to be more compelling and impactful:\n\n${originalText}`;
          break;
        case 'experience':
          prompt = `Enhance this work experience description to be more achievement-focused and quantifiable:\n\n${originalText}`;
          break;
        case 'skills':
          prompt = `Suggest improvements for this skills section to better align with current industry standards:\n\n${originalText}`;
          break;
        case 'keywords':
          prompt = `Add relevant keywords and optimize this text for ATS (Applicant Tracking Systems):\n\n${originalText}`;
          break;
        default:
          prompt = `Improve this resume content to make it more professional and impactful:\n\n${originalText}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional resume writer. Enhance the content while maintaining authenticity and accuracy."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1000
      });

      return {
        enhancedText: response.choices[0].message.content,
        explanation: `Enhanced ${enhancementType} for better impact and ATS optimization`
      };
    } catch (error) {
      console.error('Content enhancement error:', error);
      // Return original text as a safe fallback so UI can continue working
      return {
        enhancedText: originalText,
        explanation: 'Enhancement failed or AI unavailable; returned original text as fallback',
        _aiEnhanceWarning: 'AI enhancement failed; see server logs.'
      };
    }
  }

  // Generate career suggestions
  static async generateCareerSuggestions(parsedData, userPreferences = {}) {
    try {
      if (!OPENAI_ENABLED) {
        console.warn('OPENAI_DISABLED: returning mock career suggestions for development');
        return AIResumeService.generateMockCareerSuggestions(parsedData);
      }
      const prompt = `
        Based on this resume data and user preferences, generate comprehensive career suggestions.
        Return a JSON object with:
        {
          "suggestions": [
            {
              "type": "job_role|skill_development|certification|education|career_path",
              "title": "string",
              "description": "string", 
              "priority": "high|medium|low",
              "category": "string",
              "estimatedTime": "string",
              "resources": [
                {
                  "title": "string",
                  "url": "string",
                  "type": "string"
                }
              ],
              "skills": ["string"],
              "salaryRange": {
                "min": number,
                "max": number
              },
              "jobMarket": {
                "demand": "string",
                "growth": "string", 
                "competition": "string"
              }
            }
          ],
          "careerPath": [
            {
              "step": number,
              "title": "string",
              "description": "string",
              "timeline": "string",
              "requirements": ["string"],
              "outcomes": ["string"]
            }
          ],
          "skillGaps": [
            {
              "skill": "string",
              "currentLevel": "string",
              "targetLevel": "string", 
              "importance": "string",
              "learningPath": ["string"]
            }
          ],
          "industryInsights": {
            "trendingSkills": ["string"],
            "emergingRoles": ["string"],
            "marketTrends": ["string"],
            "salaryInsights": ["string"]
          }
        }
        
        Resume data:
        ${JSON.stringify(parsedData, null, 2)}
        
        User preferences:
        ${JSON.stringify(userPreferences, null, 2)}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert career counselor with deep knowledge of job markets, skills, and career development. Provide personalized, actionable career advice."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 2500
      });

      const suggestions = JSON.parse(response.choices[0].message.content);
      
      // Validate and clean the AI response structure
      const cleanedSuggestions = {
        suggestions: (suggestions.suggestions || []).map(suggestion => ({
          ...suggestion,
          resources: Array.isArray(suggestion.resources) ? suggestion.resources : []
        })),
        careerPath: suggestions.careerPath || [],
        skillGaps: suggestions.skillGaps || [],
        industryInsights: suggestions.industryInsights || {}
      };
      
      return cleanedSuggestions;
    } catch (error) {
      console.error('Career suggestions error:', error);
      // Try to recover or return a safe default to avoid crashing callers
      try {
        const lastText = (error && error.response && error.response.data && error.response.data.choices && error.response.data.choices[0] && error.response.data.choices[0].message && error.response.data.choices[0].message.content)
          || (typeof error === 'string' ? error : null);

        if (lastText) {
          const match = lastText.match(/\{[\s\S]*\}/);
          if (match) {
            const recovered = JSON.parse(match[0]);
            console.warn('Recovered career suggestions JSON from malformed AI response');
            
            // Validate recovered data structure
            const cleanedRecovered = {
              suggestions: (recovered.suggestions || []).map(suggestion => ({
                ...suggestion,
                resources: Array.isArray(suggestion.resources) ? suggestion.resources : []
              })),
              careerPath: recovered.careerPath || [],
              skillGaps: recovered.skillGaps || [],
              industryInsights: recovered.industryInsights || {}
            };
            
            return cleanedRecovered;
          }
        }
      } catch (recoverErr) {
        console.error('Recovery parse failed for career suggestions:', recoverErr);
      }

      // Return meaningful fallback data instead of empty arrays
      const fallbackData = AIResumeService.generateMockCareerSuggestions(parsedData);
      fallbackData._aiSuggestionsWarning = 'AI suggestions failed; using fallback data. See server logs.';
      return fallbackData;
    }
  }

  // Generate mock career suggestions for development
  static generateMockCareerSuggestions(parsedData) {
    const skills = parsedData.skills || [];
    const experience = parsedData.experience || [];
    const hasExperience = experience.length > 0;
    const currentYear = new Date().getFullYear();
    
    // Determine career focus based on skills
    const isDataFocused = skills.some(skill => 
      /python|data|analytics|sql|pandas|numpy|tableau|power bi/i.test(skill)
    );
    const isWebFocused = skills.some(skill => 
      /javascript|react|node|html|css|angular|vue/i.test(skill)
    );
    const isBackendFocused = skills.some(skill => 
      /java|spring|api|backend|server|database/i.test(skill)
    );

    // Job Role Suggestions
    const jobRoles = [
      {
        type: 'job_role',
        title: 'Full Stack Developer',
        description: 'Develop and maintain web applications using modern frameworks and technologies.',
        priority: 'high',
        category: 'Technology',
        estimatedTime: '6-12 months',
        skills: ['JavaScript', 'React', 'Node.js', 'HTML/CSS', 'REST APIs'],
        salaryRange: { min: 80000, max: 130000 },
        jobMarket: {
          demand: 'High',
          growth: '22% (Much faster than average)',
          competition: 'Moderate'
        },
        resources: [
          {
            title: 'Full Stack Open Course',
            url: 'https://fullstackopen.com/',
            type: 'Online Course'
          },
          {
            title: 'The Odin Project',
            url: 'https://www.theodinproject.com/',
            type: 'Learning Path'
          }
        ]
      },
      {
        type: 'job_role',
        title: 'Frontend Engineer',
        description: 'Design and implement beautiful, responsive web UIs.',
        priority: 'medium',
        category: 'Technology',
        estimatedTime: '4-8 months',
        skills: ['React', 'Vue', 'HTML', 'CSS', 'JavaScript'],
        salaryRange: { min: 70000, max: 110000 },
        jobMarket: {
          demand: 'High',
          growth: '18%',
          competition: 'Moderate'
        },
        resources: [
          {
            title: 'Frontend Masters',
            url: 'https://frontendmasters.com/',
            type: 'Online Course'
          }
        ]
      },
      {
        type: 'job_role',
        title: 'DevOps Engineer',
        description: 'Automate infrastructure and CI/CD pipelines to improve software delivery.',
        priority: 'medium',
        category: 'Infrastructure',
        estimatedTime: '6-10 months',
        skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'],
        salaryRange: { min: 90000, max: 140000 },
        jobMarket: {
          demand: 'Very High',
          growth: '25%',
          competition: 'Low'
        },
        resources: [
          {
            title: 'Learn DevOps: The Complete Kubernetes Course',
            url: 'https://www.udemy.com/course/learn-devops-the-complete-kubernetes-course/',
            type: 'Online Course'
          }
        ]
      }
    ];

    // Add Data Analyst role if data-focused
    if (isDataFocused) {
      jobRoles.push({
        type: 'job_role',
        title: 'Data Analyst',
        description: 'Analyze and interpret complex data to help organizations make better decisions.',
        priority: 'high',
        category: 'Data & Analytics',
        estimatedTime: '3-6 months',
        skills: ['SQL', 'Python', 'Data Visualization', 'Excel', 'Statistics'],
        salaryRange: { min: 65000, max: 110000 },
        jobMarket: {
          demand: 'Very High',
          growth: '25% (Much faster than average)',
          competition: 'High'
        },
        resources: [
          {
            title: 'Data Analysis with Python',
            url: 'https://www.coursera.org/learn/data-analysis-with-python',
            type: 'Online Course'
          }
        ]
      });
    }

    // Add Backend Developer role if backend-focused
    if (isBackendFocused) {
      jobRoles.push({
        type: 'job_role',
        title: 'Backend Developer',
        description: 'Design and implement server-side logic and database architecture.',
        priority: 'high',
        category: 'Technology',
        estimatedTime: '6-12 months',
        skills: ['Node.js', 'Python', 'Java', 'APIs', 'Database Design'],
        salaryRange: { min: 85000, max: 140000 },
        jobMarket: {
          demand: 'High',
          growth: '20% (Much faster than average)',
          competition: 'Moderate'
        },
        resources: [
          {
            title: 'Backend Developer Roadmap',
            url: 'https://roadmap.sh/backend',
            type: 'Learning Path'
          }
        ]
      });
    }

    // Skill Development Suggestions
    const skillSuggestions = [
      {
        type: 'skill_development',
        title: 'Cloud Computing',
        description: 'Learn cloud platforms like AWS, Azure, or Google Cloud to enhance your technical skillset.',
        priority: 'high',
        category: 'Technical Skills',
        estimatedTime: '2-4 months',
        skills: ['AWS', 'Cloud Architecture', 'DevOps', 'Containers'],
        resources: [
          {
            title: 'AWS Certified Cloud Practitioner',
            url: 'https://aws.amazon.com/certification/certified-cloud-practitioner/',
            type: 'Certification'
          }
        ]
      },
      {
        type: 'skill_development',
        title: 'Data Structures & Algorithms',
        description: 'Master fundamental computer science concepts to improve problem-solving skills.',
        priority: 'medium',
        category: 'Computer Science',
        estimatedTime: '3-6 months',
        skills: ['Algorithms', 'Data Structures', 'Problem Solving', 'Big O Notation'],
        resources: [
          {
            title: 'LeetCode',
            url: 'https://leetcode.com/',
            type: 'Practice Platform'
          },
          {
            title: 'Grokking Algorithms',
            url: 'https://www.manning.com/books/grokking-algorithms',
            type: 'Book'
          }
        ]
      },
      {
        type: 'skill_development',
        title: 'Machine Learning',
        description: 'Build, train, and deploy machine learning models using Python and open-source frameworks.',
        priority: 'medium',
        category: 'AI/ML',
        estimatedTime: '4-8 months',
        skills: ['Python', 'scikit-learn', 'TensorFlow', 'PyTorch'],
        resources: [
          {
            title: 'Coursera Machine Learning',
            url: 'https://www.coursera.org/learn/machine-learning',
            type: 'Online Course'
          }
        ]
      },
      {
        type: 'skill_development',
        title: 'Soft Skills for Engineers',
        description: 'Develop communication, teamwork, and leadership skills for career growth.',
        priority: 'low',
        category: 'Soft Skills',
        estimatedTime: '2-3 months',
        skills: ['Communication', 'Teamwork', 'Leadership'],
        resources: [
          {
            title: 'LinkedIn Learning: Communication Foundations',
            url: 'https://www.linkedin.com/learning/communication-foundations',
            type: 'Online Course'
          }
        ]
      }
    ];

    // Certification Recommendations
    const certifications = [
      {
        type: 'certification',
        title: 'Professional Scrum Master (PSM I)',
        description: 'Validates your knowledge of Scrum framework and ability to facilitate Scrum teams.',
        priority: 'medium',
        category: 'Agile & Project Management',
        estimatedTime: '1-2 months',
        skills: ['Scrum', 'Agile', 'Project Management'],
        resources: [
          {
            title: 'Scrum.org PSM I',
            url: 'https://www.scrum.org/assessments/professional-scrum-master-i-certification',
            type: 'Certification'
          }
        ]
      },
      {
        type: 'certification',
        title: 'Google Associate Cloud Engineer',
        description: 'Demonstrate your ability to deploy applications, monitor operations, and manage enterprise solutions on Google Cloud.',
        priority: 'high',
        category: 'Cloud',
        estimatedTime: '2-4 months',
        skills: ['Google Cloud', 'Cloud Architecture'],
        resources: [
          {
            title: 'Google Cloud Training',
            url: 'https://cloud.google.com/certification/cloud-engineer',
            type: 'Certification'
          }
        ]
      },
      {
        type: 'certification',
        title: 'Microsoft Certified: Azure Fundamentals',
        description: 'Demonstrate foundational knowledge of cloud concepts and Azure services.',
        priority: 'medium',
        category: 'Cloud',
        estimatedTime: '1-2 months',
        skills: ['Azure', 'Cloud Fundamentals'],
        resources: [
          {
            title: 'Microsoft Learn: Azure Fundamentals',
            url: 'https://learn.microsoft.com/en-us/certifications/azure-fundamentals/',
            type: 'Certification'
          }
        ]
      }
    ];

    // Add AWS Certification if backend or cloud skills
    if (isBackendFocused || isDataFocused) {
      certifications.push({
        type: 'certification',
        title: 'AWS Certified Developer - Associate',
        description: 'Demonstrate your expertise in developing and maintaining applications on AWS.',
        priority: 'high',
        category: 'Cloud Computing',
        estimatedTime: '2-3 months',
        skills: ['AWS', 'Cloud Development', 'Serverless', 'CI/CD'],
        resources: [
          {
            title: 'AWS Certified Developer Guide',
            url: 'https://aws.amazon.com/certification/certified-developer-associate/',
            type: 'Certification'
          }
        ]
      });
    }

    // Career Path
    const careerPath = [
      {
        step: 1,
        title: 'Junior Developer',
        description: 'Start as a junior developer to build foundational skills.',
        timeline: '0-2 years',
        requirements: [
          'Learn programming fundamentals',
          'Build portfolio projects',
          'Learn version control (Git)'
        ],
        outcomes: [
          'Basic coding proficiency',
          'Understanding of development workflows',
          'First professional experience'
        ]
      },
      {
        step: 2,
        title: 'Mid-level Developer',
        description: 'Take on more complex projects and responsibilities.',
        timeline: '2-5 years',
        requirements: [
          'Master a tech stack',
          'Learn system design',
          'Improve problem-solving skills'
        ],
        outcomes: [
          'Ability to build complete applications',
          'Mentorship of junior developers',
          'Specialized technical skills'
        ]
      },
      {
        step: 3,
        title: 'Senior Developer',
        description: 'Lead technical decisions and mentor junior team members.',
        timeline: '5+ years',
        requirements: [
          'Deep technical expertise',
          'System architecture knowledge',
          'Leadership skills'
        ],
        outcomes: [
          'Technical leadership',
          'Architectural decision making',
          'Team mentorship'
        ]
      },
      {
        step: 4,
        title: 'Technical Lead',
        description: 'Oversee technical direction, architecture, and mentor multiple teams.',
        timeline: '7+ years',
        requirements: [
          'Lead multiple projects',
          'Drive architectural decisions',
          'Mentor engineers'
        ],
        outcomes: [
          'Cross-team leadership',
          'Influence on technical strategy',
          'Organizational impact'
        ]
      },
      {
        step: 5,
        title: 'Engineering Manager',
        description: 'Manage engineering teams, hiring, and project delivery.',
        timeline: '10+ years',
        requirements: [
          'Management experience',
          'Project delivery',
          'Team building'
        ],
        outcomes: [
          'People management',
          'Strategic planning',
          'Business impact'
        ]
      }
    ];

    // Skill Gaps
    const skillGaps = [
      {
        skill: 'System Design',
        currentLevel: 'Beginner',
        targetLevel: 'Intermediate',
        importance: 'high',
        learningPath: [
          'Study system design principles',
          'Practice designing scalable systems',
          'Review case studies of popular systems'
        ]
      },
      {
        skill: 'Cloud Architecture',
        currentLevel: 'Beginner',
        targetLevel: 'Intermediate',
        importance: 'high',
        learningPath: [
          'Learn cloud service models (IaaS, PaaS, SaaS)',
          'Study cloud design patterns',
          'Practice with cloud provider free tiers'
        ]
      }
    ];

    // Industry Insights
    const industryInsights = {
      trendingSkills: [
        'Artificial Intelligence',
        'Cloud Computing',
        'Cybersecurity',
        'Data Science',
        'DevOps'
      ],
      emergingRoles: [
        'AI/ML Engineer',
        'Cloud Architect',
        'DevOps Engineer',
        'Data Scientist',
        'Cybersecurity Analyst'
      ],
      marketTrends: [
        `Remote work expected to grow by 30% in ${currentYear+1}`,
        'Cloud skills command 20-30% salary premium',
        'AI integration in 75% of enterprise applications',
        'Increased focus on cybersecurity across industries'
      ],
      salaryInsights: [
        `Tech salaries increased 5-10% in ${currentYear}`,
        'Senior developers earn $120k-$180k on average',
        'Cloud certifications increase salary by 15-25%',
        'AI/ML roles among highest paid in tech'
      ]
    };

    // Combine all suggestions
    const allSuggestions = [
      ...jobRoles,
      ...skillSuggestions,
      ...certifications
    ];

    // Validate the data structure before returning
    return {
      suggestions: allSuggestions.map(suggestion => ({
        ...suggestion,
        resources: Array.isArray(suggestion.resources) ? suggestion.resources : []
      })),
      careerPath,
      skillGaps,
      industryInsights
    };
  }
}

module.exports = AIResumeService;
