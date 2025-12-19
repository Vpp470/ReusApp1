#!/bin/bash
set -e

echo "🚀 Starting Railway build process..."

# Copy landing pages HTML files to backend static folder
echo "📋 Copying landing pages HTML to backend/static/tomb-pagines..."
mkdir -p backend/static/tomb-pagines
cp -r landing/tomb-pagines/*.html backend/static/tomb-pagines/ 2>/dev/null || echo "⚠️  Warning: No HTML files found in landing/tomb-pagines"

echo "✅ Build complete!"
