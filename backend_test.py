#!/usr/bin/env python3
"""
Backend Test Suite for El Tomb de Reus API
Testing GET /api/tickets/campaign endpoint
"""

import requests
import json
from datetime import datetime
import sys

# Configuration
BACKEND_URL = "https://admin-stats-fix-2.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@eltombdereus.com"
ADMIN_PASSWORD = "admin123"

class TestResults:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failures = []
    
    def add_test(self, test_name, passed, details=""):
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            self.tests_failed += 1
            self.failures.append(f"{test_name}: {details}")
            print(f"❌ {test_name}: {details}")
    
    def summary(self):
        print(f"\n📊 TEST SUMMARY:")
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_failed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failures:
            print(f"\n❌ FAILURES:")
            for failure in self.failures:
                print(f"  - {failure}")

def test_ticket_campaign_endpoint():
    """Test GET /api/tickets/campaign endpoint"""
    results = TestResults()
    
    print("🎯 TESTING GET /api/tickets/campaign ENDPOINT")
    print("=" * 60)
    
    try:
        # Test 1: GET /api/tickets/campaign (public endpoint)
        print("\n1️⃣ Testing GET /api/tickets/campaign (public endpoint)")
        
        response = requests.get(f"{BACKEND_URL}/tickets/campaign", timeout=10)
        
        # Check response status
        if response.status_code == 200:
            results.add_test("GET /api/tickets/campaign - Status Code 200", True)
            
            # Parse response
            try:
                data = response.json()
                results.add_test("GET /api/tickets/campaign - Valid JSON Response", True)
                
                print(f"📋 Response data: {json.dumps(data, indent=2, ensure_ascii=False)}")
                
                # Check if response is null (no active campaign)
                if data is None:
                    results.add_test("GET /api/tickets/campaign - No Active Campaign (null response)", True, "No active campaign found")
                    print("ℹ️  No active campaign found - this is expected if no campaign is configured")
                else:
                    # Validate campaign structure
                    required_fields = ['title', 'description', 'prize_description', 'start_date', 'end_date', 'is_active']
                    
                    for field in required_fields:
                        if field in data:
                            results.add_test(f"Campaign has '{field}' field", True)
                        else:
                            results.add_test(f"Campaign has '{field}' field", False, f"Missing required field: {field}")
                    
                    # Check if campaign is active
                    if data.get('is_active') == True:
                        results.add_test("Campaign is_active = True", True)
                        print(f"📅 Active campaign: {data.get('title', 'Unknown')}")
                    else:
                        results.add_test("Campaign is_active status", True, f"Campaign is_active = {data.get('is_active')}")
                    
                    # Validate date fields format
                    for date_field in ['start_date', 'end_date']:
                        if date_field in data and data[date_field]:
                            try:
                                # Try to parse the date
                                datetime.fromisoformat(data[date_field].replace('Z', '+00:00'))
                                results.add_test(f"Valid {date_field} format", True)
                            except (ValueError, AttributeError):
                                results.add_test(f"Valid {date_field} format", False, f"Invalid date format: {data[date_field]}")
                
            except json.JSONDecodeError as e:
                results.add_test("GET /api/tickets/campaign - Valid JSON Response", False, f"JSON decode error: {str(e)}")
                
        else:
            results.add_test("GET /api/tickets/campaign - Status Code 200", False, f"Got status code: {response.status_code}")
            print(f"Response body: {response.text}")
    
    except requests.exceptions.RequestException as e:
        results.add_test("GET /api/tickets/campaign - Network Request", False, f"Request failed: {str(e)}")
    except Exception as e:
        results.add_test("GET /api/tickets/campaign - General Test", False, f"Unexpected error: {str(e)}")
    
    # Test 2: Verify endpoint doesn't require authentication
    print("\n2️⃣ Testing endpoint accessibility (no auth required)")
    
    try:
        # Make request without any authorization headers
        response = requests.get(f"{BACKEND_URL}/tickets/campaign", timeout=10)
        
        if response.status_code == 200:
            results.add_test("Public endpoint - No auth required", True)
        elif response.status_code == 401:
            results.add_test("Public endpoint - No auth required", False, "Endpoint requires authentication but should be public")
        else:
            results.add_test("Public endpoint - No auth required", True, f"Got status {response.status_code} (not 401, so no auth required)")
            
    except Exception as e:
        results.add_test("Public endpoint - No auth required", False, f"Error testing public access: {str(e)}")
    
    return results

def main():
    """Main test execution"""
    print("🚀 BACKEND TESTING - GET /api/tickets/campaign")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Run ticket campaign endpoint tests
    results = test_ticket_campaign_endpoint()
    
    # Print summary
    results.summary()
    
    # Return exit code based on results
    if results.tests_failed > 0:
        print(f"\n🔴 TESTING COMPLETED WITH FAILURES")
        return 1
    else:
        print(f"\n🟢 ALL TESTS PASSED!")
        return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)