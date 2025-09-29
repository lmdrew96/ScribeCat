#!/bin/bash

# Setup script for ScribeCat Claude API integration
# This script safely configures your local environment

set -e

echo "🚀 Setting up Claude API integration for ScribeCat"
echo "================================================="

# Step 1: Check if .env template exists
if [ ! -f ".env.template" ]; then
    echo "❌ Error: .env.template not found"
    exit 1
fi

# Step 2: Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.template .env
    echo "✅ Created .env file"
else
    echo "ℹ️  .env file already exists"
fi

# Step 3: Check if Claude API key is set
echo ""
echo "🔑 Checking Claude API key configuration..."

if [ -z "$CLAUDE_API_KEY" ]; then
    echo ""
    echo "⚠️  CLAUDE_API_KEY not found in environment"
    echo ""
    echo "To set up your Claude API key locally:"
    echo "1. Edit the .env file: nano .env"
    echo "2. Replace 'your-claude-api-key-here' with your actual Claude API key"
    echo "3. Source the environment: source .env"
    echo ""
    echo "Or set it temporarily for testing:"
    echo "export CLAUDE_API_KEY='your-actual-key-here'"
    echo ""
    echo "Note: For GitHub Actions, your key is already configured in repository secrets ✅"
else
    echo "✅ CLAUDE_API_KEY is configured"
fi

# Step 4: Test enhanced git safety script
echo ""
echo "🧪 Testing enhanced git safety script..."

if [ ! -f "enhanced-git-safety.sh" ]; then
    echo "❌ Error: enhanced-git-safety.sh not found"
    exit 1
fi

# Make sure script is executable
chmod +x enhanced-git-safety.sh
echo "✅ Made enhanced-git-safety.sh executable"

# Test basic functionality (without API call)
echo ""
echo "🔍 Running basic connectivity test..."

# Test if Node.js is available
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js is available ($(node --version))"
else
    echo "⚠️  Node.js not found - AI analysis will be disabled"
    echo "   Install Node.js from https://nodejs.org/ for AI features"
fi

# Test git repository
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "✅ Git repository detected"
else
    echo "⚠️  Not in a git repository"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your Claude API key in .env if not already done"
echo "2. Test the script: ./enhanced-git-safety.sh check"
echo "3. Use the script: ./enhanced-git-safety.sh commit 'Your commit message'"
echo ""
echo "For GitHub Actions, your Claude API key is already configured in repository secrets."