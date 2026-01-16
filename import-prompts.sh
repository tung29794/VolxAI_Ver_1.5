#!/bin/bash

# ================================================================
# Import AI Prompts vào Production Database
# ================================================================
# Script này sẽ import 5 AI prompts vào database production
# Các prompts: expand_content, rewrite_content, generate_article,
#              generate_seo_title, generate_meta_description
# ================================================================

echo "🗄️  Importing AI Prompts to Production Database..."
echo ""

# Database credentials
DB_HOST="103.221.221.67"
DB_PORT="3306"
DB_USER="jybcaorr_lisacontentdbapi"
DB_NAME="jybcaorr_lisacontentdbapi"
SQL_FILE="IMPORT_ALL_AI_PROMPTS.sql"

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ ERROR: SQL file not found: $SQL_FILE"
    echo "Please make sure you're in the correct directory."
    exit 1
fi

echo "📋 Configuration:"
echo "   Database Host: $DB_HOST:$DB_PORT"
echo "   Database Name: $DB_NAME"
echo "   Database User: $DB_USER"
echo "   SQL File: $SQL_FILE"
echo ""

# Prompt for password
echo "🔐 Please enter database password:"
read -s DB_PASSWORD
echo ""

# Import SQL
echo "📥 Importing SQL prompts..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SQL_FILE"

# Check result
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! AI Prompts imported successfully!"
    echo ""
    echo "📊 Verify import:"
    echo "   SELECT feature_name, display_name, is_active FROM ai_prompts;"
    echo ""
    echo "🎯 Next steps:"
    echo "   1. Go to https://volxai.com/admin"
    echo "   2. Navigate to 'AI Prompts' tab"
    echo "   3. Verify 5 prompts are listed"
    echo "   4. Test each AI function:"
    echo "      - Expand Content (Write More)"
    echo "      - Rewrite Content"
    echo "      - Generate Article"
    echo "      - Generate SEO Title"
    echo "      - Generate Meta Description"
    echo ""
else
    echo ""
    echo "❌ ERROR: Failed to import SQL prompts"
    echo "Please check your database credentials and try again."
    echo ""
    exit 1
fi
