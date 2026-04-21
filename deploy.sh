#!/bin/bash

# AI Career Portal Deployment Script
# This script helps you deploy your application to various platforms

echo "🚀 AI Career Portal Deployment Script"
echo "======================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to deploy to Heroku
deploy_heroku() {
    echo "📦 Deploying to Heroku..."
    
    if ! command_exists heroku; then
        echo "❌ Heroku CLI not found. Please install it first:"
        echo "   npm install -g heroku"
        exit 1
    fi
    
    # Check if already logged in
    if ! heroku auth:whoami >/dev/null 2>&1; then
        echo "🔐 Please login to Heroku:"
        heroku login
    fi
    
    # Create app if it doesn't exist
    if [ -z "$HEROKU_APP_NAME" ]; then
        read -p "Enter your Heroku app name: " HEROKU_APP_NAME
    fi
    
    # Create or link to existing app
    if heroku apps:info $HEROKU_APP_NAME >/dev/null 2>&1; then
        echo "📎 Linking to existing app: $HEROKU_APP_NAME"
        heroku git:remote -a $HEROKU_APP_NAME
    else
        echo "🆕 Creating new Heroku app: $HEROKU_APP_NAME"
        heroku create $HEROKU_APP_NAME
    fi
    
    # Set environment variables
    echo "⚙️  Setting environment variables..."
    heroku config:set NODE_ENV=production
    heroku config:set JWT_SECRET=$(openssl rand -base64 32)
    
    # Prompt for other environment variables
    read -p "Enter your MongoDB URI: " MONGODB_URI
    read -p "Enter your OpenAI API Key: " OPENAI_API_KEY
    
    heroku config:set MONGODB_URI="$MONGODB_URI"
    heroku config:set OPENAI_API_KEY="$OPENAI_API_KEY"
    
    # Deploy
    echo "🚀 Deploying to Heroku..."
    git add .
    git commit -m "Deploy to Heroku" || echo "No changes to commit"
    git push heroku main
    
    echo "✅ Deployment complete!"
    echo "🌐 Your app is available at: https://$HEROKU_APP_NAME.herokuapp.com"
}

# Function to deploy with Docker
deploy_docker() {
    echo "🐳 Deploying with Docker..."
    
    if ! command_exists docker; then
        echo "❌ Docker not found. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        echo "❌ Docker Compose not found. Please install Docker Compose first."
        exit 1
    fi
    
    # Set environment variables
    export OPENAI_API_KEY=${OPENAI_API_KEY:-"your-openai-api-key"}
    
    # Build and run
    docker-compose up -d --build
    
    echo "✅ Docker deployment complete!"
    echo "🌐 Your app is available at: http://localhost"
    echo "🔧 Backend API: http://localhost:5000"
}

# Function to deploy frontend to Vercel
deploy_vercel() {
    echo "▲ Deploying frontend to Vercel..."
    
    if ! command_exists vercel; then
        echo "❌ Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    cd client
    
    # Build the project
    echo "🔨 Building frontend..."
    npm run build
    
    # Deploy to Vercel
    echo "🚀 Deploying to Vercel..."
    vercel --prod
    
    cd ..
    
    echo "✅ Vercel deployment complete!"
}

# Function to deploy backend to Railway
deploy_railway() {
    echo "🚂 Deploying backend to Railway..."
    
    if ! command_exists railway; then
        echo "❌ Railway CLI not found. Installing..."
        npm install -g @railway/cli
    fi
    
    cd server
    
    # Login to Railway
    railway login
    
    # Deploy
    railway up
    
    cd ..
    
    echo "✅ Railway deployment complete!"
}

# Main menu
echo ""
echo "Select deployment option:"
echo "1) Deploy to Heroku (Full Stack)"
echo "2) Deploy with Docker (Local)"
echo "3) Deploy Frontend to Vercel"
echo "4) Deploy Backend to Railway"
echo "5) Exit"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        deploy_heroku
        ;;
    2)
        deploy_docker
        ;;
    3)
        deploy_vercel
        ;;
    4)
        deploy_railway
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment process completed!"
echo "📖 For more detailed instructions, see DEPLOYMENT.md"

