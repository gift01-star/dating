#!/bin/bash

# EduLove: 8-Feature Implementation - Validation Script
# Checks syntax, dependencies, and configuration

echo "🔍 EduLove Feature Implementation Validation"
echo "============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0

# Function to check file syntax
check_syntax() {
    local file=$1
    if node -c "$file" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $file"
        ((PASS++))
    else
        echo -e "${RED}❌${NC} $file"
        ((FAIL++))
    fi
}

# Function to check if file exists
check_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $file exists"
        ((PASS++))
    else
        echo -e "${RED}❌${NC} $file missing"
        ((FAIL++))
    fi
}

# Function to check package installed
check_package() {
    local pkg=$1
    if npm list "$pkg" --depth=0 >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} npm package: $pkg"
        ((PASS++))
    else
        echo -e "${RED}❌${NC} npm package: $pkg (missing)"
        ((FAIL++))
    fi
}

echo "📦 Backend Files..."
check_file "backend/utils/emailService.js"
check_file "backend/utils/twoFactorAuth.js"
check_file "backend/routes/auth.js"
check_file "backend/routes/users.js"
check_file "backend/routes/messages.js"
check_file "backend/routes/matches.js"

echo ""
echo "📦 Frontend Files..."
check_file "frontend/src/pages/ProfileViewsPage.js"
check_file "frontend/src/pages/FavoritesPage.js"
check_file "frontend/src/components/TwoFactorAuth.js"

echo ""
echo "✨ Syntax Validation..."
cd backend
check_syntax "utils/emailService.js"
check_syntax "utils/twoFactorAuth.js"
check_syntax "routes/auth.js"
check_syntax "routes/users.js"
check_syntax "routes/messages.js"
check_syntax "routes/matches.js"

echo ""
echo "📚 Dependencies..."
check_package "speakeasy"
check_package "qrcode"
check_package "nodemailer"

echo ""
echo "============================================="
echo "Test Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All validations passed!${NC}"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Configure .env with:"
    echo "   - EMAIL_USER (or SENDGRID_API_KEY)"
    echo "   - EMAIL_PASSWORD"
    echo "   - FRONTEND_URL"
    echo ""
    echo "2. Integrate components into ProfilePage:"
    echo "   - Import TwoFactorAuth component"
    echo "   - Add to Security section"
    echo ""
    echo "3. Test each feature:"
    echo "   - Email notifications"
    echo "   - 2FA setup and login"
    echo "   - Message search"
    echo "   - Profile views"
    echo "   - Favorites"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some validations failed!${NC}"
    exit 1
fi
