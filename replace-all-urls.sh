#!/bin/bash

# Replace all occurrences of old IP URL with new HTTPS domain
# This script updates documentation and configuration files

echo "🔄 Replacing all occurrences of http://103.221.221.67:3000 with https://api.volxai.com"

# Function to safely replace in a file
replace_in_file() {
  local file=$1
  if [ -f "$file" ]; then
    sed -i 's|http://103\.221\.221\.67:3000|https://api.volxai.com|g' "$file"
    echo "✓ Updated: $file"
  fi
}

# Update documentation files
for file in *.md; do
  if [ -f "$file" ]; then
    sed -i 's|http://103\.221\.221\.67:3000|https://api.volxai.com|g' "$file"
    echo "✓ Updated: $file"
  fi
done

# Update JavaScript/TypeScript files
replace_in_file "database/setup.js"

# Update shell scripts
for file in *.sh; do
  if [ -f "$file" ]; then
    sed -i 's|http://103\.221\.221\.67:3000|https://api.volxai.com|g' "$file"
    echo "✓ Updated: $file"
  fi
done

echo ""
echo "✅ All files updated successfully!"
echo ""
echo "📝 Files changed:"
echo "  - All .md documentation files"
echo "  - database/setup.js"
echo "  - *.sh scripts"
echo ""
echo "🚀 Next steps:"
echo "1. npm run build"
echo "2. scp -r dist/ jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/"
echo "3. ssh into server and run: bash DEPLOY.sh"
