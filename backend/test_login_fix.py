#!/usr/bin/env python3
"""
Test script to verify the login fix works correctly.
This script tests the authentication flow to ensure users get their own profile.
"""

import asyncio
import requests
import json
from datetime import datetime

# API base URL
BASE_URL = "http://localhost:8000/api"

def test_login_flow():
    """Test the complete login flow to ensure users get their own profile"""
    
    print("🧪 Testing Login Fix...")
    print("=" * 50)
    
    # Test data - create two different users
    test_users = [
        {
            "email": "user1@test.com",
            "password": "password123",
            "username": "TestUser1"
        },
        {
            "email": "user2@test.com", 
            "password": "password456",
            "username": "TestUser2"
        }
    ]
    
    for i, user_data in enumerate(test_users, 1):
        print(f"\n👤 Testing User {i}: {user_data['email']}")
        print("-" * 30)
        
        try:
            # Step 1: Create user
            print("1. Creating user...")
            create_response = requests.post(
                f"{BASE_URL}/users",
                json=user_data,
                headers={"Content-Type": "application/json"}
            )
            
            if create_response.status_code == 200:
                print("   ✅ User created successfully")
            elif create_response.status_code == 400 and "already registered" in create_response.text:
                print("   ⚠️  User already exists (continuing with login)")
            else:
                print(f"   ❌ Failed to create user: {create_response.status_code}")
                print(f"   Response: {create_response.text}")
                continue
            
            # Step 2: Login
            print("2. Logging in...")
            login_response = requests.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": user_data["email"],
                    "password": user_data["password"]
                },
                headers={"Content-Type": "application/json"}
            )
            
            if login_response.status_code != 200:
                print(f"   ❌ Login failed: {login_response.status_code}")
                print(f"   Response: {login_response.text}")
                continue
            
            login_data = login_response.json()
            token = login_data.get("access_token")
            print("   ✅ Login successful")
            print(f"   Token: {token[:20]}...")
            
            # Step 3: Get current user profile
            print("3. Getting current user profile...")
            profile_response = requests.get(
                f"{BASE_URL}/users/me",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
            )
            
            if profile_response.status_code != 200:
                print(f"   ❌ Failed to get profile: {profile_response.status_code}")
                print(f"   Response: {profile_response.text}")
                continue
            
            profile_data = profile_response.json()
            print("   ✅ Profile retrieved successfully")
            print(f"   Username: {profile_data.get('username')}")
            print(f"   Email: {profile_data.get('email')}")
            print(f"   Role: {profile_data.get('role')}")
            
            # Verify the profile matches the logged-in user
            if profile_data.get('email') == user_data['email']:
                print("   ✅ Profile matches logged-in user!")
            else:
                print(f"   ❌ Profile mismatch! Expected: {user_data['email']}, Got: {profile_data.get('email')}")
                
        except Exception as e:
            print(f"   ❌ Error during test: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🏁 Login fix test completed!")

def test_default_admin():
    """Test the default admin user login"""
    print("\n👑 Testing Default Admin User...")
    print("-" * 30)
    
    try:
        # Login as default admin
        print("1. Logging in as default admin...")
        login_response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": "admin@example.com",
                "password": "adminpassword"
            },
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code != 200:
            print(f"   ❌ Admin login failed: {login_response.status_code}")
            print(f"   Response: {login_response.text}")
            return
        
        login_data = login_response.json()
        token = login_data.get("access_token")
        print("   ✅ Admin login successful")
        
        # Get admin profile
        print("2. Getting admin profile...")
        profile_response = requests.get(
            f"{BASE_URL}/users/me",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        if profile_response.status_code == 200:
            profile_data = profile_response.json()
            print("   ✅ Admin profile retrieved")
            print(f"   Username: {profile_data.get('username')}")
            print(f"   Email: {profile_data.get('email')}")
            print(f"   Role: {profile_data.get('role')}")
            
            if profile_data.get('email') == "admin@example.com":
                print("   ✅ Admin profile matches!")
            else:
                print("   ❌ Admin profile mismatch!")
        else:
            print(f"   ❌ Failed to get admin profile: {profile_response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error during admin test: {str(e)}")

if __name__ == "__main__":
    print("🚀 Starting Login Fix Verification...")
    print(f"📡 API Base URL: {BASE_URL}")
    print(f"⏰ Test started at: {datetime.now()}")
    
    # Test regular users
    test_login_flow()
    
    # Test default admin
    test_default_admin()
    
    print(f"\n⏰ Test completed at: {datetime.now()}")
    print("🎉 All tests completed!")
