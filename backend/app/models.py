from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

# Custom ObjectId type for MongoDB
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# User Models
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str = Field(default_factory=str, alias="_id")
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool = True

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None

# Chat Models
class ChatMessage(BaseModel):
    id: str = Field(default_factory=str, alias="_id")
    diagram_id: str
    user_id: str
    username: str
    user_avatar: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    message_type: str = Field(default="text")  # text, system, notification, image, file
    reply_to: Optional[str] = None  # ID of message being replied to
    is_edited: bool = False
    is_deleted: bool = False
    reactions: Dict[str, List[str]] = {}  # emoji -> list of user_ids
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ChatMessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    message_type: str = Field(default="text")
    reply_to: Optional[str] = None

class ChatMessageResponse(BaseModel):
    id: str = Field(default_factory=str, alias="_id")
    diagram_id: str
    user_id: str
    username: str
    user_avatar: Optional[str] = None
    message: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    message_type: str
    reply_to: Optional[str] = None
    is_edited: bool = False
    is_deleted: bool = False
    reactions: Dict[str, List[str]] = {}
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
    is_active: Optional[bool] = None

# Token Models
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

# Diagram Models
class DiagramData(BaseModel):
    elements: List[Dict[str, Any]] = []
    canvas_state: Dict[str, Any] = {}

class DiagramCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    diagram_data: DiagramData = DiagramData()
    is_public: bool = False
    collaborators: List[str] = []

class DiagramUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    diagram_data: Optional[DiagramData] = None
    is_public: Optional[bool] = None
    collaborators: Optional[List[str]] = None

class DiagramResponse(BaseModel):
    id: str = Field(default_factory=str, alias="_id")
    title: str
    description: Optional[str] = None
    diagram_data: DiagramData
    user_id: str
    is_public: bool
    collaborators: List[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Chat models are already defined above

# Canvas Drawing Models
class DrawingAction(BaseModel):
    action_type: str  # 'draw', 'erase', 'clear', etc.
    data: Dict[str, Any]
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class CanvasState(BaseModel):
    diagram_id: str
    actions: List[DrawingAction] = []
    last_updated: datetime = Field(default_factory=datetime.utcnow)
