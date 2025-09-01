#!/usr/bin/env python3
"""
Test script to verify that the admin password feature is working correctly.
This script creates test users and verifies that their passwords are stored and retrievable.
"""

import asyncio
import os
import sys
import json
import httpx
from bson import ObjectId
from datetime import datetime

# API base URL
BASE_URL = "http://localhost:8000/api"

# Admin credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "adminpassword"

# Test users to create
TEST_USERS = [
    {
        "username": "testuser1",
        "email": "test1@example.com",
        "password": "password123",
        "role": "user"
    },
    {
        "username": "testuser2",
        "email": "test2@example.com",
        "password": "securepass456",
        "role": "user"
    }
]

async def login_admin():
    """Login as admin and return the access token"""
    print("🔑 Logging in as admin...")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            }
        )
        
        if response.status_code != 200:
            print(f"❌ Admin login failed: {response.status_code}")
            print(f"Response: {response.text}")
            sys.exit(1)
        
        data = response.json()
        token = data.get("access_token")
        print("✅ Admin login successful")
        return token

async def create_test_users(token):
    """Create test users"""
    print("\n📝 Creating test users...")
    
    created_users = []
    
    async with httpx.AsyncClient() as client:
        for i, user_data in enumerate(TEST_USERS, 1):
            print(f"  Creating user {i}: {user_data['email']}...")
            
            response = await client.post(
                f"{BASE_URL}/admin/users",
                json=user_data,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                user = response.json()
                print(f"  ✅ User created: {user['email']}")
                created_users.append(user)
            else:
                print(f"  ❌ Failed to create user: {response.status_code}")
                print(f"  Response: {response.text}")
    
    return created_users

async def verify_passwords(token, created_users):
    """Verify that passwords are stored correctly"""
    print("\n🔍 Verifying passwords...")
    
    async with httpx.AsyncClient() as client:
        # Get all users with passwords
        print("  Getting all users with passwords...")
        response = await client.get(
            f"{BASE_URL}/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code != 200:
            print(f"  ❌ Failed to get users: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
        
        users = response.json()
        print(f"  ✅ Retrieved {len(users)} users")
        
        # Check if passwords match
        success = True
        for i, test_user in enumerate(TEST_USERS):
            matching_user = next((u for u in users if u["email"] == test_user["email"]), None)
            
            if not matching_user:
                print(f"  ❌ User not found: {test_user['email']}")
                success = False
                continue
            
            if matching_user.get("password") == test_user["password"]:
                print(f"  ✅ Password correct for {test_user['email']}: {test_user['password']}")
            else:
                print(f"  ❌ Password mismatch for {test_user['email']}")
                print(f"    Expected: {test_user['password']}")
                print(f"    Got: {matching_user.get('password')}")
                success = False
        
        # Also check individual password endpoints
        for user in created_users:
            print(f"  Getting password for {user['email']}...")
            response = await client.get(
                f"{BASE_URL}/admin/users/{user['id']}/password",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code != 200:
                print(f"  ❌ Failed to get password: {response.status_code}")
                print(f"  Response: {response.text}")
                success = False
                continue
            
            password_data = response.json()
            test_user = next((u for u in TEST_USERS if u["email"] == user["email"]), None)
            
            if password_data.get("password") == test_user["password"]:
                print(f"  ✅ Individual password endpoint correct for {user['email']}: {test_user['password']}")
            else:
                print(f"  ❌ Individual password endpoint mismatch for {user['email']}")
                print(f"    Expected: {test_user['password']}")
                print(f"    Got: {password_data.get('password')}")
                success = False
        
        return success

async def main():
    """Main test function"""
    print("🚀 Starting Admin Password Feature Test")
    print("=" * 60)
    
    # Login as admin
    token = await login_admin()
    
    # Create test users
    created_users = await create_test_users(token)
    
    # Verify passwords
    success = await verify_passwords(token, created_users)
    
    print("\n" + "=" * 60)
    if success:
        print("✅ All tests passed! The admin password feature is working correctly.")
    else:
        print("❌ Some tests failed. Please check the implementation.")
    
    print("🏁 Test completed")

if __name__ == "__main__":
    asyncio.run(main())
