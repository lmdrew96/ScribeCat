### Summa### User ### User flows
1) **Enhanced manual report**  
- User clicks "Report Bug" in sidebar → form auto-populates with session context (current notes, recent transcription) → user adds description and optional email → clicks "Report Bug" → browser opens with comprehensive GitHub issue pre-filled → user clicks "Submit new issue" to complete.

2) **AskAI-assisted report**  
- User asks AskAI "Create a bug report from this session" → AskAI analyzes current context, notes, and transcription → generates comprehensive bug report with symptoms analysis → user reviews and approves → browser opens with AI-generated report → user submits in GitHub.

3) **AskAI app-help**  
- User asks AskAI a functionality question → AskAI references built-in knowledge about ScribeCat features → provides step-by-step guidance with specific UI references → optionally includes links to relevant documentation or settings. As a user, I can click "Report Bug" and have my current session's transcript and notes automatically included in the GitHub issue (via browser pre-fill or clipboard)
- As a user, I can ask the built-in AskAI "Create a bug report from this session" and review the AI‑generated comprehensive report before opening it in my browser
- As a user, I can ask AskAI questions about app features ("How do I save to Drive?" "What transcription backends are available?") and receive helpful answers with step-by-step guidance
- As a developer, I get detailed issues that include session context, system information, and AI-analyzed symptoms for faster problem resolutionhance ScribeCat's existing zero-configuration bug reporter with advanced features: (1) session context integration for comprehensive bug reports, (2) AskAI integration for intelligent question answering about app functionality, and (3) AskAI-assisted bug report generation that analyzes session data and creates detailed reports users can review before submission.

### Goals
- Enhance the current simple bug reporter with session context (notes, transcripts) while maintaining zero-config operation
- Enable AskAI to answer questions about the app using built-in knowledge and documentation
- Let AskAI analyze current session data to generate comprehensive bug reports users can review and submit
- Maintain privacy-first, no-authentication approach while adding intelligence features

### User stories
- As a user, I can click “Report bug” and choose a repo to file an issue that includes the current session’s transcript and notes (or a private gist link for large attachments).
- As a user, I can ask the built-in AskAI “Create a bug report from this session” and review the AI‑generated title/body before submitting as a GitHub issue.
- As a user, I can ask AskAI questions about app features ("How do I save to Drive?" "What permissions does GitHub save need?") and receive answers that reference README or other repo docs when available.
- As a developer, I get issues that include a link to the exact saved artifact (repo file or gist) and enough metadata (app version, OS, timestamp) to reproduce problems.

### User flows
1) **Manual report**  
- User clicks Report → small modal shows repo selector, branch (optional), editable Title, editable Body (prefilled summary + metadata), Attachments toggle (Transcript / Audio / Gist), Labels dropdown → user clicks Create → show toast with link to issue.

2) **AskAI-assisted report**  
- User selects AskAI context (current session) → says “Create bug report” → AskAI summarizes and suggests a title/body → user edits/approves → app runs the same create flow and returns the issue link.

3) **AskAI app-help**  
- User asks AskAI a functionality question → AskAI can reference README or docs files loaded from the repo (if user permits) and answer with step-by-step guidance; UI shows source file links when applicable.

### Acceptance criteria
- Bug reporter works immediately without any authentication or setup (zero-configuration approach maintained)
- Session context (notes, transcripts) is automatically included in bug reports via browser pre-fill or clipboard
- AskAI can analyze current session data and generate comprehensive bug reports for user review
- AskAI can answer questions about ScribeCat functionality using built-in knowledge base
- Reports include automatic system information (app version, platform, timestamp, etc.)
- Clear fallback methods when browser opening fails (clipboard copy with instructions)
- Privacy-first approach: only user-provided information is included in reports
- Unit or integration tests added for new IPC handlers and a smoke test for the Report flow.

### Implementation notes (Electron-friendly)
- Enhance existing bug reporter to include session context (notes, transcripts) in the GitHub issue pre-fill URL
- Add session analysis methods to gather current app state for comprehensive bug reports
- Integrate with existing AskAI system to provide app functionality guidance and bug report generation
- Use browser-based submission with GitHub issue templates for zero-authentication approach
- Include session attachments via formatted text blocks in the issue body (no external file hosting needed)
- AskAI features: built-in knowledge base about ScribeCat functionality, no external API calls required for basic help

### UI suggestions
- Enhance existing "Bug Reporter" sidebar section with session context integration
- Add AskAI integration for "Create bug report from session" and general help queries
- Enhanced bug report form: auto-populate with session data, improve formatting and context inclusion
- After submission: status updates showing "Opening GitHub in browser..." and "Complete submission in your browser"

### Testing notes
- Test session context collection and formatting for bug reports
- Add tests for: AskAI integration, session analysis methods, enhanced bug report generation
- Test browser opening fallback to clipboard copy, comprehensive bug report formatting
- Validate existing zero-config bug reporter remains functional while adding enhanced features

### Suggested labels
enhancement, feature, needs-design

### Notes
This enhancement builds upon the existing zero-configuration bug reporter while adding intelligence and session context. It maintains the privacy-first, no-authentication approach while providing more comprehensive bug reports through AskAI integration and session analysis. The feature integrates with the existing save/export system as an enhanced reporting mechanism.