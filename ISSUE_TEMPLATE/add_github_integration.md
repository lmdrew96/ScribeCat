### Summary
Implement GitHub API integration in the ScribeCat Electron app to enable: (1) in-app bug reporting that creates issues with session context, (2) AskAI answering user questions about app functionality using repo/docs context, and (3) AskAI-assisted issue creation that summarizes session context and proposes an issue the user can review and post.

### Goals
- Let users create well‑formed GitHub issues from inside ScribeCat with useful reproduction context (notes, transcript, optional audio link or gist).
- Enable AskAI to answer questions about the app using repository docs or selected files as context.
- Let AskAI propose and prefill issue title/body from session context; user confirms before posting.

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
- Users can authenticate with GitHub via OAuth and token is stored securely in OS keychain (keytar or similar).
- The Report modal can create an issue in a chosen repo and returns the issue URL on success.
- AskAI can read selected repo docs (README, docs/ folder) when user permits, and answer app-related questions using that content.
- AskAI can propose issue title/body from session context; submission requires explicit user confirmation.
- Attachments: transcript can be attached by creating a private gist or committing a Markdown file to a chosen repo; the created link is included in the issue body.
- Clear error handling and user-facing messages for auth failure, rate limits, offline queueing, and permission issues.
- Unit or integration tests added for new IPC handlers and a smoke test for the Report flow.

### Implementation notes (Electron-friendly)
- Use the system browser OAuth flow; capture token via redirect or device code flow. Store token in OS secure storage (keytar).
- Add IPC channels: github:auth, github:create-issue, github:create-gist, github:commit-file, github:comment-issue. Run network and file IO in main process.
- For attachments: prefer creating a private Gist for large content, or commit a Markdown transcript to a selected repo/branch for full traceability.
- AskAI doc context: provide a toggle to let the assistant fetch README/docs from the repo (only when user allows) and pass that content as context to the AI request.
- Keep requested scopes minimal: gist for gists, public_repo for public only, repo for private repos; request scopes only when features are enabled.

### UI suggestions
- Add a compact "Report" quick-action in the status chips area (under the clock) and an item in the AskAI context menu.
- Report modal fields: Repo selector, Branch (optional), Title, Body (prefilled), Attachments toggle (Transcript/Gist/Audio link), Labels, Create button.
- After creation: toast with "Issue created — open on GitHub" and a copy link button.

### Testing notes
- Test flows for public and private repos and gist creation. Test offline queue and retry logic.
- Add tests for: OAuth flow handling, IPC handlers, create-issue error cases, and the AskAI prefill -> submit confirmation path.

### Suggested labels
enhancement, feature, needs-design

### Notes
Place this feature to integrate with the existing save/export system (Google Drive flow) as an alternate save target and reuse the new status chip area added in PR #15 as the surface for quick actions.