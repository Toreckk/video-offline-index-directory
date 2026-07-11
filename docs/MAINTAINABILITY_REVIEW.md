# Maintainability Review

See `ARCHIVAL_METADATA_STRATEGY.md` for the proposed durable route-side metadata boundary, cross-browser write limitations, and duplicate-deletion safety requirements.

Date: 2026-07-11

This review records structural findings from the enhanced flat-tag implementation. It distinguishes changes completed now from larger refactors that should be deliberate follow-up work.

## Completed in this pass

- Extracted annotation domain types from the Zustand store. Pure services no longer depend on the persistence implementation for their types.
- Centralized tag enumeration, search, usage counts, ranking, and picker-section construction in pure catalog services.
- Reused the same search and picker-list components in player quick tagging, Explorer filtering, and bulk-target selection.
- Consolidated tag color selection into one component.
- Replaced per-video bulk store writes with one batch mutation.
- Kept popup positioning and dismissal in shared controls rather than feature components.
- Added focused tests for catalog ranking, favorite/recent behavior, large picker search, popup ownership, and click-through prevention.

## Findings for future work

### 1. Media processing has an inverted feature dependency

The Library feature imports thumbnail generation, catalog caching, queueing, sorting, and media state from Explorer. These are not strictly Explorer responsibilities.

Recommended direction:

- Introduce a shared media-index domain such as `features/media` or `shared/media`.
- Move `MediaAsset`, media catalog persistence, thumbnail generation/cache, and queue contracts there.
- Keep Explorer responsible for presentation, filtering, and user interaction only.

Do this before adding more consumers such as duplicate detection, transcoding diagnostics, or metadata extraction.

### 2. The scanner hook coordinates too many pipeline stages

`useLibraryScanner` currently coordinates discovery, metadata reads, media-store updates, thumbnail scheduling, cache persistence, progress, cancellation, and diagnostics.

Recommended direction:

- Extract a discovery pipeline service.
- Extract a thumbnail-enrichment pipeline service.
- Represent scan events through typed callbacks or a small event stream.
- Keep the React hook as lifecycle and cancellation glue.

### 3. The library store combines durable and runtime state

Folder identity, permissions, session files, scan progress, diagnostics, and persistence actions currently share one store.

Recommended direction:

- Separate durable library configuration from transient scan-session state.
- Keep persistence adapters outside domain mutation logic.
- Preserve selectors so UI components do not depend on the eventual store split.

### 4. Route orchestration is becoming a workflow service

`LibraryRouteProvider` handles browser capability selection, picking, reconnect validation, restore behavior, navigation, and scan startup.

Recommended direction:

- Extract route-selection and reconnect workflows into testable services.
- Leave the provider responsible for dialog state and exposing commands to React.

### 5. Large views should become composed feature panels

`Settings` and `Folders` contain several independent panels and local helper components.

Recommended direction:

- Extract panels when they gain independent state or tests, not solely to reduce line count.
- Prefer feature-owned panels over a generic configuration renderer that would hide behavior behind schemas.

### 6. Add an explicit formatting gate

The codebase has many dense JSX lines. Lint and TypeScript protect behavior but do not currently enforce consistent formatting.

Recommended direction:

- Add Prettier or an equivalent formatter.
- Apply it as a separate mechanical commit to avoid obscuring behavioral changes.
- Add a CI formatting check after the initial formatting commit.

## Priority order

1. Shared media-index boundary.
2. Scanner pipeline extraction.
3. Durable versus transient library-store split.
4. Route workflow extraction.
5. View-panel composition as features grow.
6. Repository-wide formatting pass.

These refactors should be driven by upcoming functionality and covered by characterization tests. They should not be combined into one large rewrite.
