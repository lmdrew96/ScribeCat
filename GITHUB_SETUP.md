# ScribeCat Bug Reporter - User Guide

ScribeCat includes a simple, built-in bug reporter that allows users to submit bug reports directly to the ScribeCat development team.

## Overview

The bug reporter is designed to be **zero-configuration** - it works immediately upon app installation with no setup required from users.

## How to Use

1. **Open the Bug Reporter**:
   - Click the hamburger menu (☰) to open the sidebar
   - Scroll down to the "Bug Reporter" section

2. **Fill out the report**:
   - **Brief description**: A short summary of the issue
   - **What happened**: Detailed description including steps to reproduce
   - **Your email**: Optional, only if you want follow-up communication

3. **Submit**:
   - Click "Report Bug"
   - The app will open your browser with a pre-filled GitHub issue
   - Click "Submit new issue" in GitHub to complete the report

## What Information is Included

Your bug report automatically includes:
- **App version** and **platform** information
- **System details** (screen resolution, language, etc.)
- **Timestamp** of when the report was created
- **Your description** of the issue

## Privacy

- **No automatic data collection** - only information you provide is sent
- **Email is optional** - only provide if you want follow-up
- **System info is anonymous** - no personal information is collected
- **Open process** - all bug reports are public on GitHub

## Alternative Reporting Methods

If the built-in reporter doesn't work:

1. **Manual GitHub**: Visit https://github.com/lmdrew96/ScribeCat/issues/new
2. **Copy/Paste**: The reporter will copy details to your clipboard if needed
3. **Direct contact**: Check the app's About section for developer contact info

## For Developers

The bug reporter uses a simple approach:
- Generates comprehensive bug report content
- Opens GitHub issue creation page with pre-filled data
- Fallback to clipboard copy if browser opening fails
- No authentication or complex setup required