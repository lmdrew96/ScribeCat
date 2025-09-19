# Changelog

## 0.3.1 - 2025-09-20
### Added
- Header settings drawer with dedicated panels for theme, classroom groups, layout, and transcription preferences.

### Changed
- Promoted the GalaxyCaterpillar typeface for the ScribeCat title and moved version/status indicators into a compact footer.

## 0.3.0 - 2025-09-19
### Added
- Status heartbeat now updates the existing UI chips and injects a fallback badge when chips are missing.
- Development audio recorder with Record/Transcribe workflow powered by the local AssemblyAI proxy.
- Dev API script and launcher hook to proxy transcription requests securely in development.

### Changed
- Sync launcher stashes local changes, creates a salvage branch, and restarts the dev stack with logging.

## 0.2.0 - 2025-09-18
### Added
- Recording and transcription support in the dashboard recorder panel.

### Changed
- Status overlay hooks to surface recording state without interrupting existing health signals.
