# VOID Manual QA Checklist

Run the app in a Chromium-based browser. Use a disposable test folder containing a few valid `.mp4` and `.webm` files, nested folders, unsupported files, and one intentionally corrupt video.

Repeat the folder-selection, scan, preview, and player checks in Firefox. Firefox should use session folder access and request reconnection after a browser restart while retaining the same library metadata identity.

## Folder access and restore

- Open `Configure Library Route` from Explorer and confirm the explanatory modal appears before the native folder picker.
- Confirm `.mp4` and `.webm` are active while `.mov`, `.mkv`, and `.r3d` are marked coming soon.
- Cancel the native picker and confirm the app remains usable with no error banner.
- Pick the test folder and confirm the Folders screen shows its name and connected permission state.
- Refresh the page. Confirm a granted handle rescans automatically when `Restore last library` is enabled.
- Revoke site access to the folder, refresh, and confirm `Reconnect Library` appears instead of an automatic permission prompt.
- Disable `Restore last library`, refresh, and confirm the saved route is not opened automatically.
- In Firefox, select the same folder after a restart and confirm it reconnects to the existing library rather than creating a second identity.
- During Firefox reconnection, select a differently named folder and confirm VOID rejects it instead of attaching it to the existing library id.
- In Firefox, confirm the route modal closes and Folders appears immediately after selection while scanning continues.

## Discovery and progress

- Scan with `Scan subfolders` enabled and confirm nested `.mp4`/`.webm` files appear.
- Scan with it disabled and confirm nested videos are excluded.
- Confirm unsupported and non-video files never appear in Explorer.
- Confirm folder/video counters increase without a fake discovery percentage.
- Click `Run in Background`, navigate between screens, and confirm the compact indexing status remains visible.
- Start a scan and click `Abort Scan`; confirm the UI remains responsive and any discovered partial results stay usable.
- Confirm a corrupt or unreadable nested file/folder does not stop the rest of the library from indexing.

## Thumbnails and Explorer

- Confirm placeholder tiles appear before thumbnail work finishes.
- Confirm visible tiles receive thumbnails before off-screen tiles when priority is `Visible first`.
- With Explorer sorted differently from filesystem discovery order, confirm thumbnails fill from the visible top rows downward; scrolling should reprioritize the approaching rows.
- Confirm thumbnail progress shows a real completed/total percentage.
- Refresh and rescan; confirm cached thumbnails appear without being regenerated where possible.
- Clear the thumbnail cache in Settings and confirm original video files are unchanged.
- Verify filename search, all three sort orders, all three tile densities, and the filename overlay toggle.
- Favorite several videos and confirm the Favorites filter includes only those videos after refresh.
- Create `year:2025` and `christmas`, assign both to one video, and confirm selecting both filters requires both tags.
- Confirm selecting a parent folder includes its descendant folders and combines correctly with search, Favorites, and tag filters.
- Confirm Favorites, folder options, and tag search results show correct library-wide counts.
- Select Untagged and confirm only videos with zero tags remain; assigning a tag should remove a video from this result.
- Open the Tags dropdown, search by a partial tag name, select multiple tags, and confirm the result requires every selected tag.
- From a tile, open the quick tag control, create a tag, and confirm it is assigned without opening the player.
- Choose `Add videos to tag...`, select several tile checkboxes, apply, and confirm all selected videos receive the tag. Repeat and confirm there are no duplicate assignments.
- Click directly on the visible bulk checkbox/label and confirm the tile toggles selected state.
- Cancel a bulk assignment and confirm it changes no annotations.
- Repeat with 400+ videos and record scroll/input responsiveness before enabling virtualization work.
- In Chromium, refresh a previously scanned library and confirm cached tiles paint before the background reconciliation scan completes; removed files should disappear when reconciliation finishes.
- In Firefox, confirm refresh still requires folder reconnection and does not silently copy full video files into browser storage.

## Hover preview

- Sweep the pointer quickly across tiles and confirm previews do not start before the configured delay.
- Hover one tile and confirm its preview is muted and samples multiple timestamps for a long video.
- Move directly to another tile and confirm only the new preview continues.
- Disable autoplay previews and confirm no tile mounts a playing preview.
- Start a preview while thumbnails are generating and confirm thumbnail work pauses, then resumes afterward.

## Player

- Click a tile and confirm the modal opens with native audio controls.
- Favorite a video from the player and assign an existing tag.
- Quick-create a tag from the player and confirm it is immediately assigned with an automatically selected curated color.
- Open quick tags on tiles along the right and bottom viewport edges; confirm the menu remains fully visible and clicks never reach the tile behind it.
- With more than six tags, search in the quick-tag menu and confirm the scrollable result list assigns the intended tag.
- With 100+ tags, confirm quick assignment, Explorer filtering, and bulk-target selection all provide search and show assigned, favorite, recent, and remaining tags consistently.
- Favorite several tags, refresh, and confirm those preferences persist and remain ahead of the general catalog.
- In a section with more than 60 tags, confirm the initial list is bounded and `Show more` exposes the complete section.
- Assign a previously unused tag and confirm it moves into Recently Used and its usage count updates immediately.
- Open one dropdown and then another; confirm the first closes. Click outside or press Escape and confirm the active dropdown closes without opening/favoriting a video underneath.
- Confirm quick-tag search shows only one clear-search X and quick-create remains visible above the scrollable tag list.
- Quick-create a differently-capitalized existing tag name and confirm no duplicate is created while the existing tag is assigned.
- Confirm quick-tag sections are alphabetical, including Recently used, while the Explorer Tags filter is ordered by descending video count.
- Open quick add on a heavily tagged video and confirm Assigned is collapsed by default, can be expanded to remove tags, and searching only shows assigned tags when they match the query.
- Select an Explorer tag filter, search for another tag, then clear the search. Confirm every selected tag remains pinned in the Selected tags section and is not duplicated below.
- Confirm tiles show at most three tag chips below the filename, followed by a `+N` overflow count, with size and duration aligned together at the lower right.
- Rescan a library with existing cached thumbnails and confirm durations are populated instead of remaining `--:--`.
- In Settings, change that tag color, verify its usage count, and delete it using the confirmation step.
- Open Settings and confirm Experience, Library, and Tags are separate sections whose controls do not appear in the wrong section.
- In Settings > Tags, rename a tag and confirm all existing video assignments keep the new name. Try renaming it to an existing tag with different capitalization and confirm the conflict is rejected.
- Migrate a populated tag into an existing tag, confirm assignments are deduplicated, and test both keeping and deleting the empty source tag.
- Link `year:1991` to `year:1900s` and that tag to `year:1000s`; assigning `year:1991` must add all three exactly once. Attempt a reverse link and confirm the cycle is rejected.
- Create collections for `A AND B`, `A AND NOT C`, `A OR B`, and `(A OR B) AND NOT (C OR D)` using nested groups. Edit a saved collection and confirm counts and contents update immediately without recreating it.
- Confirm the Collections catalog does not render any collection's videos. Open a collection, confirm its dedicated viewer and queue, then use Back to collections.
- Create at least 61 tags, then verify search, Name/Most used/Recently used sorting, Favorites/Unused scopes, summary counts, and the 50-row `Load more` boundary.
- Export annotations, change local favorites/tags, then import the backup and confirm data is merged rather than destructively replaced.
- Use left/right edge buttons and `ArrowLeft`/`ArrowRight` to navigate the current filtered/sorted Explorer queue.
- Press Space outside form controls and confirm play/pause toggles.
- Press `f` and confirm the entire player container enters fullscreen with overlays intact.
- Press Escape once in fullscreen to exit fullscreen, then again to close the player.
- Confirm the Explorer header never appears over the player or fullscreen frame, and player tag popovers remain above the player.
- Confirm always-visible previous/next buttons sit beside the video and keyboard Left/Right selects the same adjacent videos.
- Watch part of a video, close it, reopen it, and confirm playback resumes near the saved position. Reach 90%, confirm Watched appears, then toggle it back to Unwatched.
- Complete a video twice, confirm the tile shows an eye with `2`, open Video info to inspect completed plays and timestamps, and sort Explorer by Most watched.
- Confirm tiles with zero completed plays show no watched badge or eye count; tiles with completed plays show a clearly readable eye/count directly below the file-type badge, unaffected by long or numerous tags.
- Set default volume to 30% and playback speed to 1.25×, then open both MP4 and WebM files and confirm both defaults are applied.
- Hover and keyboard-focus every player icon and confirm its tooltip explains the action. Copy a video's relative path and confirm it contains its library folders and filename.
- Hover a tile and confirm the file type remains readable at the top left while the right-side action stack does not obscure the title or metadata.
- Confirm the tile's overflow, favorite, and tag buttons form a vertical stack, while the overflow menu contains Play, Watched, Video info, and Copy relative path.
- With a quick-tag popover open, wheel over both scrollable and non-scrollable areas and confirm the Explorer page never scrolls behind it.
- Export a populated annotation backup, confirm the message reports its compact size, then import both version-1 and version-2 files and verify equivalent merged data.
- Confirm opening/closing many videos does not leave playback audio running or steadily increase decoder usage.
- Open a video from a filtered Explorer result and from a smart collection; confirm Displayed order, Shuffle, and Smart shuffle stay inside the queue that was visible when playback opened.
- Confirm Smart shuffle does not repeat a video before its current queue is exhausted, Repeat all starts a new cycle, Repeat one records completion and restarts the same video, and Repeat off stops at the scope boundary.
- Confirm the high-contrast previous/next buttons remain visible over the video edges in the maximized player and in fullscreen without reserving side gutters.
- In both the maximized player and fullscreen, move the pointer over the bottom of the video and confirm the native pause, timeline, and volume controls appear and remain clickable beneath the custom overlay chrome.
- Confirm the player title, action menu, and navigation arrows fade after three seconds without pointer activity, hide immediately when the pointer leaves the player, and return on pointer movement or focus.
- Confirm the default playback controls open in Displayed order with Repeat one selected, and that both chevrons remain geometrically centered inside their circular buttons.
- Confirm videos with black opening frames retry later thumbnail positions and show a useful poster after the refreshed thumbnail cache is generated.
- Open the docked tagging workspace and confirm the video resizes beside it on desktop, quick tagging remains available, tag changes follow the selected video, and the panel can be closed without closing playback.
- Under Library > Health > Duplicates, run analysis and confirm matching sampled-content groups and filename-only collisions are presented separately.
- Choose a preferred duplicate, merge metadata, and confirm tags, favorite state, playback history, and play counts are copied to it while every source file and source metadata record remains unchanged.
- Confirm an unsuffixed filename is listed before its `(1)`, `(2)`, and later copies. Copy a filename and confirm only the name plus extension reaches the clipboard, that its button changes to `Copied!`, and that the feedback resets after refresh.

## Accessibility and resilience

- Navigate sidebar, route modal, Explorer tiles, and player controls using only the keyboard.
- Confirm focus indicators remain visible and the modal buttons have meaningful accessible names.
- Enable `Reduce motion` and confirm nonessential animation and transitions stop.
- Open each native select in Chromium and Firefox and confirm option text and backgrounds follow the dark theme.
- Open each Explorer dropdown and confirm its custom listbox, hover, selected state, and scroll area use the VOID theme.
- Open Library > Health and confirm video/size/duration/format/annotation totals match the current library.
- Set Library ready notification to 10 seconds and confirm it dismisses automatically. Repeat with Never (`0`) and confirm it remains until manually closed.
- Complete a scan while Explorer is already active and confirm the Library ready notification never appears, including after navigating to another tab.
- Include a corrupt or unreadable item and confirm its discovery, metadata, or thumbnail issue appears in Library > Health without stopping the rest of the scan.
- Inspect the browser console through every flow and confirm no uncaught errors or object URL warnings.

## Desktop v0.2.0 regression

- Relaunch a previously indexed desktop library and confirm cached videos paint before background reconciliation finishes.
- While Explorer is open, add, replace, rename, and remove videos in the selected folder. Confirm each change appears without a manual rescan and the non-blocking `Updating library` status clears afterward.
- Rename a tagged or favorited video and confirm its tags, favorite state, and playback history follow the new path.
- Add or rename several files quickly and confirm the coalesced update produces no duplicate tiles or lost metadata.
- Trigger a second library change while a new video's thumbnail is still pending and confirm the thumbnail completes instead of remaining queued.
- Rename a tagged video, then add a different video at the original path and confirm the new file does not inherit the renamed video's tags, favorite, or playback history.
- With roughly 5,000 videos, scroll rapidly from the beginning toward the end and confirm tiles keep filling without a multi-second initial freeze. Open a video and confirm its playback queue still covers the complete filtered result.
- Confirm the VOID title bar can drag the window, double-click to maximize/restore, and exposes working minimize, maximize/restore, and close buttons with visible keyboard focus.
- Enable `Use native Windows title bar` in Settings, relaunch, and confirm native decorations return. Disable it and relaunch to restore the themed title bar.
- Disable `Restore last library`, relaunch, reconnect the remembered native library, and confirm scanning and playback succeed without selecting a different folder.
- With the themed title bar enabled, confirm there is only one vertical page scroller and the bottom of every view remains reachable without a 32 px overflow strip.

## Windows installer smoke test

- On a clean Windows 10 or Windows 11 x64 account, install the NSIS `.exe`, launch V.O.I.D., select a disposable library, and complete one scan and playback check.
- Uninstall the NSIS build and confirm the application entry and installed program files are removed without touching the selected video library.
- Repeat install, launch, scan, playback, and uninstall with the MSI package.
- Confirm both installed applications report the release version from `release-manifest.json` and Windows identifies them as unsigned rather than as a trusted publisher.
- Hash both downloaded installers and confirm they match `SHA256SUMS.txt` from the GitHub Release.

## Desktop v0.3.1 collection and control polish

- With the themed title bar enabled, launch through `pnpm dev:desktop` and relaunch several times. Confirm the themed V.O.I.D. bar is always present and the native Windows bar never appears above it.
- Toggle `Use native Windows title bar` on and off rapidly, then relaunch once with each preference. Confirm exactly one title bar appears and its minimize, maximize/restore, close, drag, and double-click controls work.
- In Library Source, confirm a native library says `Persistent desktop access`, a retained browser handle says `Persistent browser access`, and Firefox/session selection says `Session-only browser access`.
- Confirm the native-library source also explains that desktop file actions are explicit and require confirmation.
- In Explorer and a smart collection duration rule, change both duration limits and use the quiet `Min` and `Max` buttons to restore the shortest and longest measured library values. Confirm direct numeric entry and both slider handles still work.
- Create four tag rules A, B, C, and E. Confirm `Add nested group` is visually separated beneath the ordinary rule actions.
- Confirm each bulk-selection checkbox is vertically centered with its rule controls. Select A, B, and C, group them as `Any rule`, and confirm their saved collection results combine with E as expected.
- Change E to `Does not have` and confirm the saved collection results represent `(A OR B OR C) AND NOT E`.
- Add another nested group, move one individual rule into it using the move control, save, reopen, and confirm the structure and results persist.
- Repeat selection, grouping, moving, and nested-group creation with keyboard controls only; confirm selected rules remain clear and no rule is duplicated or lost.
- Complete the standard Windows installer smoke test above with the current-commit NSIS and MSI packages.

## Desktop v0.3.0 media intelligence and cleanup

Use disposable copies of media for every cleanup test. Never exercise an in-development removal workflow against the only copy of a personal video.

### Native media analysis

- Launch without an available native probe and confirm library restoration, scanning, WebView thumbnails, playback, and Library Health continue to work without a blocking error.
- With the approved probe available, scan representative MP4 and WebM videos and compare reported duration, dimensions, video codec, and audio codec with a trusted external inspection.
- Include a corrupt file, unsupported stream layout, and deliberately slow probe fixture; confirm diagnostics are bounded, other videos continue enriching, and cancellation/reconciliation remains responsive.
- Rescan an unchanged library and confirm cached technical metadata is reused. Replace one file and confirm only the changed identity is re-probed.

### Duration filtering

- In Explorer, confirm the dual-handle selector starts at the shortest known video and ends at the longest known video in the library.
- Drag both handles and use the synchronized minute inputs to isolate narrow ranges such as 8–10 minutes; confirm videos exactly on both selected boundaries remain included.
- Before moving either handle, confirm the full-span default does not filter the library. After narrowing the range, confirm media without measured duration is excluded and its missing coverage remains visible in Library Health.
- Clear the filter and confirm the complete current folder/tag/search scope returns.
- Save equivalent duration rules in a smart collection, reopen it after relaunch, and confirm its results exactly match the same Explorer range.

### Duplicate evidence

- Confirm same-name-only groups are labeled as collisions and never expose cleanup.
- Confirm probable groups explain their matching filename, size, duration, dimensions, codec, or sampled-fingerprint evidence without claiming byte equality.
- Complete full SHA-256 verification on identical and deliberately different candidates; only identical complete hashes may become exact groups.
- Modify a candidate after verification and confirm its exact status is invalidated before any cleanup action.

### Recycle Bin cleanup

- Create at least three disposable byte-identical files, assign different tags/favorite/playback history to them, select a preferred copy, and cancel at the final confirmation. Confirm no file or metadata changes.
- Repeat and confirm cleanup. Verify the preferred file remains, supported metadata is merged into it, selected redundant copies appear in the Windows Recycle Bin, and Explorer/catalog state reconciles.
- Restore one removed file from the Recycle Bin and confirm the watcher or rescan returns it as a distinct media identity without corrupting the preferred copy's metadata.
- Attempt cleanup after changing, moving, or making one candidate inaccessible. Confirm every moved, skipped, and failed file is reported accurately and at least one verified copy remains.
- Confirm a path outside the selected library is rejected and the web edition exposes no Recycle Bin action.

### Release regression

- Repeat the 5,000-video/300-tag responsiveness fixture while metadata enrichment and duplicate analysis are active.
- Export metadata before cleanup, import it into a disposable matching library afterward, and confirm supported tags, favorites, collections, and playback data remain portable.
- Complete the standard Windows installer smoke test above with the current-commit NSIS and MSI packages.
