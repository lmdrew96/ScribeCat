### Summary
Create an intelligent, proactive bug reporting system for ScribeCat that: (1) automatically detects app errors and suggests bug reporting via non-intrusive popups, (2) integrates seamlessly with AskAI for conversational bug reporting through guided questions, and (3) generates comprehensive bug reports with minimal user input while automatically targeting the ScribeCat repository.

### Goals
- Implement proactive error detection that suggests bug reporting when app functionality is compromised
- Create an immersive AskAI experience that intelligently detects when users are experiencing bugs during feature discussions
- Minimize user effort in bug reporting through intelligent pre-filling and guided conversation
- Automatically target ScribeCat repository (no repo selection needed)
- Maintain zero-authentication, privacy-first approach

### User stories
- As a user, when the app encounters an internal error, I see a non-intrusive popup warning me of compromised functionality with an option to report the bug
- As a user, when chatting with AskAI about ScribeCat features, AskAI intelligently detects if I'm experiencing a bug and offers to help me report it
- As a user, when I choose to report a bug via AskAI, it asks me clear, plain-English questions until it has enough information to generate a comprehensive issue
- As a user, I can review and approve the AI-generated bug report (with pre-filled title and body) before it's submitted to GitHub
- As a developer, I receive detailed bug reports with comprehensive context and AI-analyzed symptoms for faster resolution

### User flows

1) **Proactive error detection flow**
- App detects internal error/exception → Non-intrusive notification appears: "ScribeCat encountered an issue that may affect functionality" → User can dismiss or click "Report Bug" → If reporting: minimal form with optional user description → Auto-generated comprehensive report opens in browser for submission

2) **AskAI conversational bug reporting**  
- User chats with AskAI about features ("My recordings aren't saving") → AskAI detects potential bug and asks "It sounds like you might be experiencing a bug. Would you like me to help you report this?" → User agrees → AskAI asks 3-5 plain-English questions ("What happened when you tried to save?" "Did you see any error messages?" etc.) → AskAI generates comprehensive bug report → User reviews and approves → Browser opens with pre-filled issue

3) **Immersive AskAI help with bug detection**
- User asks AskAI about functionality → AskAI provides step-by-step guidance → If user indicates steps don't work, AskAI offers: "These steps should work. If they're not working for you, there might be a bug. Would you like me to help you report this?" → Seamless transition to bug reporting flow

### Acceptance criteria
- **Automatic error detection**: App monitors for exceptions, failed operations, and compromised functionality
- **Non-intrusive notifications**: Error popups are subtle and don't block workflow, with clear dismiss option
- **Automatic repo targeting**: All bug reports automatically go to lmdrew96/ScribeCat repository
- **AskAI intelligence**: AI can detect bug-related conversations and proactively offer reporting assistance  
- **Guided questioning**: AskAI asks clear, contextual questions to gather sufficient bug information
- **Intelligent pre-filling**: Bug reports include comprehensive context with minimal user input required
- **User control**: Users always review and approve final bug report before submission
- **Zero authentication**: No OAuth, API keys, or account setup required
- **Privacy protection**: Only user-approved information is included in reports

### Implementation notes (Electron-friendly)
- **Error monitoring system**: Add global error handlers and function result monitoring to detect app issues
- **Smart notification system**: Implement subtle, non-blocking error notifications with report options
- **AskAI conversation analysis**: Enhance AI to recognize bug-related discussions and offer assistance
- **Guided interview system**: Create conversational flow for AskAI to gather bug details through questions
- **Intelligent report generation**: Auto-populate comprehensive bug reports with session context, error logs, and user responses
- **Repository auto-targeting**: Hard-code ScribeCat repository as destination (no user selection needed)
- **Enhanced session capture**: Gather app state, recent actions, console logs, and system info automatically

### UI/UX suggestions
- **Error notifications**: Subtle toast/banner at top of app with warning icon and "Report Bug" button
- **AskAI integration**: Seamless conversation flow within existing chat interface, no modal interruptions  
- **Progressive disclosure**: AskAI reveals questions one at a time based on previous answers
- **Smart pre-filling**: Show user preview of generated report with highlighted sections they contributed
- **Clear approval process**: Simple "Looks good, submit this bug report" confirmation before browser opening
- **Status feedback**: Clear progress indicators during report generation and submission

### Testing notes
- **Error simulation**: Test various error conditions and verify notification appearance and functionality
- **AskAI conversation flows**: Test bug detection accuracy in various feature discussion scenarios
- **Question sequences**: Validate AskAI asks relevant, clear questions based on different bug types
- **Report quality**: Ensure generated reports contain sufficient context for developer action
- **Privacy compliance**: Verify no sensitive data is included without explicit user approval
- **Fallback handling**: Test offline scenarios and browser opening failures

### Suggested labels
enhancement, feature, ux-improvement, ai-integration

### Notes
This represents a significant UX evolution from manual bug reporting to an intelligent, proactive system. The focus is on reducing friction while increasing report quality through AI assistance and automatic context gathering. The system should feel helpful and intelligent without being intrusive, maintaining user agency while providing comprehensive developer information.

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