#!/usr/bin/env python3
"""
URGENT TEST: Promocions amb imatge a Emergent
Test immediat per verificar si el sistema funciona correctament aquí abans de Railway.
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime, timezone

# Configuration
BACKEND_URL = "https://admin-stats-hub.preview.emergentagent.com/api"
LOCAL_ASSOCIAT_EMAIL = "flapsreus@gmail.com"
LOCAL_ASSOCIAT_PASSWORD = "flaps123"

# Imatge base64 de test (petita imatge JPEG vàlida)
TEST_IMAGE_BASE64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AD//Z"

class PromotionTester:
    def __init__(self):
        self.session = None
        self.token = None
        self.test_results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test(self, test_name, success, details="", error=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()
    
    async def local_associat_login(self):
        """Login as local_associat and get token"""
        try:
            # Login endpoint expects query parameters
            params = {
                "email": LOCAL_ASSOCIAT_EMAIL,
                "password": LOCAL_ASSOCIAT_PASSWORD
            }
            
            async with self.session.post(
                f"{BACKEND_URL}/auth/login",
                params=params
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    self.token = result.get("token")
                    user = result.get("user", {})
                    user_role = user.get("role")
                    
                    self.log_test(
                        "Local Associat Login",
                        True,
                        f"Successfully authenticated as {LOCAL_ASSOCIAT_EMAIL}, Role: {user_role}, Token: {self.token[:20]}..."
                    )
                    
                    # Verify role is local_associat
                    if user_role != 'local_associat':
                        self.log_test(
                            "Role Verification",
                            False,
                            error=f"Expected role 'local_associat', got '{user_role}'"
                        )
                        return False
                    
                    return True
                else:
                    error_text = await response.text()
                    self.log_test(
                        "Local Associat Login",
                        False,
                        error=f"Status {response.status}: {error_text}"
                    )
                    return False
                    
        except Exception as e:
            self.log_test("Local Associat Login", False, error=str(e))
            return False
    
    async def test_create_promotion_with_image(self):
        """Test POST /api/promotions amb imatge base64"""
        try:
            headers = {
                "Authorization": f"token_{self.token}",
                "Content-Type": "application/json"
            }
            
            promotion_data = {
                "title": "Test Promoció NOW",
                "description": "Test immediat",
                "image_url": TEST_IMAGE_BASE64,
                "valid_from": "2025-12-15T10:00:00.000Z",
                "valid_until": "2025-12-31T23:59:59.999Z",
                "link_url": "https://test.com"
            }
            
            async with self.session.post(
                f"{BACKEND_URL}/promotions",
                json=promotion_data,
                headers=headers
            ) as response:
                response_text = await response.text()
                
                print(f"📊 Response Status: {response.status}")
                print(f"📄 Response Headers: {dict(response.headers)}")
                print(f"📝 Response Body: {response_text[:500]}...")
                
                if response.status in [200, 201]:
                    try:
                        promotion_result = json.loads(response_text)
                        promotion_id = promotion_result.get("id") or promotion_result.get("_id")
                        
                        self.log_test(
                            "POST /api/promotions (create with image)",
                            True,
                            f"Promoció creada correctament - ID: {promotion_id}, Status: {response.status}"
                        )
                        
                        # Verify image_url contains base64 data
                        if promotion_result.get("image_url") == TEST_IMAGE_BASE64:
                            self.log_test(
                                "Image Base64 Verification",
                                True,
                                "Imatge base64 guardada correctament"
                            )
                        else:
                            self.log_test(
                                "Image Base64 Verification",
                                False,
                                error="Imatge base64 no coincideix o no s'ha guardat"
                            )
                        
                        # Verify dates conversion
                        if promotion_result.get("valid_from") and promotion_result.get("valid_until"):
                            self.log_test(
                                "Date Conversion Verification",
                                True,
                                f"Dates convertides: {promotion_result.get('valid_from')} - {promotion_result.get('valid_until')}"
                            )
                        else:
                            self.log_test(
                                "Date Conversion Verification",
                                False,
                                error="Dates no convertides correctament"
                            )
                        
                        return promotion_result
                        
                    except json.JSONDecodeError:
                        self.log_test(
                            "POST /api/promotions (create with image)",
                            False,
                            error=f"Resposta no és JSON vàlid: {response_text}"
                        )
                        return None
                        
                elif response.status == 422:
                    self.log_test(
                        "POST /api/promotions (create with image)",
                        False,
                        error=f"ERROR 422 Unprocessable Content - El problema persisteix! Response: {response_text}"
                    )
                    return None
                elif response.status == 500:
                    self.log_test(
                        "POST /api/promotions (create with image)",
                        False,
                        error=f"ERROR 500 Internal Server Error: {response_text}"
                    )
                    return None
                elif response.status == 401:
                    self.log_test(
                        "POST /api/promotions (create with image)",
                        False,
                        error=f"ERROR 401 Unauthorized: {response_text}"
                    )
                    return None
                else:
                    self.log_test(
                        "POST /api/promotions (create with image)",
                        False,
                        error=f"ERROR {response.status}: {response_text}"
                    )
                    return None
                    
        except Exception as e:
            self.log_test(
                "POST /api/promotions (create with image)",
                False,
                error=str(e)
            )
            return None
    
    async def test_get_promotions_list(self):
        """Test GET /api/promotions to verify new promotion appears"""
        try:
            headers = {
                "Authorization": f"token_{self.token}",
                "Content-Type": "application/json"
            }
            
            async with self.session.get(
                f"{BACKEND_URL}/promotions",
                headers=headers
            ) as response:
                if response.status == 200:
                    promotions = await response.json()
                    
                    # Look for our test promotion
                    test_promotion = None
                    for promo in promotions:
                        if promo.get("title") == "Test Promoció NOW":
                            test_promotion = promo
                            break
                    
                    if test_promotion:
                        status = test_promotion.get("status", "unknown")
                        self.log_test(
                            "GET /api/promotions (verify new promotion)",
                            True,
                            f"Promoció trobada a la llista - Total: {len(promotions)}, Status: {status}"
                        )
                        return promotions
                    else:
                        self.log_test(
                            "GET /api/promotions (verify new promotion)",
                            False,
                            error=f"Promoció 'Test Promoció NOW' no trobada entre {len(promotions)} promocions"
                        )
                        return promotions
                        
                else:
                    error_text = await response.text()
                    self.log_test(
                        "GET /api/promotions (verify new promotion)",
                        False,
                        error=f"Status {response.status}: {error_text}"
                    )
                    return []
                    
        except Exception as e:
            self.log_test(
                "GET /api/promotions (verify new promotion)",
                False,
                error=str(e)
            )
            return []
    
    async def test_backend_health(self):
        """Test backend health endpoint"""
        try:
            async with self.session.get(f"{BACKEND_URL}/health") as response:
                if response.status == 200:
                    health_data = await response.json()
                    self.log_test(
                        "Backend Health Check",
                        True,
                        f"Backend is healthy: {health_data}"
                    )
                    return True
                else:
                    self.log_test(
                        "Backend Health Check",
                        False,
                        error=f"Health check failed with status {response.status}"
                    )
                    return False
        except Exception as e:
            self.log_test(
                "Backend Health Check",
                False,
                error=str(e)
            )
            return False
    
    async def run_all_tests(self):
        """Run all tests for promotion creation with image"""
        print("🚀 URGENT TEST: Promocions amb imatge a Emergent")
        print("=" * 80)
        print()
        
        # 1. Backend health check
        if not await self.test_backend_health():
            print("⚠️  Backend health check failed, but continuing...")
        
        # 2. Local associat login
        if not await self.local_associat_login():
            print("❌ Cannot proceed without local_associat authentication")
            return False
        
        # 3. Create promotion with image
        promotion = await self.test_create_promotion_with_image()
        if not promotion:
            print("❌ Promotion creation failed - this is the main issue!")
            return False
        
        # 4. Verify promotion appears in list
        await self.test_get_promotions_list()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("🎯 RESUM DELS TESTS DE PROMOCIONS AMB IMATGE")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ TESTS FALLITS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['error']}")
            print()
        
        # Overall assessment and conclusion
        if failed_tests == 0:
            print("🎉 TOTS ELS TESTS HAN PASSAT!")
            print("✅ CONCLUSIÓ: El sistema funciona correctament a Emergent.")
            print("   El problema és específic de Railway, no del codi.")
        else:
            print("⚠️  HI HA ERRORS DETECTATS!")
            print("❌ CONCLUSIÓ: El problema també existeix a Emergent.")
            print("   El problema és del codi, no específic de Railway.")
        
        return failed_tests == 0

async def main():
    """Main test execution"""
    async with PromotionTester() as tester:
        success = await tester.run_all_tests()
        overall_success = tester.print_summary()
        
        # Exit with appropriate code
        sys.exit(0 if overall_success else 1)

if __name__ == "__main__":
    asyncio.run(main())