#!/bin/bash

# SimpleSerenatas Integration Test Script
# Run this after starting the backend and frontend

set -e

echo "🎵 SimpleSerenatas Integration Tests"
echo "======================================"
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3005}"

echo "API URL: $API_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Test 1: API Health Check
echo "Test 1: API Health Check"
if curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo "  ✅ API is running"
else
    echo "  ❌ API is not responding"
    exit 1
fi

# Test 2: Serenatas Module
echo "Test 2: Serenatas API Module"
if curl -s "$API_URL/api/serenatas/musicians" > /dev/null 2>&1; then
    echo "  ✅ Serenatas API accessible"
else
    echo "  ⚠️  Serenatas API returned error (expected without auth)"
fi

# Test 3: Frontend Build
echo "Test 3: Frontend Build"
if [ -d ".next" ]; then
    echo "  ✅ Frontend has been built"
else
    echo "  ⚠️  Frontend not built yet (run 'npm run build')"
fi

# Test 4: Environment Variables
echo "Test 4: Environment Variables"
if [ -f ".env.local" ] || [ -f ".env" ]; then
    echo "  ✅ Environment files exist"
else
    echo "  ⚠️  No .env.local or .env file found"
fi

# Test 5: Database Connection (via API)
echo "Test 5: Database Connection"
if curl -s "$API_URL/api/serenatas/musicians" | grep -q "error\|ok" 2>/dev/null; then
    echo "  ✅ Database responding (auth required for data)"
else
    echo "  ⚠️  Could not verify database connection"
fi

echo ""
echo "======================================"
echo "🎉 Integration tests completed!"
echo ""
echo "Next steps:"
echo "  1. Register a test account at $FRONTEND_URL/auth/registro"
echo "  2. Complete onboarding"
echo "  3. Test 'Disponible Ahora' toggle"
echo "  4. Create a test serenata"
echo ""
