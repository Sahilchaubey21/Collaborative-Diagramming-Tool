from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from .models import ChatMessage, ChatMessageResponse, ChatMessageCreate
from .auth import get_current_user
from .db import get_database

router = APIRouter(prefix="/chat", tags=["chat"])

async def verify_diagram_access(diagram_id: str, user: dict, db: AsyncIOMotorDatabase):
    """Verify user has access to diagram"""
    try:
        diagram = await db.diagrams.find_one({"_id": ObjectId(diagram_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid diagram ID"
        )
    
    if not diagram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagram not found"
        )
    
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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this diagram"
        )
    
    return diagram

@router.post("/{diagram_id}/messages", response_model=ChatMessageResponse)
async def send_chat_message(
    diagram_id: str,
    message_data: ChatMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a chat message for a diagram"""
    db: AsyncIOMotorDatabase = get_database()
    
    # Verify diagram access
    await verify_diagram_access(diagram_id, current_user, db)
    
    # Create chat message
    chat_message = {
        "diagram_id": diagram_id,
        "user_id": str(current_user["_id"]),
        "username": current_user["username"],
        "user_avatar": current_user.get("avatar"),
        "message": message_data.message,
        "message_type": message_data.message_type,
        "reply_to": message_data.reply_to,
        "created_at": datetime.utcnow(),
        "is_edited": False,
        "is_deleted": False,
        "reactions": {}
    }
    
    # Insert message into database
    result = await db.chat_messages.insert_one(chat_message)
    chat_message["_id"] = str(result.inserted_id)
    chat_message["id"] = str(result.inserted_id)  # Add id field for frontend compatibility
    
    return ChatMessageResponse(**chat_message)

@router.get("/{diagram_id}/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    diagram_id: str,
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """Get chat messages for a diagram"""
    db: AsyncIOMotorDatabase = get_database()
    
    # Verify diagram access
    await verify_diagram_access(diagram_id, current_user, db)
    
    # Get messages from database
    messages = await db.chat_messages.find(
        {"diagram_id": diagram_id, "is_deleted": False}
    ).sort("created_at", 1).skip(skip).limit(limit).to_list(length=limit)
    
    # Convert ObjectId to string and format response
    for message in messages:
        message["_id"] = str(message["_id"])
        message["id"] = message["_id"]  # Add id field for frontend compatibility
        
        # Handle missing fields for backward compatibility
        if "message_type" not in message:
            message["message_type"] = "text"
        if "reactions" not in message:
            message["reactions"] = {}
        if "is_edited" not in message:
            message["is_edited"] = False
        if "is_deleted" not in message:
            message["is_deleted"] = False
    
    return [ChatMessageResponse(**message) for message in messages]

@router.put("/{diagram_id}/messages/{message_id}", response_model=ChatMessageResponse)
async def edit_chat_message(
    diagram_id: str,
    message_id: str,
    message_data: ChatMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Edit a chat message (only by sender)"""
    db: AsyncIOMotorDatabase = get_database()
    
    # Verify diagram access
    await verify_diagram_access(diagram_id, current_user, db)
    
    # Get the message
    try:
        message = await db.chat_messages.find_one({"_id": ObjectId(message_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message ID"
        )
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Check if user can edit this message (only sender)
    if message["user_id"] != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own messages"
        )
    
    # Check if message is not deleted
    if message.get("is_deleted", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit deleted message"
        )
    
    # Update the message
    update_data = {
        "message": message_data.message,
        "updated_at": datetime.utcnow(),
        "is_edited": True
    }
    
    await db.chat_messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": update_data}
    )
    
    # Return updated message
    updated_message = await db.chat_messages.find_one({"_id": ObjectId(message_id)})
    if not updated_message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found after update"
        )
    
    updated_message["_id"] = str(updated_message["_id"])
    
    return ChatMessageResponse(**updated_message)

@router.delete("/{diagram_id}/messages/{message_id}")
async def delete_chat_message(
    diagram_id: str,
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a chat message (soft delete)"""
    db: AsyncIOMotorDatabase = get_database()
    
    # Verify diagram access  
    diagram = await verify_diagram_access(diagram_id, current_user, db)
    
    # Get the message
    try:
        message = await db.chat_messages.find_one({"_id": ObjectId(message_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message ID"
        )
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Check if user can delete this message (sender or diagram owner)
    user_id = str(current_user["_id"])
    if message["user_id"] != user_id and diagram["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own messages or you must be the diagram owner"
        )
    
    # Soft delete the message
    await db.chat_messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Chat message deleted successfully"}

@router.post("/{diagram_id}/messages/{message_id}/reactions")
async def add_reaction(
    diagram_id: str,
    message_id: str,
    emoji: str,
    current_user: dict = Depends(get_current_user)
):
    """Add or remove a reaction to a message"""
    db: AsyncIOMotorDatabase = get_database()
    
    # Verify diagram access
    await verify_diagram_access(diagram_id, current_user, db)
    
    # Get the message
    try:
        message = await db.chat_messages.find_one({"_id": ObjectId(message_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message ID"
        )
    
    if not message or message.get("is_deleted", False):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    user_id = str(current_user["_id"])
    reactions = message.get("reactions", {})
    
    # Toggle reaction
    if emoji not in reactions:
        reactions[emoji] = []
    
    if user_id in reactions[emoji]:
        reactions[emoji].remove(user_id)
        if not reactions[emoji]:  # Remove empty reaction lists
            del reactions[emoji]
    else:
        reactions[emoji].append(user_id)
    
    # Update message reactions
    await db.chat_messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"reactions": reactions}}
    )
    
    return {"message": "Reaction updated successfully", "reactions": reactions}

