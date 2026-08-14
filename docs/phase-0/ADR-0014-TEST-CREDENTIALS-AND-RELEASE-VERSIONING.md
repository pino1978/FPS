# ADR-0014 — Test credentials and release versioning

## Problem
During Android test cycles it is inconvenient to re-enter provider credentials after every installation. At the same time the application must expose its release number and the project baseline requires provider secrets to remain outside source code and client binaries.

## Constraints
- US-1401 is MUST: API keys only via environment/secret manager and never in logs.
- Technical Design: provider secrets server-side; the standalone Android test runtime stores user-supplied credentials in device secure storage.
- Release numbering follows Semantic Versioning.

## Alternatives considered

### A. Hard-code provider credentials in source/APK
**Pros:** zero configuration after reinstall.

**Cons:** credentials become extractable from the APK and/or repository history; violates US-1401 and the Technical Design security requirement.

### B. Inject CI secrets into the compiled APK
**Pros:** secrets are not committed to Git.

**Cons:** secrets are still present in the client binary and extractable; therefore it still violates the server-side secret requirement.

### C. Keep credentials in Android secure storage and preserve them across in-place upgrades
**Pros:** no secret in Git or APK, aligns with the current standalone architecture, and ordinary APK updates retain the configuration.

**Cons:** a full uninstall/data wipe requires credentials to be entered again.

## Decision
Adopt option C. Provider credentials remain in Android secure storage. Testers should install subsequent APK releases as upgrades over the existing installation instead of uninstalling first. A full uninstall intentionally clears credentials and requires one-time reconfiguration.

Release `v1.0.0` is displayed in the mobile application and the mobile package version is aligned to `1.0.0`.

## Impact
- No provider secret is committed or embedded in the APK.
- Repeated test updates do not require credential re-entry when installed in-place.
- Release identification is visible in the UI and tied to SemVer tags.
- Future production deployment can move provider access fully behind a server-side secret manager without changing the domain contracts.
