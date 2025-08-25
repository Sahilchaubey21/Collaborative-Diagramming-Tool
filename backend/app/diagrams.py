from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from .models import DiagramCreate, DiagramUpdate, DiagramResponse, UserResponse
from .auth import get_current_user
from .db import get_database

router = APIRouter(prefix="/diagrams", tags=["diagrams"])

@router.post("/", response_model=DiagramResponse)
async def create_diagram(
    diagram_data: DiagramCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new diagram"""
    db = get_database()
    
    diagram_doc = {
        "title": diagram_data.title,
        "description": diagram_data.description,
        "diagram_data": diagram_data.diagram_data.dict(),
        "user_id": str(current_user["_id"]),
        "is_public": diagram_data.is_public,
        "collaborators": diagram_data.collaborators,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.diagrams.insert_one(diagram_doc)
    diagram_doc["_id"] = str(result.inserted_id)
    
    return DiagramResponse(**diagram_doc)

@router.get("/", response_model=List[DiagramResponse])
async def get_user_diagrams(
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None
):
    """Get current user's diagrams"""
    db = get_database()
    
    # Build query
    query: Dict[str, Any] = {"user_id": str(current_user["_id"])}
    
    # Add search functionality
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    # Execute query with pagination
    cursor = db.diagrams.find(query).sort("updated_at", -1).skip(skip).limit(limit)
    diagrams = await cursor.to_list(length=limit)
    
    # Process diagrams for response
    processed_diagrams = []
    for diagram in diagrams:
        # Convert ObjectId to string
        diagram["_id"] = str(diagram["_id"])
        
        # Ensure diagram_data is a DiagramData object
        if "diagram_data" in diagram and isinstance(diagram["diagram_data"], dict):
            from .models import DiagramData
            diagram["diagram_data"] = DiagramData(**diagram["diagram_data"])
        
        processed_diagrams.append(DiagramResponse(**diagram))
    
    return processed_diagrams

@router.get("/shared", response_model=List[DiagramResponse])
async def get_shared_diagrams(
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None
):
    """Get diagrams shared with the current user"""
    db = get_database()
    
    # Build query for diagrams where current user is a collaborator
    query: Dict[str, Any] = {"collaborators": current_user["email"]}
    
    # Add search functionality
    if search:
        query["$and"] = [
            {"collaborators": current_user["email"]},
            {"$or": [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]}
        ]
    
    # Execute query with pagination
    cursor = db.diagrams.find(query).sort("updated_at", -1).skip(skip).limit(limit)
    diagrams = await cursor.to_list(length=limit)
    
    # Process diagrams for response
    processed_diagrams = []
    for diagram in diagrams:
        # Convert ObjectId to string
        diagram["_id"] = str(diagram["_id"])
        
        # Ensure diagram_data is a DiagramData object
        if "diagram_data" in diagram and isinstance(diagram["diagram_data"], dict):
            from .models import DiagramData
            diagram["diagram_data"] = DiagramData(**diagram["diagram_data"])
        
        processed_diagrams.append(DiagramResponse(**diagram))
    
    return processed_diagrams

@router.get("/public", response_model=List[DiagramResponse])
async def get_public_diagrams(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None
):
    """Get public diagrams"""
    db = get_database()
    
    # Build query for public diagrams
    query: Dict[str, Any] = {"is_public": True}
    
    # Add search functionality
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.diagrams.find(query).sort("created_at", -1).skip(skip).limit(limit)
    diagrams = await cursor.to_list(length=limit)
    
    # Process diagrams for response
    processed_diagrams = []
    for diagram in diagrams:
        # Convert ObjectId to string
        diagram["_id"] = str(diagram["_id"])
        
        # Ensure diagram_data is a DiagramData object
        if "diagram_data" in diagram and isinstance(diagram["diagram_data"], dict):
            from .models import DiagramData
            diagram["diagram_data"] = DiagramData(**diagram["diagram_data"])
        
        processed_diagrams.append(DiagramResponse(**diagram))
    
    return processed_diagrams

@router.get("/{diagram_id}", response_model=DiagramResponse)
async def get_diagram(
    diagram_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific diagram"""
    db = get_database()
    
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
    
    # Check if user has access to this diagram
    user_id = str(current_user["_id"])
    user_email = current_user["email"]
    if (diagram["user_id"] != user_id and 
        not diagram["is_public"] and 
        user_email not in diagram.get("collaborators", [])):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this diagram"
        )
    
    diagram["_id"] = str(diagram["_id"])
    
    # Ensure diagram_data is a DiagramData object
    if "diagram_data" in diagram and isinstance(diagram["diagram_data"], dict):
        from .models import DiagramData
        diagram["diagram_data"] = DiagramData(**diagram["diagram_data"])
    
    return DiagramResponse(**diagram)

@router.put("/{diagram_id}", response_model=DiagramResponse)
async def update_diagram(
    diagram_id: str,
    diagram_update: DiagramUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a diagram"""
    db = get_database()
    
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
    
    # Check if user owns this diagram or is a collaborator
    user_id = str(current_user["_id"])
    user_email = current_user["email"]
    if (diagram["user_id"] != user_id and 
        user_email not in diagram.get("collaborators", [])):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to update this diagram"
        )
    
    # Prepare update data
    update_data: Dict[str, Any] = {"updated_at": datetime.utcnow()}
    
    # Only update fields that were provided
    if diagram_update.title is not None:
        update_data["title"] = diagram_update.title
    if diagram_update.description is not None:
        update_data["description"] = diagram_update.description
    if diagram_update.diagram_data is not None:
        update_data["diagram_data"] = diagram_update.diagram_data.dict()
    if diagram_update.is_public is not None and diagram["user_id"] == user_id:
        # Only owner can change public status
        update_data["is_public"] = diagram_update.is_public
    if diagram_update.collaborators is not None and diagram["user_id"] == user_id:
        # Only owner can change collaborators
        update_data["collaborators"] = diagram_update.collaborators
    
    # Update the diagram
    await db.diagrams.update_one(
        {"_id": ObjectId(diagram_id)},
        {"$set": update_data}
    )
    
    # Broadcast diagram update via SSE to all connected clients
    try:
        from .sse import broadcast_canvas_update
        await broadcast_canvas_update(diagram_id, {
            "type": "diagram_update",
            "diagram_id": diagram_id,
            "updates": update_data,
            "updated_at": update_data.get("updated_at", datetime.utcnow()).isoformat()
        })
        print(f"[DEBUG] SSE broadcast sent for diagram update {diagram_id}")
    except Exception as e:
        print(f"[DEBUG] SSE broadcast failed for diagram update: {e}")
    
    # Return updated diagram
    updated_diagram = await db.diagrams.find_one({"_id": ObjectId(diagram_id)})
    if not updated_diagram:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagram not found")
        
    # Process diagram for response
    updated_diagram["_id"] = str(updated_diagram["_id"])
    
    # Ensure diagram_data is a DiagramData object
    if "diagram_data" in updated_diagram and isinstance(updated_diagram["diagram_data"], dict):
        from .models import DiagramData
        updated_diagram["diagram_data"] = DiagramData(**updated_diagram["diagram_data"])
    
    return DiagramResponse(**updated_diagram)

@router.delete("/{diagram_id}")
async def delete_diagram(
    diagram_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a diagram"""
    db = get_database()
    
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
    
    # Only owner can delete
    if diagram["user_id"] != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can delete this diagram"
        )
    
    # Delete the diagram
    await db.diagrams.delete_one({"_id": ObjectId(diagram_id)})
    
    # Also delete related chat messages
    await db.chat_messages.delete_many({"diagram_id": diagram_id})
    
    return {"message": "Diagram deleted successfully"}

@router.post("/{diagram_id}/collaborators/{user_email}")
async def add_collaborator(
    diagram_id: str,
    user_email: str,
    current_user: dict = Depends(get_current_user)
):
    """Add a collaborator to a diagram"""
    db = get_database()
    
    # Check if diagram exists and user is owner
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
    
    if diagram["user_id"] != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can add collaborators"
        )
    
    # Check if user exists
    collaborator = await db.users.find_one({"email": user_email})
    if not collaborator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Add collaborator if not already added
    if user_email not in diagram.get("collaborators", []):
        await db.diagrams.update_one(
            {"_id": ObjectId(diagram_id)},
            {"$addToSet": {"collaborators": user_email}}
        )
    
    return {"message": f"Collaborator {user_email} added successfully"}

@router.delete("/{diagram_id}/collaborators/{user_email}")
async def remove_collaborator(
    diagram_id: str,
    user_email: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a collaborator from a diagram"""
    db = get_database()
    
    # Check if diagram exists and user is owner
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
    
    if diagram["user_id"] != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can remove collaborators"
        )
    
    # Remove collaborator
    await db.diagrams.update_one(
        {"_id": ObjectId(diagram_id)},
        {"$pull": {"collaborators": user_email}}
    )
    
    return {"message": f"Collaborator {user_email} removed successfully"}
