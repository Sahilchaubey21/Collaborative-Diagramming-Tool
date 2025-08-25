
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from . import websocket, ai_service, auth, diagrams, chat
from .db import connect_to_mongo, close_mongo_connection

# Database connection lifecycle management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[DEBUG] FastAPI application starting up...")
    await connect_to_mongo()
    print("[DEBUG] FastAPI application startup complete")
    yield
    # Shutdown
    print("[DEBUG] FastAPI application shutting down...")
    await close_mongo_connection()
    print("[DEBUG] FastAPI application shutdown complete")

# Create FastAPI app with lifespan events
app = FastAPI(
    title="Collaborative Diagramming API",
    description="A real-time collaborative diagramming application with MongoDB integration",
    version="1.0.0",
    lifespan=lifespan
)

print("[DEBUG] FastAPI app created successfully")

# CORS middleware
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# Include routers
app.include_router(auth.router)
app.include_router(diagrams.router)
app.include_router(chat.router)
app.include_router(websocket.router)
app.include_router(ai_service.router)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    print("[DEBUG] Health check endpoint called")
    return {"status": "healthy", "message": "Collaborative Diagramming API is running"}

# WebSocket health check endpoint
@app.get("/health/websocket")
async def websocket_health_check():
    """WebSocket health check endpoint"""
    print("[DEBUG] WebSocket health check endpoint called")
    return {
        "status": "healthy", 
        "websocket_endpoint": "/ws/{diagram_id}",
        "message": "WebSocket functionality is available",
        "test_instructions": {
            "connect": "ws://localhost:8000/ws/{diagram_id}?token={jwt_token}",
            "send_message": {
                "type": "chat_message",
                "data": {
                    "message": "Hello World",
                    "user": "test_user"
                }
            }
        }
    }

# API Status endpoint with detailed system info
@app.get("/status")
async def system_status():
    """Detailed system status endpoint"""
    print("[DEBUG] System status endpoint called")
    try:
        # Test database connection
        from .db import mongodb
        db_status = "connected" if mongodb.database is not None else "disconnected"
    except:
        db_status = "error"
    
    return {
        "api": {
            "status": "running",
            "version": "1.0.0"
        },
        "database": {
            "status": db_status,
            "name": "diagramming_app"
        },
        "websocket": {
            "status": "available",
            "endpoint": "/ws/{diagram_id}"
        },
        "endpoints": {
            "auth": ["/auth/register", "/auth/login"],
            "diagrams": ["/diagrams", "/diagrams/{id}"],
            "chat": ["/chat/messages/{diagram_id}"],
            "websocket": ["/ws/{diagram_id}"],
            "ai": ["/ai/enhance", "/ai/suggest"]
        }
    }

# Root endpoint
@app.get("/")
async def root():
    print("[DEBUG] Root endpoint called")
    return {
        "message": "Collaborative Diagramming API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }

# Debug WebSocket connections endpoint
@app.get("/debug/websockets")
async def debug_websockets():
    """Debug endpoint to see active WebSocket connections"""
    from .websocket import manager
    
    connections_info = {}
    for diagram_id, connections in manager.active_connections.items():
        connections_info[diagram_id] = {
            "connection_count": len(connections),
            "users": []
        }
        
        for conn in connections:
            if conn in manager.connection_users:
                user = manager.connection_users[conn]
                connections_info[diagram_id]["users"].append({
                    "username": user["username"],
                    "user_id": str(user["_id"])
                })
    
    return {
        "total_diagrams": len(manager.active_connections),
        "connections_by_diagram": connections_info,
        "message": "Active WebSocket connections"
    }
