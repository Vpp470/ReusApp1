#!/usr/bin/env python3
"""
Backend Test Suite for Ownership Management (Assignar Establiments)
Testing the complete flow of assigning and unassigning establishment owners.
"""

import asyncio
import aiohttp
import json
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://appcentral-3.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@reusapp.com"
ADMIN_PASSWORD = "admin123"
TEST_USER_EMAIL = "flapsreus@gmail.com"

class OwnershipManagementTester:
    def __init__(self):
        self.session = None
        self.admin_token = None
        self.test_results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and isinstance(response_data, dict):
            if 'message' in response_data:
                print(f"   Message: {response_data['message']}")
        print()
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response': response_data
        })
    
    async def admin_login(self):
        """Test admin login and get token"""
        print("🔐 Testing Admin Login...")
        
        try:
            url = f"{API_BASE}/auth/login?email={ADMIN_EMAIL}&password={ADMIN_PASSWORD}"
            
            async with self.session.post(url) as response:
                if response.status == 200:
                    result = await response.json()
                    self.admin_token = result.get('token')
                    user_role = result.get('user', {}).get('role')
                    
                    if self.admin_token and user_role == 'admin':
                        self.log_test(
                            "Admin Login", 
                            True, 
                            f"Token: {self.admin_token[:20]}..., Role: {user_role}"
                        )
                        return True
                    else:
                        self.log_test("Admin Login", False, "Invalid token or role")
                        return False
                else:
                    error_text = await response.text()
                    self.log_test("Admin Login", False, f"HTTP {response.status}: {error_text}")
                    return False
                    
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    async def get_establishments(self):
        """Test GET /api/admin/establishments"""
        print("🏢 Testing Get Establishments...")
        
        try:
            headers = {'Authorization': self.admin_token}
            
            async with self.session.get(f"{API_BASE}/admin/establishments", headers=headers) as response:
                if response.status == 200:
                    establishments = await response.json()
                    count = len(establishments)
                    
                    self.log_test(
                        "GET /api/admin/establishments",
                        True,
                        f"Retrieved {count} establishments"
                    )
                    
                    # Return first establishment for testing
                    if establishments:
                        return establishments[0]
                    else:
                        self.log_test("Get First Establishment", False, "No establishments found")
                        return None
                else:
                    error_text = await response.text()
                    self.log_test("GET /api/admin/establishments", False, f"HTTP {response.status}: {error_text}")
                    return None
                    
        except Exception as e:
            self.log_test("GET /api/admin/establishments", False, f"Exception: {str(e)}")
            return None
    
    async def get_local_associats(self):
        """Test GET /api/admin/users/local-associats"""
        print("👥 Testing Get Local Associats...")
        
        try:
            headers = {'Authorization': self.admin_token}
            
            async with self.session.get(f"{API_BASE}/admin/users/local-associats", headers=headers) as response:
                if response.status == 200:
                    users = await response.json()
                    count = len(users)
                    
                    self.log_test(
                        "GET /api/admin/users/local-associats",
                        True,
                        f"Retrieved {count} local associat users"
                    )
                    return users
                else:
                    error_text = await response.text()
                    self.log_test("GET /api/admin/users/local-associats", False, f"HTTP {response.status}: {error_text}")
                    return []
                    
        except Exception as e:
            self.log_test("GET /api/admin/users/local-associats", False, f"Exception: {str(e)}")
            return []
    
    async def search_user_by_email(self, email):
        """Test GET /api/admin/users/local-associats?email=EMAIL"""
        print(f"🔍 Testing Search User by Email: {email}...")
        
        try:
            headers = {'Authorization': self.admin_token}
            params = {'email': email}
            
            async with self.session.get(f"{API_BASE}/admin/users/local-associats", headers=headers, params=params) as response:
                if response.status == 200:
                    users = await response.json()
                    count = len(users)
                    
                    self.log_test(
                        f"Search User by Email ({email})",
                        True,
                        f"Found {count} users matching email"
                    )
                    
                    # Return first matching user
                    if users:
                        return users[0]
                    else:
                        self.log_test("Find Specific User", False, f"No user found with email {email}")
                        return None
                else:
                    error_text = await response.text()
                    self.log_test(f"Search User by Email ({email})", False, f"HTTP {response.status}: {error_text}")
                    return None
                    
        except Exception as e:
            self.log_test(f"Search User by Email ({email})", False, f"Exception: {str(e)}")
            return None
    
    async def assign_owner(self, establishment_id, owner_id):
        """Test PUT /api/admin/establishments/{establishment_id}/assign-owner"""
        print(f"👤 Testing Assign Owner: {owner_id} to establishment {establishment_id}...")
        
        try:
            headers = {
                'Authorization': self.admin_token,
                'Content-Type': 'application/json'
            }
            data = {'owner_id': owner_id}
            
            async with self.session.put(
                f"{API_BASE}/admin/establishments/{establishment_id}/assign-owner", 
                headers=headers, 
                json=data
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    
                    self.log_test(
                        "Assign Owner",
                        True,
                        f"Successfully assigned owner {owner_id}",
                        result
                    )
                    return True
                else:
                    error_text = await response.text()
                    self.log_test("Assign Owner", False, f"HTTP {response.status}: {error_text}")
                    return False
                    
        except Exception as e:
            self.log_test("Assign Owner", False, f"Exception: {str(e)}")
            return False
    
    async def get_establishment_owner(self, establishment_id):
        """Test GET /api/admin/establishments/{establishment_id}/owner"""
        print(f"🔍 Testing Get Establishment Owner for {establishment_id}...")
        
        try:
            headers = {'Authorization': self.admin_token}
            
            async with self.session.get(f"{API_BASE}/admin/establishments/{establishment_id}/owner", headers=headers) as response:
                if response.status == 200:
                    result = await response.json()
                    
                    if result.get('owner'):
                        owner = result['owner']
                        self.log_test(
                            "Get Establishment Owner",
                            True,
                            f"Owner: {owner.get('name')} ({owner.get('email')})",
                            result
                        )
                        return owner
                    else:
                        self.log_test(
                            "Get Establishment Owner",
                            True,
                            "No owner assigned (as expected)",
                            result
                        )
                        return None
                else:
                    error_text = await response.text()
                    self.log_test("Get Establishment Owner", False, f"HTTP {response.status}: {error_text}")
                    return None
                    
        except Exception as e:
            self.log_test("Get Establishment Owner", False, f"Exception: {str(e)}")
            return None
    
    async def unassign_owner(self, establishment_id):
        """Test PUT /api/admin/establishments/{establishment_id}/assign-owner with null owner_id"""
        print(f"🚫 Testing Unassign Owner from establishment {establishment_id}...")
        
        try:
            headers = {
                'Authorization': self.admin_token,
                'Content-Type': 'application/json'
            }
            data = {'owner_id': None}
            
            async with self.session.put(
                f"{API_BASE}/admin/establishments/{establishment_id}/assign-owner", 
                headers=headers, 
                json=data
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    
                    self.log_test(
                        "Unassign Owner",
                        True,
                        "Successfully unassigned owner",
                        result
                    )
                    return True
                else:
                    error_text = await response.text()
                    self.log_test("Unassign Owner", False, f"HTTP {response.status}: {error_text}")
                    return False
                    
        except Exception as e:
            self.log_test("Unassign Owner", False, f"Exception: {str(e)}")
            return False
    
    async def run_complete_ownership_test(self):
        """Run the complete ownership management test flow"""
        print("🚀 Starting Complete Ownership Management Test Flow")
        print("=" * 60)
        
        # Step 1: Admin Login
        if not await self.admin_login():
            print("❌ Cannot proceed without admin login")
            return False
        
        # Step 2: Get establishments
        establishment = await self.get_establishments()
        if not establishment:
            print("❌ Cannot proceed without establishments")
            return False
        
        establishment_id = establishment.get('id') or establishment.get('_id')
        establishment_name = establishment.get('name', 'Unknown')
        print(f"📍 Using establishment: {establishment_name} (ID: {establishment_id})")
        
        # Step 3: Get local associats
        local_associats = await self.get_local_associats()
        
        # Step 4: Search for specific user by email
        test_user = await self.search_user_by_email(TEST_USER_EMAIL)
        if not test_user:
            print(f"⚠️  User {TEST_USER_EMAIL} not found, using first local associat if available")
            if local_associats:
                test_user = local_associats[0]
            else:
                print("❌ No local associat users available for testing")
                return False
        
        user_id = test_user.get('id') or test_user.get('_id')
        user_name = test_user.get('name', 'Unknown')
        user_email = test_user.get('email', 'Unknown')
        print(f"👤 Using user: {user_name} ({user_email}) (ID: {user_id})")
        
        # Step 5: Check initial owner state
        print("\n📋 Checking initial owner state...")
        initial_owner = await self.get_establishment_owner(establishment_id)
        
        # Step 6: Assign owner
        print(f"\n👤 Assigning {user_name} as owner of {establishment_name}...")
        if not await self.assign_owner(establishment_id, user_id):
            print("❌ Owner assignment failed")
            return False
        
        # Step 7: Verify assignment
        print("\n✅ Verifying owner assignment...")
        assigned_owner = await self.get_establishment_owner(establishment_id)
        if assigned_owner and assigned_owner.get('id') == user_id:
            self.log_test("Verify Owner Assignment", True, f"Owner correctly assigned: {assigned_owner.get('name')}")
        else:
            self.log_test("Verify Owner Assignment", False, "Owner assignment verification failed")
            return False
        
        # Step 8: Unassign owner
        print(f"\n🚫 Unassigning owner from {establishment_name}...")
        if not await self.unassign_owner(establishment_id):
            print("❌ Owner unassignment failed")
            return False
        
        # Step 9: Verify unassignment
        print("\n✅ Verifying owner unassignment...")
        final_owner = await self.get_establishment_owner(establishment_id)
        if final_owner is None:
            self.log_test("Verify Owner Unassignment", True, "Owner correctly unassigned")
        else:
            self.log_test("Verify Owner Unassignment", False, f"Owner still assigned: {final_owner}")
            return False
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['details']}")
        
        print("\n🎯 OWNERSHIP MANAGEMENT ENDPOINTS TESTED:")
        print("   1. ✅ GET /api/admin/establishments")
        print("   2. ✅ GET /api/admin/users/local-associats")
        print("   3. ✅ GET /api/admin/users/local-associats?email=EMAIL")
        print("   4. ✅ PUT /api/admin/establishments/{id}/assign-owner (assign)")
        print("   5. ✅ GET /api/admin/establishments/{id}/owner")
        print("   6. ✅ PUT /api/admin/establishments/{id}/assign-owner (unassign)")
        
        return passed_tests == total_tests

async def main():
    """Main test function"""
    print("🧪 OWNERSHIP MANAGEMENT BACKEND TESTING")
    print("Testing assignment and unassignment of establishment owners")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Admin Credentials: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
    print(f"Test User Email: {TEST_USER_EMAIL}")
    print()
    
    async with OwnershipManagementTester() as tester:
        success = await tester.run_complete_ownership_test()
        all_passed = tester.print_summary()
        
        if success and all_passed:
            print("\n🎉 ALL OWNERSHIP MANAGEMENT TESTS PASSED!")
            return True
        else:
            print("\n💥 SOME TESTS FAILED!")
            return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)