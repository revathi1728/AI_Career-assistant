# AI Career Portal - Setup Guide

## 🚀 Quick Start

This AI-powered career assistance portal helps users enhance their resumes and get personalized career suggestions using OpenAI's API.

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- OpenAI API key

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Environment Setup

**Backend (.env file in server/ directory):**
```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-career-portal
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=development
```

**Frontend (.env file in client/ directory):**
```bash
REACT_APP_API_URL=http://localhost:5000/api
```

### 3. Database Setup

Make sure MongoDB is running on your system:
```bash
# Start MongoDB (if installed locally)
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env with your Atlas connection string
```

### 4. OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and get your API key
3. Add it to your server/.env file

## 🚀 Running the Application

### Development Mode

```bash
# From root directory - runs both frontend and backend
npm run dev

# Or run separately:
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend  
cd client && npm start
```

### Production Mode

```bash
# Build frontend
cd client && npm run build

# Start production server
cd server && npm start
```

## 📁 Project Structure

```
ai-career-portal/
├── client/                 # React.js frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main application pages
│   │   ├── services/      # API service functions
│   │   ├── contexts/      # React contexts
│   │   └── styles/        # CSS/styling files
│   └── public/
├── server/                 # Node.js backend
│   ├── controllers/       # Route controllers
│   ├── models/           # MongoDB models
│   ├── middleware/       # Custom middleware
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   └── utils/            # Utility functions
└── docs/                 # Documentation
```

## 🔧 Features

### ✅ Implemented Features

- **User Authentication**: Register, login, profile management
- **Resume Upload**: Support for PDF, DOC, DOCX, TXT files
- **AI Resume Analysis**: Extract and parse resume content using OpenAI
- **Resume Enhancement**: AI-powered content improvement suggestions
- **Career Suggestions**: Personalized career recommendations
- **Skill Gap Analysis**: Identify missing skills and learning paths
- **Dashboard**: Overview of resumes, scores, and suggestions
- **Modern UI**: Responsive design with Tailwind CSS

### 🎯 Key Components

1. **Resume Processing**
   - File upload with drag & drop
   - Text extraction from various formats
   - AI-powered content parsing

2. **AI Analysis**
   - Resume scoring (0-100)
   - Strengths and weaknesses identification
   - Improvement suggestions

3. **Career Intelligence**
   - Job role recommendations
   - Skill development paths
   - Industry insights
   - Salary range predictions

4. **User Experience**
   - Intuitive dashboard
   - Real-time progress tracking
   - Mobile-responsive design

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Resume Management
- `POST /api/resume/upload` - Upload resume file
- `GET /api/resume` - Get user's resumes
- `GET /api/resume/:id` - Get specific resume
- `POST /api/resume/:id/analyze` - Analyze resume with AI
- `POST /api/resume/:id/enhance` - Enhance resume content
- `DELETE /api/resume/:id` - Delete resume

### Career Suggestions
- `POST /api/career/generate/:resumeId` - Generate career suggestions
- `GET /api/career` - Get user's suggestions
- `GET /api/career/:id` - Get specific suggestion
- `PUT /api/career/:id` - Update suggestion
- `POST /api/career/:id/refresh` - Refresh suggestions

### User Dashboard
- `GET /api/user/dashboard` - Get dashboard data
- `GET /api/user/stats` - Get user statistics
- `PUT /api/user/preferences` - Update preferences
- `GET /api/user/activity` - Get activity log

## 🎨 UI Components

Built with modern React.js and Tailwind CSS:

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Mode**: Automatic theme detection
- **Loading States**: Smooth loading animations
- **Error Handling**: User-friendly error messages
- **Form Validation**: Real-time input validation

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers

## 📊 AI Integration

### OpenAI GPT Integration
- Resume content extraction and parsing
- Intelligent analysis and scoring
- Career suggestion generation
- Content enhancement recommendations

### AI Features
- Natural language processing for resume analysis
- Context-aware career recommendations
- Industry-specific insights
- Personalized learning paths

## 🚀 Deployment

### Heroku Deployment
```bash
# Install Heroku CLI
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set OPENAI_API_KEY=your_openai_key
heroku config:set JWT_SECRET=your_jwt_secret

# Deploy
git push heroku main
```

### Vercel Deployment (Frontend)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd client
vercel
```

## 🧪 Testing

```bash
# Run backend tests
cd server && npm test

# Run frontend tests
cd client && npm test
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

If you encounter any issues:

1. Check the console for error messages
2. Verify your environment variables
3. Ensure MongoDB is running
4. Check OpenAI API key validity

## 🔮 Future Enhancements

- [ ] Job application tracking
- [ ] Interview preparation tools
- [ ] Networking recommendations
- [ ] Salary negotiation tips
- [ ] Industry trend analysis
- [ ] Resume templates
- [ ] Cover letter generation
- [ ] LinkedIn profile optimization

---

**Happy coding! 🎉**
