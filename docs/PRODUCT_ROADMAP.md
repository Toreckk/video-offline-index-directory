# Product Roadmap

This roadmap records likely release placement rather than promising a feature before its design and acceptance gates are complete. Each release plan remains authoritative for committed scope.

## v0.3.0 — Media intelligence and recoverable cleanup

### Duration filtering

Add one shared duration-range predicate to Explorer and smart collections so both surfaces produce identical results.

Recommended controls:

- Presets for under 5 minutes, 5–15 minutes, 15–30 minutes, 30–59 minutes, and 1 hour or longer.
- Optional custom minimum and maximum values rather than requiring every useful range to become a preset.
- A visible unknown-duration count and explicit unknown-duration option; activating a numeric range excludes unknown values without pretending they are zero-length videos.
- Persisted duration rules in smart collections, with the current Explorer filter remaining session-scoped like other Explorer filters.

This belongs in v0.3.0 because native media enrichment is intended to make duration coverage reliable, duplicate intelligence already consumes duration, and the shared predicate can serve both Explorer and collections without duplicating UI logic.

## v0.3.1 — Collection editing, source, and duration-control polish

- Replace the Library Source message `Persistent read-only access · including subfolders` with capability-aware wording. The browser remains non-destructive, while desktop now supports narrowly scoped, explicitly confirmed Recycle Bin operations and may gain other native actions later; the status text must not make an inaccurate blanket claim.
- Replace the native numeric input steppers on the duration minimum and maximum fields with subtle in-field reset buttons. The minimum button jumps to the shortest measured library duration and the maximum button jumps to the longest. Keep them visually quiet until hover/focus, preserve direct numeric entry and the dual-handle slider, and provide explicit accessible labels.
- Make nested-group creation visually distinct, align bulk-selection controls, allow multiple direct rules to be wrapped into a new All/Any group, and provide an explicit move control for individual rules. Keep this keyboard-accessible and avoid introducing nested drag-and-drop complexity.

These are compatible interaction and copy improvements following the QA-approved v0.3.0 release.

## v0.4.0 — Local viewing insights

Add an offline-only analytics workspace after playback-history semantics and technical metadata are stable. The recommended label is **Insights** or **Stats**, not **States**: “states” suggests workflow status rather than analysis.

Recommended placement is a `Collections | Insights` tab pair with a scope selector for the whole library or one collection. If the workspace later outgrows that context, it can move to a top-level Insights navigation item without changing its underlying queries.

Suggested views:

1. **Overview** — library size, watched/unwatched counts, unique videos played, completed videos, total watch time, completion rate, favorites, and recent activity.
2. **Watch activity** — day/week/month ranges, watch-time trend, activity heatmap, completion trend, rewatches, abandoned videos, and most recent sessions.
3. **Tags** — most watched tags, watch time by tag, completion by tag, favorite/tag relationships, tag coverage, and tags with little recent activity.
4. **Collections** — size, watched percentage, time spent, completion, recent activity, and comparisons between saved collections.
5. **Library composition** — duration distribution, formats, codecs, resolutions, storage use, untagged media, duplicate candidates, and media-health coverage.

Before implementation, define whether V.O.I.D. stores a privacy-preserving event ledger or only daily aggregates. Current last-played/play-count data can support totals and recency, but accurate historical trends and heatmaps require timestamped events or durable daily rollups. All analytics remain local and must be included deliberately in backup/export schema decisions.

## v0.5.0 candidate — Trusted updates

Complete updater signing, key custody, release-channel metadata, rollback behavior, and recovery drills before enabling automatic desktop updates. Windows Authenticode signing remains a related but separate trust decision.

## v1.0.0 readiness

Reach stable platform contracts and metadata schemas, proven migrations and recovery, recoverable native file operations, representative 5,000+ video performance, reliable installation/update behavior, and a documented supported capability set.
