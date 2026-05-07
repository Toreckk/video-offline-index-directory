# VOID Implementation Plan

This project is a local-first media explorer for video files. The first production goal is: choose a library root, index supported videos, show them in a dense visual grid, preview muted snippets on hover, and open a focused player overlay with keyboard navigation.

## Current Architecture Review

The current app is a good visual prototype, but the first implementation pass mixed navigation, view ownership, and feature assumptions in a few files:

- `App.jsx` owned the active view map directly, which would become noisy as more views are added.
- `Sidebar.jsx` owned its own navigation list, so routes and visible navigation could drift apart.
- `Explorer.jsx` correctly chooses between empty and library states, but it will soon need data from a shared library store.
- `components/library/Library.jsx` is currently a placeholder, but the future grid, media tile, hover preview, and filters should live in a dedicated feature area rather than one large component.
- `store/` and `utils/` exist but do not yet encode domain concepts such as selected route, indexed assets, scan progress, playback queue, or settings.

The refactor in this pass creates a small view registry and placeholder views so navigation can scale without duplicating route metadata.

## Recommended Project Shape

```txt
src/
  app/
    views.jsx                 # Single registry for view ids, labels, icons, and components
  components/
    homepage/                 # Empty-state landing for Explorer
    library/                  # Temporary location for the future library grid
    placeholder/              # Shared placeholder screens while designs are implemented
    sidebar/                  # App navigation shell
  features/
    library/
      components/             # LibraryRouteCard, RecentPathList, ScanProgress, RouteConfirmed
      hooks/                  # useLibraryScanner, useLibraryRoute
      services/               # file-system adapters and indexing orchestration
      store/                  # library Zustand slice
      types/                  # media item shape, scan result shape
    explorer/
      components/             # MediaGrid, MediaTile, SearchBar, EmptyExplorerState
      hooks/                  # useVisibleMedia, useHoverPreview
    player/
      components/             # PlayerModal, PlayerControls, NextPrevZones
      hooks/                  # usePlayerKeyboardShortcuts
    settings/
      components/             # Toggle rows, density slider, format filters
      store/                  # settings Zustand slice
  store/
    appStore.js               # Optional shared root store once slices exist
  utils/
    media.js                  # extension helpers, duration formatting, stable ids
```

The app can start with `components/` and grow into `features/` as behavior arrives. The important boundary is: views compose feature components, feature services do I/O and indexing, shared components stay presentation-only.

## File Access Strategy

For a browser-only React app, selecting a local folder should use the File System Access API:

- `window.showDirectoryPicker()` opens a native directory picker in Chromium-based browsers.
- `FileSystemDirectoryHandle` lets the app iterate entries and request persisted permission.
- Recursive scanning can walk subdirectories when the setting is enabled.
- Handles can be stored in IndexedDB, but permission must still be revalidated on future sessions.

Recommended libraries:

- `idb-keyval` is already installed and is enough for persisting directory handles, app settings, indexed metadata, and recent paths.
- `zustand` is already installed and is a good fit for selected route, scan state, media list, current player index, and settings.
- `react-window` or `@tanstack/react-virtual` should be added before the real grid. Use virtualization once there are hundreds or thousands of videos.

Fallback note: Firefox/Safari support for directory handles is limited. If broad browser support becomes important, use `<input type="file" webkitdirectory multiple>` as a degraded picker. It can read selected files but does not provide the same persistent directory handle.

## Data Model

A minimal media item should be normalized early:

```ts
type MediaAsset = {
  id: string;
  name: string;
  extension: ".mp4" | ".webm";
  pathParts: string[];
  fileHandle: FileSystemFileHandle;
  objectUrl?: string;
  size: number;
  lastModified: number;
  duration?: number;
  width?: number;
  height?: number;
  posterUrl?: string;
};
```

Use stable ids based on the route id plus path parts, not random ids. Object URLs should be created lazily and revoked when tiles/player unmount to avoid memory leaks.

## Library Route And Scanning Flow

1. User clicks `Configure Library Route`.
2. App opens `showDirectoryPicker()`.
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
   - Placeholder views for Player, Folders, Settings
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

- Browser support: the target should be Chromium-first because the File System Access API is the cleanest pure web path for selecting and revisiting local folders.
- Metadata depth: file name/duration/resolution is browser-friendly; codec/bitrate analysis likely needs a native layer or ffmpeg.
- Preview caching: runtime hover snippets are simplest; generated preview assets are faster but require extra processing infrastructure.

## Implementation Tickets

These tickets are intentionally scoped so each one can be implemented and reviewed independently. Each ticket should leave the app in a working state.

### VOID-001: Establish App Route And View Registry

Goal: Keep navigation metadata in one place so the app shell, sidebar, and future breadcrumbs do not duplicate view ids.

Scope:

- Keep `src/app/views.jsx` as the source of truth for view ids, labels, icons, and components.
- Keep `App.jsx` responsible only for selecting the active view and rendering the shell.
- Keep `Sidebar.jsx` presentational: it receives `navItems`, `activeView`, and `onNavigate`.

Libraries:

- No new libraries.

Useful snippet:

```jsx
export const APP_VIEWS = [
  { id: "explorer", label: "Explorer", icon: Compass, component: Explorer },
  { id: "player", label: "Player", icon: PlayCircle, component: Player },
];
```

Done when:

- Clicking every sidebar item renders the matching placeholder view.
- Adding a new view only requires updating `src/app/views.jsx`.
- `npm run lint` and `npm run build` pass.

### VOID-002: Create Pure Web File System Adapter

Goal: Isolate browser file-system APIs behind a small service so UI components do not call `showDirectoryPicker()` directly.

Scope:

- Add `src/features/library/services/fileSystem.js`.
- Export `pickDirectory()`, `verifyPermission(handle)`, `requestPermission(handle)`, and `walkDirectory(handle, options)`.
- Support `.mp4` and `.webm` only.
- Support optional recursive scanning through `scanSubfolders`.
- Return normalized lightweight file records, not object URLs.

Libraries:

- No new libraries.
- Uses native File System Access API.

Useful snippet:

```js
export async function pickDirectory() {
  if (!("showDirectoryPicker" in window)) {
    throw new Error("Directory picking is only supported in Chromium browsers.");
  }

  return window.showDirectoryPicker({ mode: "read" });
}
```

```js
export async function* walkDirectory(directoryHandle, pathParts = []) {
  for await (const [name, handle] of directoryHandle.entries()) {
    if (handle.kind === "directory") {
      yield* walkDirectory(handle, [...pathParts, name]);
      continue;
    }

    if (handle.kind === "file" && /\.(mp4|webm)$/i.test(name)) {
      yield { name, fileHandle: handle, pathParts };
    }
  }
}
```

Done when:

- Picking a folder returns a directory handle.
- Walking a folder finds `.mp4` and `.webm` files.
- Non-video files are ignored.
- Unsupported browser path shows a helpful error state.

### VOID-003: Add Library Store And Persistence

Goal: Store selected directory, scan state, settings needed by scanning, and recent paths in a predictable place.

Scope:

- Add `src/features/library/store/libraryStore.js`.
- Track `directoryHandle`, `directoryName`, `scanStatus`, `scanProgress`, `scanError`, `recentPaths`, and `mediaIds`.
- Persist safe values with `idb-keyval`.
- Persist directory handles separately from JSON-like metadata.
- Revalidate permissions on app load before scanning.

Libraries:

- Already installed: `zustand`.
- Already installed: `idb-keyval`.

Useful snippet:

```js
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
- Scan status can move through `idle`, `scanning`, `ready`, and `error`.
- Recent paths render from persisted state.
- No object URLs are stored in IndexedDB.

### VOID-004: Build Scanner With Progress And Cancellation

Goal: Scan large folders without freezing the UI.

Scope:

- Add `src/features/library/hooks/useLibraryScanner.js`.
- Add an `AbortController`-based cancellation path.
- Process files in batches and yield to the browser between batches.
- Store discovered media records in a media store.
- Keep thumbnail generation out of this ticket.

Libraries:

- No new libraries.

Useful snippet:

```js
const pauseForPaint = () =>
  new Promise((resolve) => requestAnimationFrame(resolve));
```

```js
if (index % 25 === 0) {
  setProgress({ found: index });
  await pauseForPaint();
}
```

Done when:

- A folder with hundreds of files begins showing progress quickly.
- The scan can be aborted.
- Scanning 400 videos does not attempt to decode all videos.
- Scan results contain file handles and lightweight metadata only.

### VOID-005: Define Media Asset Store And Helpers

Goal: Normalize media assets once and make them easy to query from Explorer and Player.

Scope:

- Add `src/features/explorer/store/mediaStore.js` or `src/features/library/store/mediaStore.js`.
- Add `src/utils/media.js` for extension parsing, stable ids, and display helpers.
- Store assets by id plus an ordered id list.
- Include `thumbnailStatus`: `idle`, `queued`, `ready`, `error`.
- Include optional `duration`, `width`, `height`, and `thumbnailBlobKey`.

Libraries:

- Already installed: `zustand`.

Useful snippet:

```js
export function createMediaId(rootName, pathParts, fileName) {
  return [rootName, ...pathParts, fileName].join("/");
}
```

Done when:

- Media assets are stable across rescans of the same route.
- Explorer can select all assets from the store.
- Player can derive previous and next ids from the same ordered list.

### VOID-006: Render Explorer Grid With Placeholder Tiles

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

Goal: Create thumbnails in the browser without blocking initial scan or rendering.

Scope:

- Add `src/features/explorer/services/thumbnailQueue.js`.
- Add `generateVideoThumbnail(fileHandle, options)`.
- Queue thumbnail work with concurrency `1` or `2`.
- Prioritize visible tiles first.
- Cache thumbnail blobs in IndexedDB.
- Revoke temporary object URLs after each thumbnail job.

Libraries:

- Already installed: `idb-keyval`.
- No video processing library needed.

Useful snippet:

```js
export async function generateVideoThumbnail(fileHandle, seekToSeconds = 1) {
  const file = await fileHandle.getFile();
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
- Thumbnail generation can pause while the user is previewing or playing a video.
- Object URLs are revoked after use.

### VOID-008: Add Hover Preview With Snippet Scheduler

Goal: Make a hovered tile preview several parts of a video, muted, without generating preview files.

Scope:

- Add `src/features/explorer/hooks/useHoverPreview.js`.
- Add a hover delay, default 200ms.
- Allow only one active preview globally.
- Mount a muted `<video>` only while previewing.
- Seek through sampled timestamps and play each snippet briefly.
- Cancel timers and revoke object URL on mouse leave, blur, unmount, or route change.

Libraries:

- No new libraries.

Useful snippet:

```js
function getSnippetPoints(duration) {
  if (duration < 8) return [0];
  if (duration < 30) return [0.1, 0.45, 0.75].map((p) => p * duration);
  return [0.08, 0.25, 0.45, 0.65, 0.85].map((p) => p * duration);
}
```

```js
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

Goal: Open a clicked video in a focused overlay with audio and next/previous navigation.

Scope:

- Add `src/features/player/store/playerStore.js`.
- Add `PlayerModal`, `PlayerVideo`, `PlayerOverlayMetadata`, and `PlayerEdgeZones`.
- Use current Explorer order as the playback queue.
- Support previous/next with buttons and keyboard.
- Support fullscreen with the browser Fullscreen API.

Libraries:

- No new libraries initially.
- Optional later: `react-hotkeys-hook` if keyboard logic grows.

Useful snippet:

```js
function isTypingTarget(target) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
```

```js
containerRef.current?.requestFullscreen();
```

Done when:

- Clicking a tile opens the modal with audio available.
- `ArrowRight` and `ArrowLeft` navigate queue items.
- `Escape` closes the modal.
- Fullscreen preserves overlay controls.
- Current, previous, and next object URLs are warmed or created quickly, while unused URLs are revoked.

### VOID-010: Wire Library Route Screens

Goal: Connect the folder designs to real state while keeping the flow understandable.

Scope:

- Replace the Folders placeholder with route selection states:
  - configure route
  - picker modal trigger
  - scanning progress
  - route confirmed
- Keep the native browser picker as the actual file chooser.
- Use the custom modal only for app-level confirmation or recent path selection, not for reading arbitrary OS directories.

Libraries:

- No new libraries.

Useful snippet:

```js
const handlePickRoute = async () => {
  const handle = await pickDirectory();
  setDirectoryHandle(handle);
  startScan(handle);
};
```

Done when:

- `Configure Library Route` starts the pick and scan flow.
- Folders view can show selected route and scan status.
- Recent paths are shown from persisted state.
- Scanner errors are visible and recoverable.

### VOID-011: Implement Settings Store And Controls

Goal: Make the settings design control real app behavior.

Scope:

- Add `src/features/settings/store/settingsStore.js`.
- Add settings for:
  - autoplay previews on hover
  - tile density
  - scan subfolders
  - enabled formats
- Persist settings with `idb-keyval`.
- Keep `.mp4` and `.webm` enabled by default.

Libraries:

- Already installed: `zustand`.
- Already installed: `idb-keyval`.

Useful snippet:

```js
const DEFAULT_SETTINGS = {
  autoplayPreview: true,
  tileDensity: "comfortable",
  scanSubfolders: true,
  enabledFormats: [".mp4", ".webm"],
};
```

Done when:

- Toggling autoplay disables hover video previews.
- Tile density changes grid sizing.
- Scan subfolders affects the next scan.
- Settings survive refresh.

### VOID-012: Add Virtualization For Large Libraries

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

```js
expect(getSnippetPoints(120)).toHaveLength(5);
expect(getSnippetPoints(5)).toEqual([0]);
```

Done when:

- `npm test` exists.
- Media helper tests pass.
- Navigation smoke tests pass.
- Manual QA checklist covers folder pick, scan, thumbnail generation, hover preview, and player modal.
