from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator, Dict, Set
import json
import asyncio
import logging
from datetime import datetime
from .auth import get_current_user
from .db import get_database
from .models import User

router = APIRouter()

# Store active SSE connections by diagram_id
active_sse_connections: Dict[str, Set[AsyncGenerator]] = {}
logger = logging.getLogger(__name__)

class SSEManager:
    def __init__(self):
        self.connections: Dict[str, Set[AsyncGenerator]] = {}
    
    async def add_connection(self, diagram_id: str, generator: AsyncGenerator):
        if diagram_id not in self.connections:
            self.connections[diagram_id] = set()
        self.connections[diagram_id].add(generator)
        logger.info(f"SSE connection added for diagram {diagram_id}. Total: {len(self.connections[diagram_id])}")
    
    async def remove_connection(self, diagram_id: str, generator: AsyncGenerator):
        if diagram_id in self.connections:
            self.connections[diagram_id].discard(generator)
            if not self.connections[diagram_id]:
                del self.connections[diagram_id]
            logger.info(f"SSE connection removed for diagram {diagram_id}")
    
    async def broadcast_to_diagram(self, diagram_id: str, message: dict):
        if diagram_id not in self.connections:
            return
        
        message_str = json.dumps(message)
        dead_connections = []
        
        for generator in self.connections[diagram_id].copy():
            try:
                await generator.asend(f"data: {message_str}\n\n")
                logger.info(f"SSE message sent to connection for diagram {diagram_id}")
            except Exception as e:
                logger.error(f"SSE connection error: {e}")
                dead_connections.append(generator)
        
        # Remove dead connections
        for dead_conn in dead_connections:
            await self.remove_connection(diagram_id, dead_conn)

sse_manager = SSEManager()

async def event_stream(diagram_id: str, user: User):
    """Generate Server-Sent Events for real-time updates"""
    
    async def event_generator():
        try:
            # Send initial connection message
            yield f"data: {json.dumps({'type': 'connected', 'message': 'SSE connection established'})}\n\n"
            
            # Keep connection alive
            while True:
                try:
                    # Send heartbeat every 30 seconds
                    yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
                    await asyncio.sleep(30)
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"SSE generator error: {e}")
                    break
        finally:
            await sse_manager.remove_connection(diagram_id, event_generator)
    
    generator = event_generator()
    await sse_manager.add_connection(diagram_id, generator)
    return generator

@router.get("/sse/diagram/{diagram_id}")
async def sse_endpoint(diagram_id: str, current_user: User = Depends(get_current_user)):
    """Server-Sent Events endpoint for real-time diagram updates"""
    
    logger.info(f"SSE connection request from {current_user.username} for diagram {diagram_id}")
    
    # Verify diagram access (similar to WebSocket verification)
    db = get_database()
    try:
        from bson import ObjectId
        diagram = await db.diagrams.find_one({"_id": ObjectId(diagram_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid diagram ID")
    
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    
    # Check access permissions
    user_id = str(current_user.id)
    user_email = current_user.email
    
    has_access = (
        diagram["user_id"] == user_id or 
        diagram.get("is_public", False) or 
        user_id in diagram.get("collaborators", []) or
        user_email in diagram.get("collaborators", [])
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied to this diagram")
    
    # Create event stream
    generator = await event_stream(diagram_id, current_user)
    
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )

# Function to broadcast messages (to be called from chat.py)
async def broadcast_chat_message(diagram_id: str, message: dict):
    """Broadcast chat message to all SSE connections for a diagram"""
    await sse_manager.broadcast_to_diagram(diagram_id, {
        "type": "chat_message",
        "data": message
    })

# Function to broadcast canvas updates (to be called from diagrams.py)
async def broadcast_canvas_update(diagram_id: str, update: dict):
    """Broadcast canvas update to all SSE connections for a diagram"""
    await sse_manager.broadcast_to_diagram(diagram_id, {
        "type": "canvas_update",
        "data": update
    })
