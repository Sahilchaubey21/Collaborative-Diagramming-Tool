import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
from dotenv import load_dotenv
import asyncio

print("📦 MONGO_URL from env:", os.getenv("MONGO_URL"))


# ✅ Load environment variables from .env
# This line ensures the .env file is read when app starts
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# ✅ Debug: confirm that env loaded
print("Loaded Mongo URL:", os.getenv("MONGO_URL"))

# Database Configuration
MONGO_URL = os.getenv("MONGO_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "diagramming_app")

class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    database: Optional[AsyncIOMotorDatabase] = None

# Create a global instance
mongodb = MongoDB()

async def connect_to_mongo():
    """Create database connection"""
    try:
        mongodb.client = AsyncIOMotorClient(MONGO_URL)
        mongodb.database = mongodb.client[DATABASE_NAME]
        
        # Test the connection
        await mongodb.client.admin.command('ping')
        print(f"✅ Successfully connected to MongoDB at {MONGO_URL}")
        
        # Create indexes for better performance
        await create_indexes()
        
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        raise e

async def close_mongo_connection():
    """Close database connection"""
    if mongodb.client:
        mongodb.client.close()
        print("📝 Disconnected from MongoDB")

async def create_indexes():
    """Create database indexes for better performance"""
    try:
        if mongodb.database is None:
            raise RuntimeError("Database connection not established")
            
        # Users collection indexes
        await mongodb.database.users.create_index("email", unique=True)
        await mongodb.database.users.create_index("username", unique=True)
        
        # Diagrams collection indexes
        await mongodb.database.diagrams.create_index("user_id")
        await mongodb.database.diagrams.create_index("created_at")
        await mongodb.database.diagrams.create_index([("title", "text")])
        
        # Chat messages indexes
        await mongodb.database.chat_messages.create_index("diagram_id")
        await mongodb.database.chat_messages.create_index("created_at")
        
        print("✅ Database indexes created successfully")
    except Exception as e:
        print(f"⚠️ Error creating indexes: {e}")

def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    if mongodb.database is None:
        raise RuntimeError("Database connection not established")
    return mongodb.database
