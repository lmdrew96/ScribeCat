#!/bin/bash

# ScribeCat Installation Script
# Automates the setup process for development

echo "🚀 Setting up ScribeCat Development Environment..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v14+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo

# Run smoke tests
echo "🧪 Running smoke tests..."
npm test

if [ $? -ne 0 ]; then
    echo "❌ Smoke tests failed"
    exit 1
fi

echo "✅ All tests passed!"
echo

# Try to package the app
echo "📦 Testing build process..."
npm run pack > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Build test successful"
else
    echo "⚠️  Build test failed (this may be due to platform-specific issues)"
fi

echo
echo "🎉 ScribeCat setup complete!"
echo
echo "Next steps:"
echo "1. Start development server: npm run dev"
echo "2. Configure API keys for AssemblyAI and Claude"
echo "3. Set up Google Drive folder integration"
echo "4. Replace placeholder assets with your logo and fonts"
echo
echo "For detailed instructions, see:"
echo "- README.md for usage guide"
echo "- DEVELOPMENT.md for development guide"
echo
echo "Happy coding! 📝🐱"