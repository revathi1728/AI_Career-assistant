const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// OpenAI configuration check: allow missing API key when OPENAI_ENABLED is explicitly disabled
const OPENAI_ENABLED = process.env.OPENAI_ENABLED !== 'false';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (OPENAI_ENABLED) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.startsWith('your_')) {
    console.error('\nERROR: OPENAI_API_KEY is missing or invalid but OPENAI is enabled.');
    console.error('Set a valid OpenAI API key in `server/.env` as OPENAI_API_KEY=sk-xxxx or set the environment variable.');
    console.error('You can get a key from https://platform.openai.com/account/api-keys\n');
    // Exit to avoid repeated runtime OpenAI authentication errors
    process.exit(1);
  }
} else {
  console.warn('OPENAI_ENABLED is false; the server will run in development mode with AI features disabled or mocked.');
}

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const careerRoutes = require('./routes/career');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting - more permissive for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000 // 1000 requests for dev, 100 for production
});
app.use(limiter);

// CORS configuration
// CORS configuration
// Allow common dev origins (3000, 3001, 3002) or your production domain.
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://yourdomain.com']
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    // not allowed
    return callback(new Error('CORS policy: Origin not allowed'), false);
  },
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
