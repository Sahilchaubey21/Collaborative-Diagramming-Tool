# 🚀 Collaborative Diagramming App - Setup Guide

## 📋 **Prerequisites**
- Docker and Docker Compose installed
- Node.js 18+ (if running frontend locally)
- Python 3.11+ (if running backend locally)

## 🔧 **Required Configuration**

### **1. Environment Variables Setup**

Copy the example environment file:
```bash
cp .env.example .env
```

Then edit `.env` with your values:

#### **🔑 CRITICAL - Security Keys**
```bash
# Generate a secure secret key for JWT tokens
SECRET_KEY=your-super-secret-key-change-this-in-production

# To generate a secure key, run:
openssl rand -hex 32
```

#### **🗄️ Database Configuration**
```bash
# MongoDB connection (default works for Docker setup)
MONGO_URL=mongodb://localhost:27017
DATABASE_NAME=diagramming_app
```

#### **🤖 AI Features (Optional)**
```bash
# Get API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key-here
```

#### **🖥️ Frontend Configuration**
```bash
# Backend API URL
REACT_APP_API_URL=http://localhost:8000
```

## 🐳 **Docker Setup (Recommended)**

### **Quick Start**
```bash
# 1. Clone/navigate to project directory
cd /path/to/collaborative-diagramming-app

# 2. Copy environment configuration
cp .env.example .env

# 3. Edit .env with your values (especially SECRET_KEY!)
nano .env

# 4. Build and start all services
docker-compose up --build
```

### **Services Started:**
- **MongoDB**: Port 27017 (database)
- **Backend API**: Port 8000 (FastAPI server)
- **Frontend**: Port 3000 (React app)

### **Access the Application:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔧 **Manual Setup (Alternative)**

### **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
export SECRET_KEY="your-secret-key-here"
export MONGO_URL="mongodb://localhost:27017"
export DATABASE_NAME="diagramming_app"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### **Frontend Setup**
```bash
cd frontend
npm install
export REACT_APP_API_URL="http://localhost:8000"
npm start
```

### **MongoDB Setup**
```bash
# Install MongoDB locally or use Docker:
docker run -d -p 27017:27017 --name mongodb mongo:7-jammy
```

## 🔐 **Security Configuration**

### **1. Generate Secure SECRET_KEY**
```bash
# Method 1: Using OpenSSL
openssl rand -hex 32

# Method 2: Using Python
python -c "import secrets; print(secrets.token_hex(32))"

# Method 3: Online generator
# Visit: https://generate-secret.vercel.app/32
```

### **2. Update Environment Variables**
```bash
# Edit your .env file
SECRET_KEY=<your-generated-32-character-hex-key>
```

## 🚀 **Production Deployment**

### **Environment Variables for Production:**
```bash
# Security
SECRET_KEY=<64-character-production-secret-key>
MONGO_URL=mongodb://your-production-mongodb-url:27017
DATABASE_NAME=diagramming_app_prod

# Frontend
REACT_APP_API_URL=https://your-api-domain.com

# Optional
GEMINI_API_KEY=your-production-gemini-key
```

### **Docker Production Build:**
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start with production configuration
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 **Database Setup**

The application automatically:
- Connects to MongoDB on startup
- Creates required indexes
- Sets up collections: `users`, `diagrams`, `chat_messages`

## 🧪 **Testing Setup**

### **Test the Backend API:**
```bash
curl http://localhost:8000/health
```

### **Test User Registration:**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}'
```

## 🔧 **Configuration Options**

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | ⚠️ **REQUIRED** | JWT signing secret |
| `MONGO_URL` | `mongodb://localhost:27017` | MongoDB connection |
| `DATABASE_NAME` | `diagramming_app` | Database name |
| `GEMINI_API_KEY` | Optional | AI features key |
| `REACT_APP_API_URL` | `http://localhost:8000` | Backend API URL |

## 🎯 **Features Available After Setup**

- ✅ User registration and authentication
- ✅ Create and manage diagrams
- ✅ Real-time collaborative drawing
- ✅ Chat functionality
- ✅ Multiple drawing tools (pen, shapes, text)
- ✅ Diagram sharing and permissions
- ✅ AI-powered features (with Gemini API key)

## 🆘 **Troubleshooting**

### **Common Issues:**

1. **MongoDB Connection Failed**
   ```bash
   # Check if MongoDB is running
   docker ps | grep mongo
   ```

2. **JWT Token Issues**
   ```bash
   # Ensure SECRET_KEY is set and consistent
   echo $SECRET_KEY
   ```

3. **Frontend API Connection**
   ```bash
   # Check REACT_APP_API_URL is correct
   echo $REACT_APP_API_URL
   ```

4. **Port Conflicts**
   ```bash
   # Check if ports are available
   netstat -tlnp | grep :3000
   netstat -tlnp | grep :8000
   ```

## 📝 **Next Steps After Setup**

1. **Create your first account** at http://localhost:3000
2. **Create a new diagram** and test drawing tools
3. **Open the same diagram** in multiple browser tabs to test collaboration
4. **Try the chat feature** for real-time communication
5. **Explore the API documentation** at http://localhost:8000/docs

---

## 🔗 **Useful Commands**

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart specific service
docker-compose restart backend

# View database
docker exec -it <mongodb-container> mongosh

# Clean rebuild
docker-compose down -v && docker-compose up --build
```
