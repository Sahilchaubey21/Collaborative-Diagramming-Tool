# Collaborative Diagramming Tool

This project is a real-time, AI-assisted collaborative diagramming web application. It features a FastAPI backend with WebSocket support, a React.js frontend with unified navigation, and supports real-time drawing, AI-powered diagram cleaning, authentication, and diagram storage.

## Structure
- `backend/`: FastAPI server with WebSocket support, AI service, authentication, and database logic
- `frontend/`: React.js app with unified header navigation, canvas, UI, and API communication

## Recent Updates
- ✅ Cleaned up all test files from the project root
- ✅ Implemented unified header navigation across all components
- ✅ Enhanced WebSocket functionality with improved real-time messaging
- ✅ Added comprehensive health check endpoints (`/health`, `/status`, `/health/websocket`)
- ✅ Added Docker ignore files to optimize build contexts
- ✅ Removed Python cache files

## Docker Configuration
- `docker-compose.yml`: Development environment with hot reloading
- `docker-compose.prod.yml`: Production environment with optimizations

## Health Endpoints
- `GET /health`: Basic API health check
- `GET /status`: Comprehensive system status including database and WebSocket
- `GET /health/websocket`: WebSocket-specific health check with test instructions

See each folder's README for more details.

## How to Run This Project

1. **Install frontend dependencies:**

   ```bash
   cd frontend
   npm install
   ```

2. **Return to the project root:**

   ```bash
   cd ..
   ```

3. **Build and start all services using Docker Compose:**

   ```bash
   docker-compose up --build
   ```

This will install the frontend dependencies and start all services defined in your `docker-compose.yml`.
