#!/bin/bash

# Collaborative Diagramming App Setup Script
# This script helps you set up the application with proper configuration

set -e  # Exit on any error

echo "🚀 Collaborative Diagramming App Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_status "Creating .env file from example..."
    cp .env.example .env
    print_success ".env file created"
else
    print_warning ".env file already exists, skipping creation"
fi

# Generate secure SECRET_KEY if not set
if ! grep -q "SECRET_KEY=.*[a-fA-F0-9]" .env || grep -q "SECRET_KEY=your-super-secret-key" .env; then
    print_status "Generating secure SECRET_KEY..."
    
    # Try different methods to generate secure key
    if command -v openssl &> /dev/null; then
        SECRET_KEY=$(openssl rand -hex 32)
    elif command -v python3 &> /dev/null; then
        SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    elif command -v python &> /dev/null; then
        SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
    else
        # Fallback to a random string (less secure)
        SECRET_KEY=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
        print_warning "Using fallback random key generation. Consider using openssl or python for better security."
    fi
    
    # Update the SECRET_KEY in .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
    else
        # Linux
        sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
    fi
    
    print_success "Secure SECRET_KEY generated and saved to .env"
else
    print_success "SECRET_KEY already configured"
fi

# Check for required tools
print_status "Checking requirements..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_success "All requirements satisfied"

# Ask user for optional configuration
echo ""
echo "🔧 Optional Configuration"
echo "========================"

read -p "Do you have a Google Gemini API key for AI features? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Get your API key from: https://makersuite.google.com/app/apikey"
    read -p "Enter your Gemini API key: " GEMINI_KEY
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$GEMINI_KEY/" .env
    else
        sed -i "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$GEMINI_KEY/" .env
    fi
    print_success "Gemini API key configured"
fi

# Ask about deployment type
echo ""
read -p "Start the application now? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    print_status "Starting application with Docker Compose..."
    
    # Start the application
    docker-compose up --build -d
    
    print_success "Application started successfully!"
    echo ""
    echo "🌟 Your Collaborative Diagramming App is ready!"
    echo "=============================================="
    echo "🖥️  Frontend:     http://localhost:3000"
    echo "🔧  Backend API:  http://localhost:8000"  
    echo "📚  API Docs:     http://localhost:8000/docs"
    echo "🗄️  MongoDB:      localhost:27017"
    echo ""
    echo "📝 To view logs: docker-compose logs -f"
    echo "⏹️  To stop:     docker-compose down"
    echo ""
    echo "Next steps:"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Create a new user account"
    echo "3. Start creating diagrams!"
else
    print_success "Setup completed! You can start the application later with:"
    echo "   docker-compose up --build"
fi

echo ""
print_success "Setup script completed successfully!"
