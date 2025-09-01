from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict
from bson import ObjectId
from auth import get_current_user, get_current_admin, get_password_hash
from models import User, Role, UserCreate
from db import users_collection
import re
import os
from datetime import datetime, timezone

router = APIRouter()

# Dictionary to store plaintext passwords for admin viewing
# In a production system, this would be a more secure approach like encrypted storage
# This is just for demonstration purposes
USER_PASSWORDS = {}

# Password field is now directly in the User model

# Initialize with default admin password
USER_PASSWORDS["admin@example.com"] = "adminpassword"

@router.get("/admin/users", response_model=List[User])
async def get_users_with_passwords(current_user: User = Depends(get_current_admin)):
    """
    Get all users with their passwords (admin only)
    This endpoint is for admin users to see user passwords
    """
    users = []
    async for user in users_collection.find():
        # Include the plaintext password directly in the user object
        users.append(User(
            id=str(user["_id"]),
            username=user["username"],
            email=user["email"],
            role=user["role"],
            created_at=user.get("created_at"),
            password=user.get("password", USER_PASSWORDS.get(user.get("email", ""), "password123"))
        ))
    return users

@router.get("/admin/users/{user_id}/password", response_model=dict)
async def get_user_password(user_id: str, current_user: User = Depends(get_current_admin)):
    """
    Get a specific user's password (admin only)
    This endpoint is for admin users to see a user's password
    """
    try:
        object_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    user = await users_collection.find_one({"_id": object_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get password directly from user object, fall back to USER_PASSWORDS if not found
    password = user.get("password", "")
    if not password:
        email = user.get("email", "")
        password = USER_PASSWORDS.get(email, "password123")
    
    return {"password": password}

@router.post("/admin/users", response_model=User)
async def create_user_with_password(user: UserCreate, current_user: User = Depends(get_current_admin)):
    """Create a new user and store the password for admin view"""
    # Check if user already exists
    if await users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Store the plaintext password for admin viewing
    USER_PASSWORDS[user.email] = user.password
    
    # Create user document with both hashed and plaintext password
    user_dict = user.dict()
    plaintext_password = user.password
    hashed_password = get_password_hash(plaintext_password)
    
    # Insert into database with plaintext password
    result = await users_collection.insert_one({
        "username": user.username,
        "email": user.email,
        "hashed_password": hashed_password,
        "password": plaintext_password,
        "role": user.role,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Return created user
    created_user = await users_collection.find_one({"_id": result.inserted_id})
    print(f"Created user: {created_user}")
    
    return User(
        id=str(created_user["_id"]),
        username=created_user["username"],
        email=created_user["email"],
        role=created_user["role"],
        created_at=created_user.get("created_at"),
        password=created_user.get("password")
    )

@router.put("/admin/users/{user_id}", response_model=User)
async def update_user_with_password(
    user_id: str, 
    user_data: Dict = Body(...),
    current_user: User = Depends(get_current_admin)
):
    """Update a user and store the password if provided"""
    try:
        object_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Check if user exists
    existing_user = await users_collection.find_one({"_id": object_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prepare update data
    update_data = {}
    if "username" in user_data:
        update_data["username"] = user_data["username"]
    if "email" in user_data:
        # If email is changing, update the password store key
        old_email = existing_user["email"]
        new_email = user_data["email"]
        if old_email in USER_PASSWORDS and old_email != new_email:
            USER_PASSWORDS[new_email] = USER_PASSWORDS.pop(old_email)
        update_data["email"] = new_email
    if "role" in user_data:
        update_data["role"] = user_data["role"]
    
    # Update password if provided
    if "password" in user_data and user_data["password"]:
        # Store both plaintext and hashed password
        update_data["password"] = user_data["password"]
        update_data["hashed_password"] = get_password_hash(user_data["password"])
    
    # Update user
    await users_collection.update_one(
        {"_id": object_id},
        {"$set": update_data}
    )
    
    # Return updated user
    updated_user = await users_collection.find_one({"_id": object_id})
    
    return User(
        id=str(updated_user["_id"]),
        username=updated_user["username"],
        email=updated_user["email"],
        role=updated_user["role"],
        created_at=updated_user.get("created_at"),
        password=updated_user.get("password")
    )
