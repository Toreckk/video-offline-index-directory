# VOID Implementation Plan

This project is a local-first media explorer for video files. The first production goal is: choose a library root, index supported videos, show them in a dense visual grid, preview muted snippets on hover, and open a focused player overlay with keyboard navigation.

## Implementation Status (2026-07-10)

The MVP is implemented across tickets VOID-001 through VOID-011. The app now owns folder selection and permission restore behind a service boundary, scans progressively with cancellation, normalizes media in dedicated stores, caches single-concurrency thumbnails, renders a searchable grid, previews one muted video at a time, opens a queue-aware fullscreen player, and persists behavior-driven settings. Chromium uses persistent directory handles; Firefox and other current browsers use a session-file fallback and reconnect after restart.

VOID-013 is also complete with unit/component coverage and a manual browser QA checklist. VOID-012 remains deliberately deferred until a 400+ item measurement demonstrates that virtualization is necessary and gives us concrete row sizing, overscan, focus, and thumbnail-priority requirements.

The remaining release gate is to run `docs/MANUAL_QA.md` with real local videos in a Chromium browser. Automated tests cannot grant native directory permissions or validate hardware decoder behavior.

## Post-MVP Enhancements (2026-07-10)

- Removed the redundant Player route and account-like Profile affordance; playback remains a global Explorer-launched modal.
- Removed native tile `title` tooltips so hover previews remain unobstructed.
- Added IndexedDB-persisted favorites and media tags keyed by durable media ids.
- Tag names are free text up to 32 characters, unique case-insensitively, and use a curated 12-color palette. Quick creation balances the least-used colors with a deterministic name-based tie break.
- Player controls support favorite toggling, assigning existing tags, and creating/assigning a tag in one action.
- Settings supports tag creation, curated color changes, usage counts, and guarded deletion.
- Explorer supports Favorites, folder, and multiple tag filters. Multiple tags use `AND` semantics.
- Thumbnail priority now uses actual viewport intersection plus displayed grid order instead of treating every mounted tile as visible.
- Firefox session selection closes the route modal and navigates to Folders before asynchronous scanning continues.

## Current Architecture Review

The implementation now has explicit ownership boundaries:

- `App.tsx` composes providers, the registered active view, global player modal, and background-work coordinator.
- `app/views.ts` is the single route/navigation registry; `Sidebar.tsx` remains presentational.
- `LibraryRouteProvider` is the long-lived orchestration boundary for picker UI, permission reconnection, scanning, cancellation, and background status across view changes.
- File-system modules normalize persistent handles and session files behind `MediaFileSource`; downstream media features do not depend on a browser-specific picker API.
- Separate Zustand stores own library lifecycle, normalized media, playback queue, and persisted settings.
- Explorer components own rendering and interaction; thumbnail generation/cache and preview scheduling remain service or hook concerns.
- Player object URLs are scoped to the current/previous/next queue window and revoked by hook cleanup.

This keeps browser I/O, application state, rendering, and short-lived media resources independently testable. Views remain composition surfaces instead of growing into feature controllers.

## Recommended Project Shape

```txt
src/
  app/
    navigation*.tsx          # Typed navigation provider/context
    views.ts                  # Single registry for view ids, labels, icons, and components
  components/
    homepage/                 # Empty-state landing for Explorer
    library/                  # Compatibility composition wrapper for MediaGrid
    sidebar/                  # App navigation shell
  features/
    library/
      components/             # Route provider/dialog and global scan status
      hooks/                  # Progressive library scanner
      services/fileSystem/    # Browser file-system adapter modules
      store/                  # Library lifecycle and persisted route state
    explorer/
      components/             # Grid, tile, toolbar, background coordinator
      hooks/                  # Hover preview and cached-thumbnail URL lifetime
      services/               # Thumbnail queue/cache/generator and preview schedule
      store/                  # Normalized media records and Explorer UI state
    player/
      components/             # Modal, video, metadata, and edge zones
      hooks/                  # Warm current/previous/next object URLs
      store/                  # Selection and playback queue
    settings/
      store/                  # IndexedDB-persisted behavior settings
  shared/persistence/         # Reusable Zustand IndexedDB storage adapter
  utils/
    media.ts                  # extension helpers, duration formatting, stable ids
```

The important boundary is: views compose feature components, feature services do I/O and indexing, and shared infrastructure contains no feature policy.

## TypeScript Baseline

The project now uses TypeScript `6.0.3` with Vite's recommended split config shape:

- `tsconfig.json` coordinates project references.
- `tsconfig.app.json` covers browser React source with `strict`, `react-jsx`, `moduleResolution: "Bundler"`, side-effect import checks, and unused-code checks.
- `tsconfig.node.json` covers Vite and ESLint config files with Node types.
- `npm run build` runs `tsc -b` before `vite build`, so production builds include type checking.
- ESLint is configured through `eslint.config.ts` with `typescript-eslint` recommended rules plus the existing React Hooks and React Refresh rules.

All app source and config files should use `.ts` or `.tsx`; avoid adding new `.js` or `.jsx` files unless a third-party tool explicitly requires them.

## File Access Strategy

For a browser-only React app, folder selection uses a capability-based adapter:

- `window.showDirectoryPicker()` opens a native directory picker in Chromium-based browsers.
- `FileSystemDirectoryHandle` lets the app iterate entries and request persisted permission.
- Recursive scanning can walk subdirectories when the setting is enabled.
- Handles can be stored in IndexedDB, but permission must still be revalidated on future sessions.
- Browsers without `showDirectoryPicker()` use `<input type="file" webkitdirectory multiple>` and normalize each `File.webkitRelativePath` into the same discovery model.
- Session files cannot be reopened after a browser restart; persisted metadata keeps its durable `libraryId`, and the user reconnects the folder explicitly.

Recommended libraries:

- `idb-keyval` is already installed and is enough for persisting directory handles, app settings, indexed metadata, and recent paths.
- `zustand` is already installed and is a good fit for selected route, scan state, media list, current player index, and settings.
- `@tanstack/react-virtual` should be considered after measuring the real grid with 400+ videos; do not pay its focus/layout complexity without a demonstrated need.

The fallback preserves scanning, thumbnails, previews, playback, search, and future annotations. Only automatic file access restoration differs because session `File` objects are intentionally not persisted.

## Data Model

A minimal media item should be normalized early:

```ts
type MediaAsset = {
  id: string;
  libraryId: string;
  name: string;
  extension: ".mp4" | ".webm";
  pathParts: string[];
  source:
    | { kind: "file-system-handle"; handle: FileSystemFileHandle }
    | { kind: "session-file"; file: File };
  objectUrl?: string;
  size: number;
  lastModified: number;
  duration?: number;
  width?: number;
  height?: number;
  posterUrl?: string;
};
```

Each configured library receives an opaque random `libraryId`, persisted independently of its display name. Media ids use that id plus relative path parts, preventing collisions between identically named roots. Object URLs should be created lazily and revoked when tiles/player unmount to avoid memory leaks.

## Library Route And Scanning Flow

1. User clicks `Configure Library Route`.
2. App opens `showDirectoryPicker()` when available or a `webkitdirectory` input fallback.
3. App stores the selected directory handle and display path label in IndexedDB.
4. App starts scan state: `idle -> scanning -> ready` or `error`.
5. Scanner walks files and keeps only enabled formats: `.mp4`, `.webm` for now.
6. Scanner emits progress in batches so the UI can show the indexing design without blocking rendering.
7. App extracts lightweight metadata where possible:
   - file name, extension, size, modified time from `File`
   - duration/resolution by loading metadata into an offscreen `<video>`
   - poster frame by drawing a frame to `<canvas>` if needed
8. Media list is stored in Zustand for the session and persisted metadata is stored in IndexedDB.

For large folders, scanning should be cancelable with `AbortController`.

## Explorer Grid

The grid should be a feature component, not part of the route view directly:

- `ExplorerView` chooses state: empty, scanning, ready, error.
- `MediaGrid` owns layout and virtualization.
- `MediaTile` owns thumbnail, hover state, focus state, and click behavior.
- `SearchBar` filters visible items by filename/path.

Use CSS grid for the first version:

```css
grid-template-columns: repeat(auto-fill, minmax(var(--tile-min), 1fr));
```

When the library grows, replace the raw grid with virtualization. The designs use a mosaic/gapless feel, but virtualization is more important than decorative layout once file counts rise.

## Hover Snippet Preview

The YouTube-like preview can be done without generating video files:

- Each tile renders an image/poster by default.
- On hover/focus, mount a muted `<video playsInline preload="metadata">`.
- Start playback muted after a small delay, for example 150-250ms, to avoid work when the cursor passes over tiles.
- Use a snippet scheduler that seeks through selected timestamps:
  - if duration is known, sample at 10%, 35%, 60%, and 85%
  - play each snippet for 1.5-2 seconds
  - loop through snippets while hovered
- Set `video.muted = true`; do not show controls in tiles.
- Pause, clear timers, and revoke object URLs when hover ends.

Important browser limitation: seeking many videos at once is expensive. Only the currently hovered/focused tile should play. Keep all other tiles as posters.

This project should remain a pure React web app. That means hover previews should be runtime previews using native browser video playback, not generated preview files from a native process.

## Player Modal And Fullscreen

Clicking a tile should open a player overlay that owns the playback queue:

- Store `selectedAssetId` or `selectedIndex` in `playerStore`.
- `PlayerModal` renders above the app shell with a dark backdrop.
- The main `<video>` uses controls, audio enabled, and receives the selected asset object URL.
- Keyboard shortcuts:
  - `ArrowRight`: next media item
  - `ArrowLeft`: previous media item
  - `Escape`: close modal or exit fullscreen
  - `f`: request fullscreen
  - `Space`: play/pause when focus is not inside a form control
- Edge zones on the left/right can navigate without leaving the modal.
- Fullscreen should use the browser Fullscreen API on the player container, not only the `<video>`, so overlays and file metadata can remain visible.

Object URL lifetime matters here too: keep the current, previous, and next video URLs warm; revoke the rest.

## State Stores

Start with separate Zustand slices instead of one large store:

- `libraryStore`
  - selected directory handle
  - recent paths
  - scan status/progress
  - indexed media ids
- `mediaStore`
  - normalized assets
  - metadata cache status
  - search query/filter state
- `playerStore`
  - selected asset id
  - queue ids
  - modal/fullscreen state
- `settingsStore`
  - autoplay previews
  - scan subfolders
  - enabled formats
  - tile density

Persist user choices and route metadata with `idb-keyval`; keep live handles and object URLs out of JSON serialization.

## Libraries To Add Later

Install only when the feature needs them:

- `@tanstack/react-virtual` or `react-window`: virtualized grid/list rendering.
- `clsx` and `tailwind-merge`: cleaner conditional class composition as components grow.
- `react-hotkeys-hook` or a small local keyboard hook: player shortcuts.
- `comlink`: optional worker communication if scanning/metadata extraction becomes heavy.

Avoid adding a video player framework early. Native `<video>` is enough for `.mp4` and `.webm`, and custom UI can be built around it.

## Implementation Milestones

1. Navigation and skeleton views
   - Central view registry
   - Explorer, Folders, and Settings routes; playback is an app-level modal
   - Explorer keeps the current empty state

2. Library route selection
   - File System Access API adapter
   - Persist selected handle with `idb-keyval`
   - Basic recent path list

3. Scanner
   - Recursive directory walking
   - Extension filtering
   - Scan progress, cancel, and error states

4. Explorer grid
   - Media asset store
   - Search/filter
   - Tile density setting
   - Poster frame generation

5. Hover preview
   - Single active preview at a time
   - Muted snippet scheduler
   - Object URL cleanup

6. Player modal
   - Click-to-open
   - Audio playback
   - Previous/next keyboard controls
   - Fullscreen support

7. Settings and polish
   - Wire settings to scanning and preview behavior
   - Persist preferences
   - Add empty/error/loading states matching the designs

## Open Decisions

- Browser support: Chromium receives persistent directory restoration; Firefox receives equivalent session behavior through `webkitdirectory` with an explicit reconnect after restart.
- Metadata depth: file name/duration/resolution is browser-friendly; codec/bitrate analysis likely needs a native layer or ffmpeg.
- Preview caching: runtime hover snippets are simplest; generated preview assets are faster but require extra processing infrastructure.

## Design Alignment Decisions

The latest designs clarify a few product and implementation rules:

- VOID remains a pure React web app. The app should use the browser-native folder picker and should not simulate an operating-system file browser.
- The route modal is an app-level explanation/confirmation step. Its primary action is `Open Folder Picker`, which selects the best supported native folder mechanism.
- Supported formats in v1 are `.mp4` and `.webm`. Other formats such as `.mov`, `.mkv`, and `.r3d` can appear as disabled `coming soon` chips, but the scanner should not accept them yet.
- Scan progress should be phase-based:
  - folders scanned
  - videos found
  - thumbnails generated
  - ready
- Exact percentages should only be used when a real total is known, such as thumbnail generation after video discovery.
- `Run in Background` should let users return to Explorer or Folders while indexing continues. A compact sidebar/status chip should show background scan activity.
- Successful indexing should use a banner/toast with `Start Exploring`, not a blocking route-confirmed modal.
- Explorer should stop showing the homepage as soon as a library has discovered videos; tiles can render with placeholders while thumbnails are still being generated.
- Settings are grouped as Playback, Library & Cache, Interface, and General.
- `Restore Last Library` means the app stores the previous directory handle, checks permission on launch, and asks the user to reconnect if permission is missing.

## Implementation Tickets

These tickets are intentionally scoped so each one can be implemented and reviewed independently. Each ticket should leave the app in a working state.

### VOID-001: Establish App Route And View Registry

Status: Done.

Goal: Keep navigation metadata in one place so the app shell, sidebar, and future breadcrumbs do not duplicate view ids.

Scope:

- Keep `src/app/views.ts` as the source of truth for view ids, labels, icons, and components.
- Keep `App.tsx` responsible only for selecting the active view and rendering the shell.
- Keep `Sidebar.tsx` presentational: it receives `navItems`, `activeView`, and `onNavigate`.

Libraries:

- No new libraries.

Useful snippet:

```tsx
export const APP_VIEWS = [
  { id: "explorer", label: "Explorer", icon: Compass, component: Explorer },
  { id: "folders", label: "Folders", icon: FolderOpen, component: Folders },
  { id: "settings", label: "Settings", icon: Settings, component: SettingsView },
];
```

Done when:

- Clicking every sidebar item renders the matching placeholder view.
- Adding a new view only requires updating `src/app/views.ts`.
- `npm run lint` and `npm run build` pass.

### VOID-002: Create Pure Web File System Adapter

Status: Done.

Goal: Isolate browser file-system APIs behind a small service so UI components do not call `showDirectoryPicker()` directly.

Scope:

- Add `src/features/library/services/fileSystem.ts` and sub-module files under `src/features/library/services/fileSystem/`.
- Export `pickDirectory()`, `verifyPermission(handle)`, `requestPermission(handle)`, `walkDirectory(handle, options)`, and `getFileMetadata(handle)`.
- Support `.mp4` and `.webm` only.
- Treat `.mov`, `.mkv`, and `.r3d` as future formats only; do not include them in scan results.
- Support optional recursive scanning through `scanSubfolders`.
- Return lightweight `DiscoveredVideoFile` records containing only name, path, extension, and a browser-neutral source from the walk generator.
- Normalize both `FileSystemFileHandle` and directory-input `File` values behind `MediaFileSource`.
- Use a `webkitdirectory` input fallback when `showDirectoryPicker()` is unavailable.
- Implement scan resilience in `walkDirectory` by wrapping directory entries and child walks in `try-catch` blocks, logging/swallowing filesystem access errors on specific directories while propagating `scan-aborted` errors immediately.

Libraries:

- No new libraries.
- Uses native File System Access API.

Useful snippet:

```ts
export async function pickDirectory() {
  if (!("showDirectoryPicker" in window)) {
    throw new Error("Directory picking is only supported in Chromium browsers.");
  }

  return window.showDirectoryPicker({ mode: "read" });
}
```

```ts
export async function* walkDirectory(directoryHandle, options = {}) {
  yield* walkDirectoryEntries(directoryHandle, [], {
    scanSubfolders: options.scanSubfolders ?? true,
    signal: options.signal,
  });
}

async function* walkDirectoryEntries(directoryHandle, pathParts, options) {
  try {
    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle.kind === "directory" && options.scanSubfolders) {
        try {
          yield* walkDirectoryEntries(handle, [...pathParts, name], options);
        } catch (e) {
          console.error(e);
        }
      } else if (handle.kind === "file" && /\.(mp4|webm)$/i.test(name)) {
        yield { name, fileHandle: handle, pathParts };
      }
    }
  } catch (e) {
    console.error(e);
  }
}
```

Done when:

- Picking a folder returns a directory handle.
- Walking a folder finds `.mp4` and `.webm` files.
- Non-video files are ignored.
- Coming-soon formats are ignored even if they appear in the picker modal.
- Unsupported browser path shows a helpful error state.

### VOID-003: Add Library Store And Persistence

Status: Done.

Goal: Store selected directory, scan state, settings needed by scanning, and recent paths in a predictable place.

Scope:

- Add `src/features/library/store/libraryStore.ts`.
- Track `directoryHandle`, `directoryName`, `scanStatus`, `scanProgress`, `scanError`, `recentPaths`, and `mediaIds`.
- Track a durable opaque `libraryId`, source kind, and non-persisted session files.
- Track scan phases separately: `foldersScanned`, `videosFound`, `thumbnailsGenerated`, and `thumbnailTotal`.
- Track whether a scan is running in the foreground or background.
- Exclude `directoryHandle` (a live non-serializable object) from the default JSON Zustand persistence layer; persist and restore the handle manually using direct `idb-keyval` operations.
- Revalidate permissions on app load via `handle.queryPermission()`. If permission is not `'granted'`, render a "Reconnect Library" warning/button in the UI to allow the user to trigger the prompt via an explicit gesture (as browsers block programmatic `requestPermission` on page load).

Libraries:

- Already installed: `zustand`.
- Already installed: `idb-keyval`.

Useful snippet:

```ts
import { create } from "zustand";
import { get, set } from "idb-keyval";

export const useLibraryStore = create((set) => ({
  directoryHandle: null,
  scanStatus: "idle",
  scanProgress: { found: 0, scanned: 0 },
  setDirectoryHandle: (directoryHandle) => set({ directoryHandle }),
}));
```

Done when:

- Selected directory survives a refresh when permission is still granted.
- If permission is missing, Restore Last Library prompts the user to reconnect instead of silently failing.
- Scan status can move through `idle`, `scanning`, `ready`, and `error`.
- Recent paths render from persisted state.
- No object URLs are stored in IndexedDB.

### VOID-004: Build Scanner With Progress And Cancellation

Status: Done.

Goal: Scan large folders without freezing the UI.

Scope:

- Add `src/features/library/hooks/useLibraryScanner.ts`.
- Add an `AbortController`-based cancellation path.
- Process files in batches and yield to the browser between batches.
- Resolve file metadata (`size` and `lastModified`) asynchronously in parallel chunks (e.g. batch size of 5-10) using `getFileMetadata` as items are discovered, instead of calling it sequentially during the walk generator.
- Store discovered media records in a media store.
- Keep thumbnail generation out of this ticket.
- Emit count-based discovery progress: folders scanned and videos found.
- Avoid showing fake scan percentages while the total number of videos is still unknown.

Libraries:

- No new libraries.

Useful snippet:

```ts
const pauseForPaint = () =>
  new Promise((resolve) => requestAnimationFrame(resolve));
```

```ts
if (index % 25 === 0) {
  setProgress({ found: index });
  await pauseForPaint();
}
```

Done when:

- A folder with hundreds of files begins showing progress quickly.
- The scan can be aborted.
- Scanning 400 videos does not attempt to decode all videos.
- Explorer can start rendering discovered video placeholders before thumbnails are ready.
- Scan results contain file handles and lightweight metadata only.

### VOID-005: Define Media Asset Store And Helpers

Status: Done.

Goal: Normalize media assets once and make them easy to query from Explorer and Player.

Scope:

- Add `src/features/explorer/store/mediaStore.ts` or `src/features/library/store/mediaStore.ts`.
- Add `src/utils/media.ts` for extension parsing, stable ids, and display helpers.
- Store assets by id plus an ordered id list.
- Include `thumbnailStatus`: `idle`, `queued`, `ready`, `error`.
- Include optional `duration`, `width`, `height`, and `thumbnailBlobKey`.

Libraries:

- Already installed: `zustand`.

Useful snippet:

```ts
export function createMediaId(libraryId, pathParts, fileName) {
  return [libraryId, ...pathParts, fileName].join("/");
}
```

Done when:

- Media assets are stable across rescans of the same route.
- Explorer can select all assets from the store.
- Player can derive previous and next ids from the same ordered list.

### VOID-006: Render Explorer Grid With Placeholder Tiles

Status: Done.

Goal: Show discovered videos immediately, even before thumbnails are ready.

Scope:

- Add `MediaGrid`, `MediaTile`, and `ExplorerToolbar` under `src/features/explorer/components/`.
- Render a generic video icon or shimmer while thumbnails are missing.
- Support search by filename.
- Use CSS grid first.
- Keep virtualization out until the basic grid works.

Libraries:

- No new libraries for first pass.
- Later candidate: `@tanstack/react-virtual`.

Useful snippet:

```css
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--tile-min, 220px), 1fr));
  gap: 0;
}
```

Done when:

- 400 placeholder tiles can render without broken layout.
- Search filters by filename.
- Clicking a tile can call a placeholder `openPlayer(assetId)` handler.
- Empty, scanning, ready, and error states are visually distinct.

### VOID-007: Generate Thumbnails Progressively

Status: Done.

Goal: Create thumbnails in the browser without blocking initial scan or rendering.

Scope:

- Add `src/features/explorer/services/thumbnailQueue.ts`.
- Add `generateVideoThumbnail(source, options)`.
- Queue thumbnail work with concurrency strictly limited to `1` on the main thread to avoid freezing the UI.
- Implement timeout safety (e.g. 2000ms) for media events (`loadedmetadata`, `seeked`) during thumbnail extraction to prevent a corrupted video file from permanently stalling the queue.
- Prioritize visible tiles first.
- Cache thumbnail blobs in IndexedDB.
- Revoke temporary object URLs after each thumbnail job.
- Report `thumbnailsGenerated / thumbnailTotal` so the scanning screen can show a real percentage during the thumbnail phase.

Libraries:

- Already installed: `idb-keyval`.
- No video processing library needed.

Useful snippet:

```ts
export async function generateVideoThumbnail(source, seekToSeconds = 1) {
  const file = await openMediaFile(source);
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "metadata";
  video.src = url;

  try {
    await waitForEvent(video, "loadedmetadata");
    video.currentTime = Math.min(seekToSeconds, video.duration * 0.1);
    await waitForEvent(video, "seeked");

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    return await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.76),
    );
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
```

Done when:

- Scan finishes before all thumbnails are generated.
- Visible tiles receive thumbnails first.
- Refreshing the app reuses cached thumbnails where possible.
- The scanning UI can display a truthful thumbnail percentage.
- Thumbnail generation can pause while the user is previewing or playing a video.
- Object URLs are revoked after use.

### VOID-008: Add Hover Preview With Snippet Scheduler

Status: Done.

Goal: Make a hovered tile preview several parts of a video, muted, without generating preview files.

Scope:

- Add `src/features/explorer/hooks/useHoverPreview.ts`.
- Add a hover delay, default 200ms.
- Allow only one active preview globally.
- Mount a muted `<video>` only while previewing.
- Seek through sampled timestamps and play each snippet briefly.
- Explicitly clean up video resource instances: when a hover preview ends or shifts, set the active video's `src = ""` and call `video.load()` before unmounting the element. This instantly releases the browser's hardware decoder and prevents performance degradation.
- Cancel timers and revoke object URL on mouse leave, blur, unmount, or route change.

Libraries:

- No new libraries.

Useful snippet:

```ts
function getSnippetPoints(duration) {
  if (duration < 8) return [0];
  if (duration < 30) return [0.1, 0.45, 0.75].map((p) => p * duration);
  return [0.08, 0.25, 0.45, 0.65, 0.85].map((p) => p * duration);
}
```

```ts
video.muted = true;
video.playsInline = true;
video.controls = false;
```

Done when:

- Moving across tiles quickly does not start previews.
- Hovering one tile starts a muted preview after the delay.
- Preview cycles through multiple timestamps for longer videos.
- Starting a new preview stops the previous one.
- Leaving a tile stops playback and cleans timers/object URLs.

### VOID-009: Implement Player Modal And Queue Navigation

Status: Done.

Goal: Open a clicked video in a focused overlay with audio and next/previous navigation.

Scope:

- Add `src/features/player/store/playerStore.ts`.
- Add `PlayerModal`, `PlayerVideo`, `PlayerOverlayMetadata`, and `PlayerEdgeZones`.
- Use current Explorer order as the playback queue.
- Support previous/next with buttons and keyboard.
- Support fullscreen with the browser Fullscreen API.

Libraries:

- No new libraries initially.
- Optional later: `react-hotkeys-hook` if keyboard logic grows.

Useful snippet:

```ts
function isTypingTarget(target) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
```

```ts
containerRef.current?.requestFullscreen();
```

Done when:

- Clicking a tile opens the modal with audio available.
- `ArrowRight` and `ArrowLeft` navigate queue items.
- `Escape` closes the modal.
- Fullscreen preserves overlay controls.
- Current, previous, and next object URLs are warmed or created quickly, while unused URLs are revoked.

### VOID-010: Wire Library Route Screens

Status: Implemented; real-folder manual QA pending.

Goal: Connect the folder and first-run route designs to real browser folder access while keeping the flow honest about pure web limitations.

Scope:

- Replace the Folders placeholder with route selection states:
  - configure route
  - app-level `Choose a folder to index` modal
  - native browser folder picker trigger
  - scanning progress with phase checklist
  - background indexing status
  - indexed success banner
- Reuse the same route modal from the Homepage CTA and the Folders `Browse Local` action.
- Show `.mp4` and `.webm` as active supported formats; show `.mov`, `.mkv`, and `.r3d` only as disabled `coming soon` chips.
- Keep a native browser picker as the actual file chooser: `showDirectoryPicker()` for persistent access, `webkitdirectory` for session access.
- Use the custom modal only to explain what will happen and to configure `Scan Subfolders`.
- After the picker returns a directory, show the scan screen with current directory, phase progress, `Abort Scan`, `Run in Background`, and `Scan Subfolders`.
- `Run in Background` should collapse the scan into a compact status chip/banner while indexing continues.
- On success, show a non-blocking banner/toast with `Start Exploring` instead of a route-confirmed modal.
- Redirect to Explorer or make `Start Exploring` navigate there. Explorer should show discovered tiles, not the homepage, once media exists.

Libraries:

- No new libraries.

Useful snippet:

```ts
const handlePickRoute = async () => {
  const handle = await pickDirectory();
  setDirectoryHandle(handle);
  startScan(handle);
};
```

Done when:

- `Configure Library Route` starts the pick and scan flow.
- Folders view can show selected route and scan status.
- Homepage and Folders trigger the same route-picking modal.
- The custom modal never pretends to browse arbitrary OS folders.
- Background scans remain visible through a compact status indicator.
- Successful indexing produces a banner/toast and makes Explorer show tiles.
- Recent paths are shown from persisted state.
- Scanner errors are visible and recoverable.

### VOID-011: Implement Settings Store And Controls

Status: Done.

Goal: Make the settings design control real app behavior.

Scope:

- Add `src/features/settings/store/settingsStore.ts`.
- Add settings for:
  - autoplay hover preview
  - preview delay: `150ms`, `250ms`, `500ms`
  - thumbnail priority: `visible-first`, `balanced`, `paused`
  - local thumbnail cache controls
  - show filenames
  - reduce motion
  - default sort order
  - restore last library
- Persist settings with `idb-keyval`.
- Keep `.mp4` and `.webm` enabled by default.
- Keep content formats in the scanner/config, but v1 Settings should not imply that coming-soon formats are active.

Libraries:

- Already installed: `zustand`.
- Already installed: `idb-keyval`.

Useful snippet:

```ts
const DEFAULT_SETTINGS = {
  autoplayHoverPreview: true,
  previewDelayMs: 250,
  thumbnailPriority: "visible-first",
  showFilenames: false,
  reduceMotion: false,
  defaultSortOrder: "modified-date",
  restoreLastLibrary: true,
};
```

Done when:

- Toggling autoplay disables hover video previews.
- Preview delay changes the hover preview start delay.
- Thumbnail priority changes how background thumbnail work is scheduled.
- Clear Cache removes persisted thumbnail blobs and resets thumbnail status.
- Show Filenames toggles filename overlays on gallery tiles.
- Reduce Motion disables or softens nonessential UI transitions.
- Default Sort Order changes initial Explorer ordering.
- Restore Last Library attempts to restore a stored directory handle and asks for reconnection when permission is missing.
- Settings survive refresh.

### VOID-012: Add Virtualization For Large Libraries

Status: Deferred until the 400+ item performance baseline is measured.

Goal: Keep Explorer smooth with hundreds or thousands of videos.

Scope:

- Replace or wrap the grid with virtualized rendering.
- Keep keyboard/focus behavior intact.
- Preserve visible-thumbnail prioritization.
- Measure before and after with 400+ mock assets.

Libraries:

- Add one:
  - `@tanstack/react-virtual`
  - or `react-window`

Suggested choice:

- Prefer `@tanstack/react-virtual` because it is flexible for grids and modern React.

Done when:

- Explorer remains responsive with at least 400 media records.
- Only visible rows/tiles are mounted.
- Thumbnail queue prioritizes mounted/visible tiles.
- Search and tile density still work.

### VOID-013: Add Testing And Quality Gates

Status: Done.

Goal: Give future feature work a basic safety net.

Scope:

- Add unit tests for media helpers and file filtering.
- Add component tests for view routing and placeholder navigation.
- Add focused tests for snippet-point calculation.
- Add manual QA checklist for local file API behavior.

Libraries:

- Add `vitest`.
- Add `@testing-library/react`.
- Add `@testing-library/jest-dom`.

Useful snippet:

```ts
expect(getSnippetPoints(120)).toHaveLength(5);
expect(getSnippetPoints(5)).toEqual([0]);
```

Done when:

- `npm test` exists.
- Media helper tests pass.
- Navigation smoke tests pass.
- Manual QA checklist covers folder pick, scan, thumbnail generation, hover preview, and player modal.

### VOID-014: Add Durable Annotations And Library Health

Status: Done (MVP).

Goal: Make local organization portable and make indexing failures explainable.

Scope:

- Persist favorites and free-text tags in IndexedDB, keyed by durable media ids.
- Keep tag names case-insensitively unique and capped at 32 characters.
- Assign curated, least-used colors for quick-created tags; allow explicit color management in Settings.
- Support quick assignment from tiles and the player, plus bulk assignment from Explorer.
- Filter by searchable tags using AND semantics and show global counts for favorites, folders, and tags.
- Isolate untagged videos so large libraries can find and classify orphaned items.
- Export/import versioned annotation JSON with case-insensitive tag reconciliation and union-based annotation merging.
- Present source controls and scan/statistics information as separate Source and Health sections under Library.
- Capture distinct discovery, metadata, and thumbnail diagnostics for the current scan session.

Maintenance decisions:

- Filter and bulk-selection state are ephemeral and excluded from persisted annotation data.
- Imports merge rather than replace so an accidental import cannot erase local favorites or tag assignments.
- Diagnostics are session-scoped and capped at 100 to avoid turning the primary store into an unbounded log.
- Chromium libraries cache lightweight file handles and index metadata in IndexedDB so refresh can paint the prior catalog immediately, then reconcile it in the background. Session-file sources are deliberately excluded because persisting `File` objects would duplicate the video bytes and violate the app's storage expectations.
- Explorer dropdowns use an app-owned listbox surface because native operating-system option popups cannot be styled consistently across browsers.
- Annotation exports may reveal library-relative filenames and paths and are labeled as private metadata.

Done when:

- Tile and player tag controls share one component and identical behavior.
- Bulk assignment is idempotent and can be cancelled without changing annotations.
- Counts update immediately as annotations change.
- A backup round-trip preserves favorites, tags, colors, and assignments.
- Library Health shows useful totals and isolated per-file scan failures.
