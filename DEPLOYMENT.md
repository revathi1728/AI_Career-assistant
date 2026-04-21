# 🚀 AI Career Portal - Deployment Guide

This guide covers multiple deployment options for your AI Career Portal, from simple hosting to enterprise-grade solutions.

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Setup

**Backend (.env in server/ directory):**
```bash
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-career-portal
OPENAI_API_KEY=sk-your-openai-api-key-here
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
NODE_ENV=production
```

**Frontend (.env in client/ directory):**
```bash
REACT_APP_API_URL=https://your-backend-domain.com/api
```

### 2. Database Setup
- **MongoDB Atlas** (Recommended for production)
- **Local MongoDB** (For development only)

### 3. OpenAI API Key
- Get your API key from [OpenAI Platform](https://platform.openai.com/)
- Ensure you have sufficient credits

---

## 🌐 Deployment Options

## Option 1: Heroku (Easiest - Full Stack)

### Prerequisites
- Heroku account
- Heroku CLI installed
- Git repository

### Steps

#### 1. Prepare for Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create Heroku app
heroku create your-app-name

# Add MongoDB Atlas addon (recommended)
heroku addons:create mongolab:sandbox
```

#### 2. Configure Environment Variables
```bash
# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-super-secret-jwt-key-here
heroku config:set OPENAI_API_KEY=sk-your-openai-api-key-here
heroku config:set MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-career-portal
```

#### 3. Create Heroku-specific files

**Create `Procfile` in root directory:**
```
web: cd server && npm start
```

**Update `server/package.json` scripts:**
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "heroku-postbuild": "cd ../client && npm install && npm run build"
  }
}
```

#### 4. Deploy
```bash
# Add and commit changes
git add .
git commit -m "Prepare for Heroku deployment"

# Deploy to Heroku
git push heroku main

# Open your app
heroku open
```

---

## Option 2: Vercel (Frontend) + Railway/Render (Backend)

### Frontend on Vercel

#### 1. Prepare Frontend
```bash
# Install Vercel CLI
npm install -g vercel

# Build the project
cd client
npm run build
```

#### 2. Deploy to Vercel
```bash
# From client directory
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name? ai-career-portal-client
# - Directory? ./
# - Override settings? N
```

#### 3. Configure Environment Variables in Vercel
- Go to your Vercel dashboard
- Select your project
- Go to Settings > Environment Variables
- Add: `REACT_APP_API_URL=https://your-backend-url.com/api`

### Backend on Railway

#### 1. Prepare Backend
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login
```

#### 2. Deploy to Railway
```bash
# From server directory
cd server
railway init
railway up

# Configure environment variables in Railway dashboard
```

---

## Option 3: DigitalOcean App Platform

### 1. Prepare Repository
- Push your code to GitHub
- Ensure all environment variables are documented

### 2. Deploy on DigitalOcean
1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub repository
4. Configure build settings:
   - **Backend**: Root directory `server/`, Build command `npm install`, Run command `npm start`
   - **Frontend**: Root directory `client/`, Build command `npm install && npm run build`, Output directory `build`
5. Add environment variables
6. Deploy

---

## Option 4: AWS (Advanced)

### Using AWS Elastic Beanstalk + S3

#### 1. Prepare for AWS
```bash
# Install AWS CLI
npm install -g aws-cli

# Configure AWS credentials
aws configure
```

#### 2. Deploy Backend to Elastic Beanstalk
```bash
# Install EB CLI
pip install awsebcli

# Initialize EB
cd server
eb init

# Create environment
eb create production

# Deploy
eb deploy
```

#### 3. Deploy Frontend to S3
```bash
# Build frontend
cd client
npm run build

# Create S3 bucket
aws s3 mb s3://your-app-name-frontend

# Upload build files
aws s3 sync build/ s3://your-app-name-frontend --delete

# Configure static website hosting
aws s3 website s3://your-app-name-frontend --index-document index.html
```

---

## Option 5: Docker Deployment

### 1. Create Dockerfile for Backend
**Create `server/Dockerfile`:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

### 2. Create Dockerfile for Frontend
**Create `client/Dockerfile`:**
```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 3. Create docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: ./server
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/ai-career-portal
      - JWT_SECRET=your-jwt-secret
      - OPENAI_API_KEY=your-openai-key
    depends_on:
      - mongo

  frontend:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - backend

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

### 4. Deploy with Docker
```bash
# Build and run
docker-compose up -d

# Or deploy to cloud with Docker
# (AWS ECS, Google Cloud Run, Azure Container Instances)
```

---

## 🔧 Production Optimizations

### 1. Performance Optimizations
```bash
# Install compression middleware
cd server
npm install compression

# Add to server/index.js
const compression = require('compression');
app.use(compression());
```

### 2. Security Enhancements
```bash
# Install additional security packages
npm install express-validator express-slow-down
```

### 3. Monitoring Setup
```bash
# Install monitoring tools
npm install morgan winston
```

### 4. SSL/HTTPS Setup
- Use Cloudflare for free SSL
- Or configure SSL certificates on your hosting platform

---

## 📊 Monitoring & Maintenance

### 1. Health Checks
Your app already has a health check endpoint: `/api/health`

### 2. Logging
- Use Winston for structured logging
- Set up log aggregation (Loggly, Papertrail)

### 3. Error Tracking
- Integrate Sentry for error monitoring
- Set up uptime monitoring (UptimeRobot, Pingdom)

### 4. Database Monitoring
- Monitor MongoDB Atlas metrics
- Set up database backups

---

## 🚨 Common Deployment Issues & Solutions

### 1. Environment Variables
**Issue**: Environment variables not loading
**Solution**: Ensure all variables are set in your hosting platform

### 2. CORS Issues
**Issue**: Frontend can't connect to backend
**Solution**: Update CORS configuration in `server/index.js`

### 3. File Upload Issues
**Issue**: File uploads failing in production
**Solution**: Use cloud storage (AWS S3, Cloudinary) instead of local storage

### 4. Build Failures
**Issue**: Frontend build failing
**Solution**: Check Node.js version compatibility, update dependencies

---

## 🎯 Recommended Deployment Strategy

### For Beginners:
1. **Heroku** - Easiest full-stack deployment
2. **Vercel + Railway** - Modern, developer-friendly

### For Production:
1. **DigitalOcean App Platform** - Good balance of simplicity and control
2. **AWS Elastic Beanstalk + S3** - Enterprise-grade scalability

### For Advanced Users:
1. **Docker + Kubernetes** - Maximum control and scalability
2. **AWS ECS/Fargate** - Serverless container deployment

---

## 📞 Support

If you encounter issues during deployment:

1. Check the console logs in your hosting platform
2. Verify all environment variables are set correctly
3. Ensure your MongoDB connection string is valid
4. Test your OpenAI API key
5. Check the health endpoint: `https://your-domain.com/api/health`

---

**Happy Deploying! 🚀**

