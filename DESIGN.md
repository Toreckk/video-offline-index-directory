# UI/UX and visual identity brief

Status: proposed direction for v0.4 reliability fixes and the v0.6 redesign. The application currently uses Obsidian Violet; this document specifies intended changes, not a claim that the redesign is implemented. Evidence and priorities are in [the assessment](docs/REPOSITORY_ASSESSMENT.md).

## Product character

VOID should feel like a calm, capable personal video library. Video content leads; controls are legible and predictable. Keep the dark canvas and violet accent as a starting point, but remove decorative density where it slows finding, watching or organizing.

The current first run has a coherent atmosphere, but oversized empty-state artwork, “Cinematography,” “cinematic canvas,” and “Configure Library Route” obscure a simple action. Use **“Your video library, kept local”** and **“Add a video folder.”** Only list supported formats. Explain permission, local data and optional background work in plain language.

## Information architecture

| Destination | Responsibility | Primary action |
| --- | --- | --- |
| Browse | Search, filter, sort, select and play the active library | Play a video; add folder on first run |
| Collections | Saved live queries with presets and advanced rules | Create collection |
| Library management | Sources, offline/relink state, background jobs, health and duplicates | Add/reconnect source; inspect health |
| Settings | Playback, appearance, Data & backup, advanced native settings | Change preference or back up |
| Home, later | Continue watching and recent additions when real content exists | Resume |

“Library” should not compete with “Explorer” as two apparent browse destinations. User sessions will determine whether management lives in the sidebar or under a source selector. Preserve search/filter/scroll context on return from a collection or player. Add Insights only after its data contract and user value are established.

## Core flow specifications

**First run:** one main action, two sentences about local access, accurate MP4/WebM support. Folder selection returns to visible first results; progress is nonblocking. Differentiate no folder, empty supported-video result, active filters with no matches, missing/offline drive and scan error. Every state supplies Add folder, Clear filters, Reconnect, Retry or View diagnostics as appropriate.

**Browse:** search and active-filter chips stay visible. Put density/sort into compact controls and advanced filters into a panel. Keep counts meaningful under scope. Provide mosaic and readable list layouts; details belong in an inspector instead of eight tiny overlays on every tile. Favorite/quick-tag can remain directly available; additional actions use a discoverable menu accessible by keyboard. Selection mode gets an explicit entry, count, select/clear and action bar; clicking a video should not unexpectedly toggle tagging.

**Collections:** start from simple examples such as Unwatched or tagged A + B. Show a plain-language rule summary and live count. Advanced All/Any/Not trees retain existing expressive power and become progressively disclosed. Before deletion, show the scope (“collection only; videos stay”) and supply Undo or confirmation. Preserve editing drafts and navigation context.

**Player:** keep familiar transport controls and explicit queue scope. Distinguish Resume and Start over. Make previous/next available as real visible controls; edge gestures are supplementary. Keep focused controls visible rather than hiding them after three seconds. Resolve Left/Right navigation versus seeking deliberately, document shortcuts, and preserve native slider keyboard interactions. A loading/error state offers Retry, Next or Close and a specific cause when known. Closing or replacing media must release playback ownership before any animation ends.

**Recovery:** Data & backup sits outside the tag catalog. Show what a backup contains, which libraries it affects, matched/unmatched/conflicting records, and whether the result is durably saved. Avoid success messages before commit. Native/storage diagnostics explain an action users can take; implementation traces remain in an optional details panel.

## Layout and accessibility acceptance

- Use reusable semantic dialog/menu/button/field/status components. Modal opening moves focus inside, background becomes inert, Tab stays inside, Escape closes the top layer, and close restores focus to the trigger or a sensible surviving item. An ARIA role alone is insufficient.
- Visible focus on every control and current navigation state exposed accessibly. Ensure a virtualized item does not disappear while focused; return focus sensibly when a filter removes it.
- Essential actions work without hover, color perception or a pointing device. Tags include readable names and selected state. Status changes use appropriate polite announcements without narrating every thumbnail.
- Target readable 14–16px body/control text and at least 12px secondary metadata; avoid current 8–10px essential labels. Check WCAG AA contrast, not just token colors in isolation. Use comfortable approximately 40px control hit areas; smaller dense controls need equivalent accessible interaction and spacing.
- Validate the desktop minimum 1024×700, laptop/desktop dimensions, Windows scaling and 200% content zoom. Sidebar collapses deliberately; dialogs and player panels stay reachable through scrolling. Do not promise phone support before mobile flows are designed.
- Respect system reduced-motion preference by default with a user override. Prefer 120–180ms purposeful transitions; avoid blanket scaling, persistent blur and auto-preview when reduced motion is requested. Keep a low-distraction preview preference.

The dialog interaction contract follows the [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). It must be tested with actual browser/WebView2 and assistive technology.

## Visual system and logo deliverables

Retain `#101417`/`#0b0f11` as candidate canvas tones and `#8b5cf6`/`#a78bfa` as violet accents. Consolidate semantic tokens for surface, border, text, muted text, focus, selected, warning, error and success. Define a small spacing/radius/type scale; reduce scattered hardcoded near-identical colors and oversized uppercase tracking. Use bundled fonts or a system stack so offline behavior is real.

Create two or three original identity directions around a frame, index or play motif. Evaluate recognition before visual novelty; do not copy another player's mark. Deliver an editable SVG wordmark and symbol, monochrome/light/dark versions, clear-space and minimum-size guidance, favicon and Windows icon sizes (including 16/32/48/256px). Check real taskbar/installer appearance at small sizes, transparency and high contrast. Keep the current icon until the selected replacement is integrated across all surfaces.

A brand change must **not** change `com.toreckk.void`, storage keys, package identities, MSI upgrade code or NSIS upgrade continuity. About text, README, app title and installer descriptions should agree. Use synthetic/consented library screenshots, labelled by edition; do not invent screenshots of future features.

## Delivery sequence

1. Fix misleading copy, missing recovery actions and dialog focus in the reliability milestone.
2. Run five formative user sessions and sketch navigation/first-run/browse/player flows.
3. Implement shared accessible primitives and tokens; validate layouts with populated and failure states.
4. Apply the design feature by feature with shared browser/desktop regression coverage.
5. Integrate the selected brand assets, capture current screenshots and repeat task-based user sessions and performance checks.

Successful redesign means users complete tasks with less assistance, can read and operate controls, and retain library context. A new logo or more animation alone does not satisfy the milestone.
