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
- Confirm tiles show at most three tag chips below the filename, followed by a `+N` overflow count, with size and duration aligned together at the lower right.
- Rescan a library with existing cached thumbnails and confirm durations are populated instead of remaining `--:--`.
- In Settings, change that tag color, verify its usage count, and delete it using the confirmation step.
- Open Settings and confirm Experience, Library, and Tags are separate sections whose controls do not appear in the wrong section.
- In Settings > Tags, rename a tag and confirm all existing video assignments keep the new name. Try renaming it to an existing tag with different capitalization and confirm the conflict is rejected.
- Create at least 61 tags, then verify search, Name/Most used/Recently used sorting, Favorites/Unused scopes, summary counts, and the 50-row `Load more` boundary.
- Export annotations, change local favorites/tags, then import the backup and confirm data is merged rather than destructively replaced.
- Use left/right edge buttons and `ArrowLeft`/`ArrowRight` to navigate the current filtered/sorted Explorer queue.
- Press Space outside form controls and confirm play/pause toggles.
- Press `f` and confirm the entire player container enters fullscreen with overlays intact.
- Press Escape once in fullscreen to exit fullscreen, then again to close the player.
- Confirm opening/closing many videos does not leave playback audio running or steadily increase decoder usage.

## Accessibility and resilience

- Navigate sidebar, route modal, Explorer tiles, and player controls using only the keyboard.
- Confirm focus indicators remain visible and the modal buttons have meaningful accessible names.
- Enable `Reduce motion` and confirm nonessential animation and transitions stop.
- Open each native select in Chromium and Firefox and confirm option text and backgrounds follow the dark theme.
- Open each Explorer dropdown and confirm its custom listbox, hover, selected state, and scroll area use the VOID theme.
- Open Library > Health and confirm video/size/duration/format/annotation totals match the current library.
- Include a corrupt or unreadable item and confirm its discovery, metadata, or thumbnail issue appears in Library > Health without stopping the rest of the scan.
- Inspect the browser console through every flow and confirm no uncaught errors or object URL warnings.
