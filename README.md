# AI Career Assistance Portal

An intelligent career assistance platform that helps users enhance their resumes and get AI-powered career suggestions.

## Features

- 📄 **Resume Upload & Analysis**: Upload PDF/DOC resumes and extract key information
- 🤖 **AI-Powered Enhancement**: Get suggestions to improve your resume content
- 💼 **Career Suggestions**: Receive personalized career recommendations based on your profile
- 📊 **Skills Analysis**: Identify strengths and areas for improvement
- 🎯 **Job Matching**: Find relevant job opportunities based on your skills
- 📈 **Progress Tracking**: Track your career development over time

## Tech Stack

- **Frontend**: React.js with modern UI components
- **Backend**: Node.js + Express.js
- **Database**: MongoDB
- **AI Integration**: OpenAI API
- **File Processing**: Multer for file uploads, PDF parsing libraries

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install-all
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both `server/` and `client/` directories
   - Add your MongoDB connection string and OpenAI API key

4. Start the development servers:
   ```bash
   npm run dev
   ```

### Environment Variables

**Server (.env):**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-career-portal
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_jwt_secret_here
```

**Client (.env):**
```
REACT_APP_API_URL=http://localhost:5000/api
```

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/resume/upload` - Upload resume file
- `POST /api/resume/analyze` - Analyze resume content
- `POST /api/resume/enhance` - Get AI-powered resume suggestions
- `GET /api/career/suggestions` - Get career recommendations
- `GET /api/jobs/search` - Search for relevant jobs

## Project Structure

```
ai-career-portal/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main application pages
│   │   ├── services/      # API service functions
│   │   ├── utils/         # Utility functions
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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
