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

Optional later improvement: create cached preview sprite strips or short webm previews in a local backend/Electron/Tauri layer. In a browser-only app, runtime seeking is the simplest path.

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

- Browser-only vs. desktop shell: a browser-only app can use File System Access API in Chromium; Tauri/Electron would provide broader filesystem control and better future video processing.
- Metadata depth: file name/duration/resolution is browser-friendly; codec/bitrate analysis likely needs a native layer or ffmpeg.
- Preview caching: runtime hover snippets are simplest; generated preview assets are faster but require extra processing infrastructure.
