#!/bin/bash

# Script de testing para SimpleSerenatas API
# Verifica endpoints principales

echo "🧪 Testeando SimpleSerenatas API..."
echo ""

BASE_URL="http://localhost:3001/api"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$BASE_URL$endpoint")
    
    if [ $response -eq 200 ] || [ $response -eq 401 ]; then
        echo -e "${GREEN}✓${NC} ($response)"
        return 0
    else
        echo -e "${RED}✗${NC} ($response)"
        return 1
    fi
}

# Test Auth
echo "🔐 Auth Endpoints"
test_endpoint "GET" "/auth/me" "Get current user"

echo ""
echo "📍 Serenatas Endpoints"
test_endpoint "GET" "/serenatas" "List serenatas"
test_endpoint "GET" "/serenatas/captains" "List captains"
test_endpoint "GET" "/serenatas/captains/me" "Get captain profile"

echo ""
echo "💰 Finance Endpoints"
test_endpoint "GET" "/serenatas/captains/me/finances" "Get finances"
test_endpoint "GET" "/serenatas/captains/me/transactions" "Get transactions"

echo ""
echo "💬 Chat Endpoints"
test_endpoint "GET" "/serenatas/conversations" "List conversations"

echo ""
echo "🔔 Notification Endpoints"
test_endpoint "GET" "/serenatas/notifications" "List notifications"

echo ""
echo "📊 Reviews Endpoints"
test_endpoint "GET" "/serenatas/captains/test-id/reviews" "Get captain reviews"

echo ""
echo "✅ Tests completados!"
