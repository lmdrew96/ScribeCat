#!/bin/bash

# Git Safety Script for ScribeCat Development
# This script prevents development actions when there are uncommitted changes
# Place this file in your project root and make it executable: chmod +x git-safety.sh

# Colors for better visibility (ADHD-friendly visual cues)
RED="\033[0;31m"
YELLOW="\033[1;33m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Function to check for uncommitted changes
check_git_status() {
  echo -e "${BLUE}🔍 Checking Git status…${NC}"

  # Check if we're in a git repository
  if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not in a Git repository${NC}"
    exit 1
  fi

  # Check for uncommitted changes
  if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  UNCOMMITTED CHANGES DETECTED!${NC}"
    echo ""
    echo -e "${YELLOW}The following files have uncommitted changes:${NC}"
    git status --porcelain | while read -r status file; do
      case $status in
        M*) echo -e "  ${YELLOW}📝 Modified: $file${NC}" ;; 
        A*) echo -e "  ${GREEN}➕ Added: $file${NC}" ;; 
        D*) echo -e "  ${RED}🗑️  Deleted: $file${NC}" ;; 
        ??) echo -e "  ${BLUE}❓ Untracked: $file${NC}" ;; 
        *) echo -e "  ${YELLOW}🔄 $status: $file${NC}" ;; 
      esac
    done
    echo ""
    return 1
  else
    echo -e "${GREEN}✅ All changes are committed${NC}"
    return 0
  fi
}

# Function to offer commit options
offer_commit_options() {
  echo -e "${YELLOW}What would you like to do?${NC}"
  echo "1) Commit all changes now"
  echo "2) View detailed changes first"
  echo "3) Cancel and fix manually"
  echo ""
  read -p "Choose an option (1-3): " choice

  case $choice in
    1)
      commit_changes
      ;;
    2)
      show_detailed_changes
      offer_commit_options
      ;;
    3)
      echo -e "${RED}❌ Operation cancelled. Please commit your changes manually.${NC}"
      exit 1
      ;;
    *)
      echo -e "${RED}Invalid choice. Please try again.${NC}"
      offer_commit_options
      ;;
  esac
}

# Function to commit changes
commit_changes() {
  echo ""
  read -p "Enter a commit message (or press Enter for auto-generated): " message

  if [ -z "$message" ]; then
    # Auto-generate commit message based on changed files
    files_changed=$(git diff --name-only HEAD)
    message="Auto-commit: Updates to $(echo "$files_changed" | head -3 | tr '\n' ', ' | sed 's/,$//')"
    total=$(echo "$files_changed" | wc -l | tr -d ' ')
    if [ "$total" -gt 3 ]; then
      message="$message and $(( total - 3 )) more files"
    fi
  fi

  git add .
  git commit -m "$message"

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Changes committed successfully!${NC}"
    echo -e "${BLUE}💡 Don't forget to push when you're ready: git push${NC}"
  else
    echo -e "${RED}❌ Commit failed. Please check the error above.${NC}"
    exit 1
  fi
}

# Function to show detailed changes
show_detailed_changes() {
  echo -e "${BLUE}📋 Detailed changes:${NC}"
  echo ""
  git status
  echo ""
  echo -e "${BLUE}📝 File differences:${NC}"
  git diff --stat
}

# Main safety check function
safety_check() {
  echo -e "${BLUE}🛡️  Git Safety Check${NC}"
  echo "========================="

  if check_git_status; then
    echo -e "${GREEN}🚀 Safe to proceed!${NC}"
    return 0
  else
    echo ""
    offer_commit_options

    # After handling uncommitted changes, check again
    if check_git_status; then
      echo -e "${GREEN}🚀 Now safe to proceed!${NC}"
      return 0
    else
      echo -e "${RED}❌ Still have uncommitted changes. Exiting.${NC}"
      exit 1
    fi
  fi
}

# If script is called with "dev" argument, run safety check then start development
if [ "$1" = "dev" ]; then
  safety_check
  echo ""
  echo -e "${GREEN}🚀 Starting development server…${NC}"
  npm run dev
elif [ "$1" = "check" ]; then
  safety_check
else
  echo "Usage:"
  echo "  ./git-safety.sh check    # Just check status"
  echo "  ./git-safety.sh dev      # Check status then run npm run dev"
  echo ""
  echo "Or add this to your package.json scripts:"
  echo '  "safe-dev": "./git-safety.sh dev"'
fi
