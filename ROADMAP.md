# DDB Adventure Muncher Improvement Roadmap

## 1. Config Validation
- [x] Add JSON schema for config files
- [x] Integrate schema validation in config loading
- [x] Provide user-friendly error messages for invalid configs

## 2. Error Handling
- [x] Audit file and directory operations for missing error handling
- [x] Add try/catch and user feedback for critical file/database operations
- [ ] Ensure all async functions have proper error handling

## 3. Token Security
- [ ] Avoid logging or saving the cobalt token in plaintext
- [ ] Redact sensitive info from logs

## 4. Async Refactoring
- [ ] Replace blocking sync file operations with async versions where possible
- [ ] Ensure event loop is not blocked in Electron

## 5. User Feedback & UX
- [ ] Improve error messages in CLI and GUI
- [ ] Add usage help for CLI

## 6. Testing & Validation
- [ ] Add basic unit tests for config and file helpers
- [ ] Add validation for user input and environment variables

## 7. Foundry VTT Conformance
- [ ] Validate exported JSON against Foundry VTT document schemas (Adventure, JournalEntry, Scene, RollTable, etc.)
- [ ] Ensure all required fields and structures match the Foundry VTT API
- [ ] Add automated checks before packaging/export
- [ ] Log and surface errors for any non-conforming documents

---

**Current focus:** Config validation, error handling, and Foundry VTT conformance.
