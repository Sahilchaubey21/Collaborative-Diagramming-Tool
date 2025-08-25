from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from typing import Dict, List, Set, Optional
import json
import logging
import asyncio
from datetime import datetime
from bson import ObjectId

from .models import DrawingAction, CanvasState, ChatMessage
from .db import get_database
from .auth import get_current_user

router = APIRouter()

# Connection manager for WebSocket connections
class ConnectionManager:
    def __init__(self):
        # Store active connections by diagram_id
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Store user info for each connection
        self.connection_users: Dict[WebSocket, dict] = {}
    
    async def connect(self, websocket: WebSocket, diagram_id: str, user: dict):
        await websocket.accept()
        print(f"[DEBUG] WebSocket accepted for user {user['username']} in diagram {diagram_id}")
        
        if diagram_id not in self.active_connections:
            self.active_connections[diagram_id] = []
            print(f"[DEBUG] Created new connection list for diagram {diagram_id}")
        
        self.active_connections[diagram_id].append(websocket)
        self.connection_users[websocket] = user
        print(f"[DEBUG] Added connection. Total connections for diagram {diagram_id}: {len(self.active_connections[diagram_id])}")
        
        # Notify others about new user joining
        await self.broadcast_to_diagram(diagram_id, {
            "type": "user_joined",
            "user": {
                "id": str(user["_id"]),
                "username": user["username"]
            },
            "timestamp": datetime.utcnow().isoformat()
        }, exclude=websocket)
    
    def disconnect(self, websocket: WebSocket, diagram_id: str):
        if diagram_id in self.active_connections:
            if websocket in self.active_connections[diagram_id]:
                self.active_connections[diagram_id].remove(websocket)
                
                # Notify others about user leaving
                if websocket in self.connection_users:
                    user = self.connection_users[websocket]
                    asyncio.create_task(self.broadcast_to_diagram(diagram_id, {
                        "type": "user_left",
                        "user": {
                            "id": str(user["_id"]),
                            "username": user["username"]
                        },
                        "timestamp": datetime.utcnow().isoformat()
                    }))
                    del self.connection_users[websocket]
            
            # Remove empty diagram rooms
            if not self.active_connections[diagram_id]:
                del self.active_connections[diagram_id]
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast_to_diagram(self, diagram_id: str, message: dict, exclude: Optional[WebSocket] = None):
        if diagram_id in self.active_connections:
            message_str = json.dumps(message)
            print(f"[DEBUG] Broadcasting message to {len(self.active_connections[diagram_id])} connections in diagram {diagram_id}")
            print(f"[DEBUG] Message type: {message.get('type', 'unknown')}")
            
            successful_sends = 0
            failed_sends = 0
            
            for connection in self.active_connections[diagram_id]:
                # Don't exclude anyone for chat messages to ensure all users get updates
                if exclude is None or connection != exclude:
                    try:
                        await connection.send_text(message_str)
                        successful_sends += 1
                        print(f"[DEBUG] Message sent to connection successfully")
                    except Exception as e:
                        failed_sends += 1
                        print(f"[DEBUG] Failed to send message to connection: {e}")
                        # Connection might be closed, will be cleaned up later
                        pass
            
            print(f"[DEBUG] Broadcast complete: {successful_sends} successful, {failed_sends} failed")
        else:
            print(f"[DEBUG] No active connections found for diagram {diagram_id}")
    
    def get_diagram_users(self, diagram_id: str) -> List[dict]:
        """Get list of active users in a diagram"""
        if diagram_id not in self.active_connections:
            return []
        
        users = []
        for connection in self.active_connections[diagram_id]:
            if connection in self.connection_users:
                user = self.connection_users[connection]
                users.append({
                    "id": str(user["_id"]),
                    "username": user["username"]
                })
        return users

# Global connection manager instance
manager = ConnectionManager()

async def verify_diagram_access(diagram_id: str, user: dict):
    """Verify that user has access to the diagram"""
    db = get_database()
    
    try:
        diagram = await db.diagrams.find_one({"_id": ObjectId(diagram_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid diagram ID")
    
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    
    # Check if user has access
    user_id = str(user["_id"])
    user_email = user.get("email", "")
    
    # Check access: owner, public diagram, or collaborator (by user_id or email)
    has_access = (
        diagram["user_id"] == user_id or 
        diagram.get("is_public", False) or 
        user_id in diagram.get("collaborators", []) or
        user_email in diagram.get("collaborators", [])
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied to this diagram")
    
    return diagram

@router.websocket("/ws/diagram/{diagram_id}")
async def websocket_endpoint(websocket: WebSocket, diagram_id: str, token: str = Query(...)):
    """WebSocket endpoint for real-time collaboration"""
    print(f"[DEBUG] WebSocket connection attempt - diagram_id: {diagram_id}, token: {token[:20]}...")
    
    # Authenticate user using token
    from jose import JWTError, jwt
    from .auth import SECRET_KEY, ALGORITHM, get_user_by_email
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            print(f"[DEBUG] No email in JWT payload")
            await websocket.close(code=1008)
            return
        
        user = await get_user_by_email(email)
        if user is None:
            print(f"[DEBUG] User not found for email: {email}")
            await websocket.close(code=1008)
            return
        
        print(f"[DEBUG] User authenticated: {user['username']}")
        
    except JWTError as e:
        print(f"[DEBUG] JWT decode error: {e}")
        await websocket.close(code=1008)
        return
    
    # Verify diagram access
    try:
        diagram = await verify_diagram_access(diagram_id, user)
        print(f"[DEBUG] Diagram access verified for {user['username']} on diagram {diagram_id}")
    except HTTPException as e:
        print(f"[DEBUG] Diagram access denied: {e.detail}")
        await websocket.close(code=1008)
        return
    
    # Connect to the diagram room
    print(f"[DEBUG] Connecting user {user['username']} to diagram {diagram_id}")
    await manager.connect(websocket, diagram_id, user)
    print(f"[DEBUG] WebSocket connected successfully")
    
    try:
        # Send current active users to the new connection
        active_users = manager.get_diagram_users(diagram_id)
        await manager.send_personal_message(json.dumps({
            "type": "active_users",
            "users": active_users,
            "timestamp": datetime.utcnow().isoformat()
        }), websocket)
        
        # Main message loop
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message["type"] == "drawing_action":
                await handle_drawing_action(diagram_id, user, message, websocket)
            elif message["type"] == "chat_message":
                await handle_chat_message(diagram_id, user, message, websocket)
            elif message["type"] == "cursor_position":
                await handle_cursor_position(diagram_id, user, message, websocket)
            elif message["type"] == "diagram_update":
                await handle_diagram_update(diagram_id, user, message, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, diagram_id)
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, diagram_id)

async def handle_drawing_action(diagram_id: str, user: dict, message: dict, websocket: WebSocket):
    """Handle drawing actions (pen, eraser, shapes, etc.)"""
    db = get_database()
    
    # Create drawing action record
    action = DrawingAction(
        action_type=message["data"]["action_type"],
        data=message["data"],
        user_id=str(user["_id"])
    )
    
    # Save to database if it's a persistent action
    if message["data"]["action_type"] in ["draw", "add_shape", "add_text"]:
        await db.canvas_actions.insert_one(action.dict())
    
    # Broadcast to other users
    await manager.broadcast_to_diagram(diagram_id, {
        "type": "drawing_action",
        "data": message["data"],
        "user": {
            "id": str(user["_id"]),
            "username": user["username"]
        },
        "timestamp": datetime.utcnow().isoformat()
    }, exclude=websocket)

async def handle_chat_message(diagram_id: str, user: dict, message: dict, websocket: WebSocket):
    """Handle incoming chat messages and broadcast to all users"""
    db = get_database()
    
    print(f"[DEBUG] Handling chat message from user {user['username']} in diagram {diagram_id}")
    print(f"[DEBUG] Message data: {message['data']}")
    
    # Create chat message document
    chat_message = {
        "diagram_id": diagram_id,
        "user_id": str(user["_id"]),
        "username": user["username"],
        "user_avatar": user.get("avatar"),
        "message": message["data"]["message"],
        "message_type": message["data"].get("message_type", "text"),
        "reply_to": message["data"].get("reply_to"),
        "created_at": datetime.utcnow(),
        "is_edited": False,
        "is_deleted": False,
        "reactions": {}
    }
    
    result = await db.chat_messages.insert_one(chat_message)
    
    print(f"[DEBUG] Message saved to DB with ID: {result.inserted_id}")
    
    # Broadcast to all users in the diagram
    broadcast_message = {
        "type": "chat_message",
        "data": {
            "id": str(result.inserted_id),
            "message": message["data"]["message"],
            "message_type": chat_message["message_type"],
            "reply_to": chat_message["reply_to"],
            "user": {
                "id": str(user["_id"]),
                "username": user["username"],
                "avatar": user.get("avatar")
            },
            "created_at": chat_message["created_at"].isoformat(),
            "is_edited": False,
            "reactions": {}
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    
    print(f"[DEBUG] Broadcasting message to {len(manager.active_connections.get(diagram_id, []))} connections")
    # Broadcast to ALL users in the diagram (including sender for consistency)
    await manager.broadcast_to_diagram(diagram_id, broadcast_message)
    
    print(f"[DEBUG] Message broadcast completed successfully")

async def handle_cursor_position(diagram_id: str, user: dict, message: dict, websocket: WebSocket):
    """Handle cursor position updates"""
    # Broadcast cursor position to other users (don't save to database)
    await manager.broadcast_to_diagram(diagram_id, {
        "type": "cursor_position",
        "data": message["data"],
        "user": {
            "id": str(user["_id"]),
            "username": user["username"]
        },
        "timestamp": datetime.utcnow().isoformat()
    }, exclude=websocket)

async def handle_diagram_update(diagram_id: str, user: dict, message: dict, websocket: WebSocket):
    """Handle diagram metadata updates"""
    db = get_database()
    
    # Update diagram in database
    update_data = {
        "updated_at": datetime.utcnow()
    }
    
    if "title" in message["data"]:
        update_data["title"] = message["data"]["title"]
    if "diagram_data" in message["data"]:
        update_data["diagram_data"] = message["data"]["diagram_data"]
    
    await db.diagrams.update_one(
        {"_id": ObjectId(diagram_id)},
        {"$set": update_data}
    )
    
    # Broadcast update to other users
    await manager.broadcast_to_diagram(diagram_id, {
        "type": "diagram_update",
        "data": message["data"],
        "user": {
            "id": str(user["_id"]),
            "username": user["username"]
        },
        "timestamp": datetime.utcnow().isoformat()
    }, exclude=websocket)

import asyncio
