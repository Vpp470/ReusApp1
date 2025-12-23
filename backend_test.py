#!/usr/bin/env python3
"""
Backend Test Suite for Web Push Notifications System
Tests the new Web Push notification endpoints as requested in the review.
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime

# Backend URL from frontend environment
BACKEND_URL = "https://eltomb-app.preview.emergentagent.com/api"
BASE_URL = "https://eltomb-app.preview.emergentagent.com"

# Test credentials
ADMIN_CREDENTIALS = {
    "email": "admin@reusapp.com",
    "password": "admin123"
}

USER_CREDENTIALS = {
    "email": "flapsreus@gmail.com", 
    "password": "flaps123"
}

class WebPushTester:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.session = None
        self.test_results = []
        
    async def setup(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup(self):
        """Cleanup HTTP session"""
        if self.session:
            await self.session.close()
            
    def log_test(self, test_name, success, details="", status_code=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "status_code": status_code,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        if status_code:
            print(f"    Status Code: {status_code}")
        print()
        
    async def login_admin(self):
        """Login as admin and get token"""
        try:
            params = {
                "email": ADMIN_CREDENTIALS["email"],
                "password": ADMIN_CREDENTIALS["password"]
            }
            
            async with self.session.post(f"{BACKEND_URL}/auth/login", params=params) as response:
                if response.status == 200:
                    result = await response.json()
                    self.admin_token = result.get("token")
                    self.log_test(
                        "Admin Login", 
                        True, 
                        f"Token: {self.admin_token[:20]}..., Role: {result.get('user', {}).get('role')}", 
                        response.status
                    )
                    return True
                else:
                    error_text = await response.text()
                    self.log_test("Admin Login", False, f"Login failed: {error_text}", response.status)
                    return False
                    
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False
            
    async def login_user(self):
        """Login as regular user and get token"""
        try:
            params = {
                "email": USER_CREDENTIALS["email"],
                "password": USER_CREDENTIALS["password"]
            }
            
            async with self.session.post(f"{BACKEND_URL}/auth/login", params=params) as response:
                if response.status == 200:
                    result = await response.json()
                    self.user_token = result.get("token")
                    self.log_test(
                        "User Login", 
                        True, 
                        f"Token: {self.user_token[:20]}..., Role: {result.get('user', {}).get('role')}", 
                        response.status
                    )
                    return True
                else:
                    error_text = await response.text()
                    self.log_test("User Login", False, f"Login failed: {error_text}", response.status)
                    return False
                    
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")
            return False
            
    async def test_update_push_token(self):
        """Test PUT /api/users/push-token endpoint"""
        if not self.user_token:
            self.log_test("PUT /api/users/push-token", False, "No user token available")
            return
            
        try:
            # Test with valid Expo push token format
            test_token = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
            
            headers = {"Authorization": self.user_token}
            data = {"push_token": test_token}
            
            async with self.session.put(
                f"{BACKEND_URL}/users/push-token", 
                headers=headers,
                json=data
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    success = result.get("success", False)
                    message = result.get("message", "")
                    
                    self.log_test(
                        "PUT /api/users/push-token", 
                        success, 
                        f"Message: {message}", 
                        response.status
                    )
                else:
                    error_text = await response.text()
                    self.log_test(
                        "PUT /api/users/push-token", 
                        False, 
                        f"Failed: {error_text}", 
                        response.status
                    )
                    
        except Exception as e:
            self.log_test("PUT /api/users/push-token", False, f"Exception: {str(e)}")
            
    async def test_update_push_token_unauthorized(self):
        """Test PUT /api/users/push-token without authorization"""
        try:
            test_token = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
            data = {"push_token": test_token}
            
            async with self.session.put(
                f"{BACKEND_URL}/users/push-token", 
                json=data
            ) as response:
                
                # Should return 401 Unauthorized
                if response.status == 401:
                    self.log_test(
                        "PUT /api/users/push-token (Unauthorized)", 
                        True, 
                        "Correctly blocked unauthorized access", 
                        response.status
                    )
                else:
                    error_text = await response.text()
                    self.log_test(
                        "PUT /api/users/push-token (Unauthorized)", 
                        False, 
                        f"Should return 401, got: {error_text}", 
                        response.status
                    )
                    
        except Exception as e:
            self.log_test("PUT /api/users/push-token (Unauthorized)", False, f"Exception: {str(e)}")
            
    async def test_notification_stats(self):
        """Test GET /api/admin/notifications/stats endpoint"""
        if not self.admin_token:
            self.log_test("GET /api/admin/notifications/stats", False, "No admin token available")
            return
            
        try:
            headers = {"Authorization": self.admin_token}
            
            async with self.session.get(
                f"{BACKEND_URL}/admin/notifications/stats", 
                headers=headers
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    
                    # Check expected fields
                    expected_fields = ["total_users_with_token", "by_role", "notifications_last_30_days"]
                    missing_fields = [field for field in expected_fields if field not in result]
                    
                    if not missing_fields:
                        total_users = result.get("total_users_with_token", 0)
                        by_role = result.get("by_role", {})
                        notifications_count = result.get("notifications_last_30_days", 0)
                        
                        details = f"Total users with token: {total_users}, By role: {by_role}, Notifications last 30 days: {notifications_count}"
                        
                        self.log_test(
                            "GET /api/admin/notifications/stats", 
                            True, 
                            details, 
                            response.status
                        )
                    else:
                        self.log_test(
                            "GET /api/admin/notifications/stats", 
                            False, 
                            f"Missing fields: {missing_fields}", 
                            response.status
                        )
                else:
                    error_text = await response.text()
                    self.log_test(
                        "GET /api/admin/notifications/stats", 
                        False, 
                        f"Failed: {error_text}", 
                        response.status
                    )
                    
        except Exception as e:
            self.log_test("GET /api/admin/notifications/stats", False, f"Exception: {str(e)}")
            
    async def test_notification_stats_unauthorized(self):
        """Test GET /api/admin/notifications/stats without admin token"""
        try:
            async with self.session.get(f"{BACKEND_URL}/admin/notifications/stats") as response:
                
                # Should return 401 or 403
                if response.status in [401, 403]:
                    self.log_test(
                        "GET /api/admin/notifications/stats (Unauthorized)", 
                        True, 
                        "Correctly blocked unauthorized access", 
                        response.status
                    )
                else:
                    error_text = await response.text()
                    self.log_test(
                        "GET /api/admin/notifications/stats (Unauthorized)", 
                        False, 
                        f"Should return 401/403, got: {error_text}", 
                        response.status
                    )
                    
        except Exception as e:
            self.log_test("GET /api/admin/notifications/stats (Unauthorized)", False, f"Exception: {str(e)}")
            
    async def test_notification_history(self):
        """Test GET /api/admin/notifications/history endpoint"""
        if not self.admin_token:
            self.log_test("GET /api/admin/notifications/history", False, "No admin token available")
            return
            
        try:
            headers = {"Authorization": self.admin_token}
            
            async with self.session.get(
                f"{BACKEND_URL}/admin/notifications/history?limit=50", 
                headers=headers
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    
                    if isinstance(result, list):
                        history_count = len(result)
                        
                        # Check structure of first item if exists
                        if history_count > 0:
                            first_item = result[0]
                            expected_fields = ["title", "body", "target", "sent_at"]
                            has_required_fields = all(field in first_item for field in expected_fields)
                            
                            details = f"History count: {history_count}, Structure valid: {has_required_fields}"
                        else:
                            details = f"History count: {history_count} (empty as expected - no notifications sent yet)"
                            
                        self.log_test(
                            "GET /api/admin/notifications/history", 
                            True, 
                            details, 
                            response.status
                        )
                    else:
                        self.log_test(
                            "GET /api/admin/notifications/history", 
                            False, 
                            f"Expected array, got: {type(result)}", 
                            response.status
                        )
                else:
                    error_text = await response.text()
                    self.log_test(
                        "GET /api/admin/notifications/history", 
                        False, 
                        f"Failed: {error_text}", 
                        response.status
                    )
                    
        except Exception as e:
            self.log_test("GET /api/admin/notifications/history", False, f"Exception: {str(e)}")
            
    async def test_notification_history_unauthorized(self):
        """Test GET /api/admin/notifications/history without admin token"""
        try:
            async with self.session.get(f"{BACKEND_URL}/admin/notifications/history") as response:
                
                # Should return 401 or 403
                if response.status in [401, 403]:
                    self.log_test(
                        "GET /api/admin/notifications/history (Unauthorized)", 
                        True, 
                        "Correctly blocked unauthorized access", 
                        response.status
                    )
                else:
                    error_text = await response.text()
                    self.log_test(
                        "GET /api/admin/notifications/history (Unauthorized)", 
                        False, 
                        f"Should return 401/403, got: {error_text}", 
                        response.status
                    )
                    
        except Exception as e:
            self.log_test("GET /api/admin/notifications/history (Unauthorized)", False, f"Exception: {str(e)}")
            
    async def test_send_notification(self):
        """Test POST /api/admin/notifications/send endpoint"""
        if not self.admin_token:
            self.log_test("POST /api/admin/notifications/send", False, "No admin token available")
            return
            
        try:
            headers = {"Authorization": self.admin_token}
            
            # Test notification data
            notification_data = {
                "title": "Test Notification",
                "body": "This is a test notification from the testing suite",
                "target": "all"
            }
            
            async with self.session.post(
                f"{BACKEND_URL}/admin/notifications/send", 
                headers=headers,
                json=notification_data
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    
                    # Check expected response structure
                    expected_fields = ["success", "sent_count", "failed_count", "message"]
                    missing_fields = [field for field in expected_fields if field not in result]
                    
                    if not missing_fields:
                        success = result.get("success", False)
                        sent_count = result.get("sent_count", 0)
                        failed_count = result.get("failed_count", 0)
                        message = result.get("message", "")
                        
                        details = f"Success: {success}, Sent: {sent_count}, Failed: {failed_count}, Message: {message}"
                        
                        # Should succeed even with 0 sends (no users with push tokens)
                        self.log_test(
                            "POST /api/admin/notifications/send", 
                            success, 
                            details, 
                            response.status
                        )
                    else:
                        self.log_test(
                            "POST /api/admin/notifications/send", 
                            False, 
                            f"Missing fields: {missing_fields}", 
                            response.status
                        )
                else:
                    error_text = await response.text()
                    self.log_test(
                        "POST /api/admin/notifications/send", 
                        False, 
                        f"Failed: {error_text}", 
                        response.status
                    )
                    
        except Exception as e:
            self.log_test("POST /api/admin/notifications/send", False, f"Exception: {str(e)}")
            
    async def test_send_notification_different_targets(self):
        """Test POST /api/admin/notifications/send with different target types"""
        if not self.admin_token:
            self.log_test("POST /api/admin/notifications/send (Different Targets)", False, "No admin token available")
            return
            
        targets_to_test = ["users", "admins", "role:local_associat"]
        
        for target in targets_to_test:
            try:
                headers = {"Authorization": self.admin_token}
                
                notification_data = {
                    "title": f"Test Notification for {target}",
                    "body": f"Testing target: {target}",
                    "target": target
                }
                
                async with self.session.post(
                    f"{BACKEND_URL}/admin/notifications/send", 
                    headers=headers,
                    json=notification_data
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        success = result.get("success", False)
                        sent_count = result.get("sent_count", 0)
                        message = result.get("message", "")
                        
                        details = f"Target: {target}, Success: {success}, Sent: {sent_count}, Message: {message}"
                        
                        self.log_test(
                            f"POST /api/admin/notifications/send (Target: {target})", 
                            success, 
                            details, 
                            response.status
                        )
                    else:
                        error_text = await response.text()
                        self.log_test(
                            f"POST /api/admin/notifications/send (Target: {target})", 
                            False, 
                            f"Failed: {error_text}", 
                            response.status
                        )
                        
            except Exception as e:
                self.log_test(f"POST /api/admin/notifications/send (Target: {target})", False, f"Exception: {str(e)}")
                
    async def test_send_notification_unauthorized(self):
        """Test POST /api/admin/notifications/send without admin token"""
        try:
            notification_data = {
                "title": "Unauthorized Test",
                "body": "This should fail",
                "target": "all"
            }
            
            async with self.session.post(
                f"{BACKEND_URL}/admin/notifications/send", 
                json=notification_data
            ) as response:
                
                # Should return 401 or 403
                if response.status in [401, 403]:
                    self.log_test(
                        "POST /api/admin/notifications/send (Unauthorized)", 
                        True, 
                        "Correctly blocked unauthorized access", 
                        response.status
                    )
                else:
                    error_text = await response.text()
                    self.log_test(
                        "POST /api/admin/notifications/send (Unauthorized)", 
                        False, 
                        f"Should return 401/403, got: {error_text}", 
                        response.status
                    )
                    
        except Exception as e:
            self.log_test("POST /api/admin/notifications/send (Unauthorized)", False, f"Exception: {str(e)}")
            
    async def run_all_tests(self):
        """Run all push notification tests"""
        print("🚀 STARTING PUSH NOTIFICATIONS BACKEND TESTING")
        print("=" * 60)
        print()
        
        await self.setup()
        
        try:
            # Authentication tests
            print("🔐 AUTHENTICATION TESTS")
            print("-" * 30)
            await self.login_admin()
            await self.login_user()
            print()
            
            # Push token tests
            print("📱 PUSH TOKEN TESTS")
            print("-" * 30)
            await self.test_update_push_token()
            await self.test_update_push_token_unauthorized()
            print()
            
            # Notification stats tests
            print("📊 NOTIFICATION STATS TESTS")
            print("-" * 30)
            await self.test_notification_stats()
            await self.test_notification_stats_unauthorized()
            print()
            
            # Notification history tests
            print("📋 NOTIFICATION HISTORY TESTS")
            print("-" * 30)
            await self.test_notification_history()
            await self.test_notification_history_unauthorized()
            print()
            
            # Send notification tests
            print("📤 SEND NOTIFICATION TESTS")
            print("-" * 30)
            await self.test_send_notification()
            await self.test_send_notification_different_targets()
            await self.test_send_notification_unauthorized()
            print()
            
        finally:
            await self.cleanup()
            
        # Print summary
        self.print_summary()
        
    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
            print()
            
        print("✅ PASSED TESTS:")
        for result in self.test_results:
            if result["success"]:
                print(f"  - {result['test']}")
        print()
        
        # Overall result
        if failed_tests == 0:
            print("🎉 ALL TESTS PASSED! Push Notifications System is working correctly.")
        else:
            print(f"⚠️  {failed_tests} test(s) failed. Please review the issues above.")
            
        return failed_tests == 0

async def main():
    """Main test runner"""
    tester = PushNotificationTester()
    success = await tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())