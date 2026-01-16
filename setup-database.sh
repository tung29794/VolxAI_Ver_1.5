#!/bin/bash

# ================================================================
# Setup Database cho AI Prompts
# ================================================================
# Script này sẽ:
# 1. Tạo table ai_prompts (nếu chưa có)
# 2. Import 5 default prompts
# ================================================================

echo "🗄️  Setting up AI Prompts Database..."
echo ""

# Database credentials
DB_HOST="103.221.221.67"
DB_PORT="3306"
DB_USER="jybcaorr_lisacontentdbapi"
DB_NAME="jybcaorr_lisacontentdbapi"

# Check if SQL files exist
if [ ! -f "CREATE_AI_PROMPTS_TABLE_IF_NOT_EXISTS.sql" ]; then
    echo "❌ ERROR: CREATE_AI_PROMPTS_TABLE_IF_NOT_EXISTS.sql not found"
    exit 1
fi

if [ ! -f "IMPORT_ALL_AI_PROMPTS.sql" ]; then
    echo "❌ ERROR: IMPORT_ALL_AI_PROMPTS.sql not found"
    exit 1
fi

# Prompt for password
echo "🔐 Please enter database password:"
read -s DB_PASSWORD
echo ""

# Step 1: Create table
echo "📋 Step 1: Creating ai_prompts table..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < CREATE_AI_PROMPTS_TABLE_IF_NOT_EXISTS.sql

if [ $? -eq 0 ]; then
    echo "✅ Table created successfully (or already exists)"
else
    echo "❌ ERROR: Failed to create table"
    exit 1
fi

echo ""

# Step 2: Import prompts
echo "📥 Step 2: Importing 5 AI prompts..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < IMPORT_ALL_AI_PROMPTS.sql

if [ $? -eq 0 ]; then
    echo "✅ Prompts imported successfully"
else
    echo "❌ ERROR: Failed to import prompts"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Database setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Verify data:"
echo "   mysql> SELECT feature_name, display_name, is_active FROM ai_prompts;"
echo ""
echo "🎯 Next steps:"
echo "   1. Go to https://volxai.com/admin"
echo "   2. Click 'AI Prompts' tab"
echo "   3. You should see 5 prompts"
echo ""
echo "🧪 Test with:"
echo "   ./test-ai-functions.sh"
echo ""
