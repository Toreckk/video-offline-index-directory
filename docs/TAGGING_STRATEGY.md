# Tagging Strategy: Enhanced Flat Tags

Status: Adopted for the current product phase.

## Context

VOID must support two very different usage patterns without forcing either one onto the other:

- Casual users may create only a few tags such as `family`, `holidays`, or `favorites`.
- Archivists may create hundreds of highly specific tags and apply many tags to one video to describe era, subject, provenance, condition, narrative, people, or any domain-specific concept.

VOID cannot assume a universal vocabulary. An early-film archive, a documentary collection, personal home videos, scientific recordings, and historical footage have incompatible classification needs. The application must therefore improve how tags are found, applied, and queried without prescribing which tags should exist.

The application is also local-first. Tag metadata currently lives in browser storage, must work without an account or server, and must remain usable in Chromium and Firefox despite their different file-access models.

## Decision

Use enhanced flat tags as the canonical model.

A tag is a stable entity with a user-provided name. VOID does not create required categories, enforce namespaces, or infer parent-child relationships. Scale is provided through search, ranking, preferences, bulk operations, and future query tools rather than through a mandatory taxonomy.

The current enhancements are:

- Case-insensitive unique names with the existing 32-character limit.
- Search in every primary tag-selection surface.
- Assigned tags pinned before unassigned tags.
- User-selected favorite tags.
- Recently used tags based on successful assignment.
- Frequency ranking based on annotation usage counts.
- Bounded initial rendering with explicit expansion for large sections.
- Usage counts in picker and management surfaces.
- Single-mutation bulk assignment rather than one persistence write per video.
- A dedicated Tags settings tab with a searchable, sortable management catalog.
- Stable-ID inline renaming with case-insensitive collision validation.
- Conflict-aware migration into an existing or newly created destination tag.
- Optional acyclic additive tag links with transitive expansion on assignment.
- Favorite and unused scopes, catalog summary counts, and 50-row progressive loading.

## Why this choice

Enhanced flat tags preserve the strongest property of the existing system: a user can create any useful label immediately without understanding a schema.

They also give us an evolutionary path. Search, ranking, saved queries, aliases, optional organizational views, and indexes can all be built around stable tag IDs. None of those capabilities require replacing the canonical annotation format or rewriting every consumer.

We are deliberately not using a mandatory hierarchy or predefined facets now because:

- A single tag may belong to several conceptual areas.
- Different archives disagree on valid categories and terminology.
- Hierarchies introduce parent implication, alias, conflict, loop, migration, and export semantics.
- Casual users should not have to design a taxonomy before tagging a video.
- Encoding structure directly into tag names would make later renames and reorganizations brittle.

## Domain boundaries

The annotation store owns persistence and mutation only:

- Tag definitions.
- Per-media annotations.
- Favorite-tag preferences.
- Ephemeral Explorer and bulk-selection state.

Pure catalog services own derived behavior:

- Enumerating valid tags in stable order.
- Text matching.
- Usage-count construction.
- Discovery ranking.
- Picker-section construction.

Presentation components own only local interaction state such as the current search text or whether a section is expanded.

Explorer, Settings, and player components must not independently reimplement tag enumeration, ranking, or usage counting. They consume the shared catalog services. This is the primary seam for future improvements.

## Current interaction model

When no search query is present, tag pickers use progressive disclosure:

1. Assigned tags.
2. Favorite tags.
3. Recently used tags.
4. Remaining tags ranked by usage, recency, and name.

When a search query is present, the picker returns one ranked result section. Search does not alter or normalize the user's vocabulary beyond the existing whitespace and case-insensitive uniqueness rules.

Large sections initially render a bounded number of tags and provide an explicit expansion action. This prevents a quick picker from mounting hundreds of interactive rows unnecessarily while ensuring every tag remains reachable through search or expansion.

## Known limitations

- Explorer tag filtering currently means all selected tags must match. It does not yet support explicit `ALL`, `ANY`, and `NONE` groups.
- Usage counts are derived by scanning the in-memory annotation record. This is acceptable for the current MVP but should become an inverted index when measured libraries make it a bottleneck.
- Favorite and recent tags are user-interface preferences, not semantic metadata.
- Tags do not currently support aliases, descriptions, rename history, or reversible relationship provenance.
- The 32-character name limit may need review for formal archival vocabularies.
- Annotation identity is based on durable library ID plus relative path. File moves or renames can therefore detach existing annotations until content fingerprints or sidecars are introduced.
- Browser-local persistence is not a preservation format. Export/import is a backup mechanism, not yet a full archival sidecar standard.
- Annotation backup version 2 uses compact tuple records and numeric tag references, and is serialized without presentation whitespace. Imports remain compatible with the more verbose version-1 object format.
- The Settings catalog renders in 50-row pages but is not virtualized. Virtualization should be added based on measured rendering cost rather than tag-count speculation alone.

## Viable improvements

### Near-term, compatible improvements

- Explicit `ALL`, `ANY`, and `NONE` tag filters.
- Saved filters and smart collections.
- Merge previews, undo history, and optional rename history.
- Favorite-tag ordering and keyboard shortcuts.
- A larger per-video metadata drawer for editing many assigned tags.
- Bulk remove and replace operations.
- Unused-tag, recently created, and recently renamed views.
- Virtualized tag rows if profiling shows a meaningful benefit.
- A maintained inverted index from tag ID to media IDs for fast counts and filtering.

### Optional organizational layers

These may organize flat tags without changing their canonical meaning:

- User-created tag boards or sets. A tag may appear in more than one board.
- Optional namespaces as presentation metadata rather than name parsing alone.
- User-defined presets for applying common groups of tags.

These features must remain opt-in and must allow ungrouped tags.

### Advanced archival capabilities

- Aliases and duplicate-tag consolidation.
- Optional parent implications stored as separate relationships.
- Content fingerprints so annotations survive moves and renames.
- JSON, NFO, or another documented sidecar format.
- Import conflict reports and reversible migrations.
- Provenance fields for imported versus manually assigned metadata.

Parent relationships, if introduced, should be virtual implications rather than silently duplicating tags onto every media record. Stored tags and displayed/inferred tags must remain distinguishable.

## Performance evolution

Do not couple UI components directly to a future database shape. The pure catalog-service API should remain the boundary while its implementation evolves:

1. Current phase: derive counts and rankings from in-memory records.
2. Measured growth phase: memoize derived indexes per annotation-state revision.
3. Large-archive phase: persist normalized tag assignments and inverted indexes in IndexedDB.
4. Extreme scale: virtualize long lists and move expensive reconciliation to a worker.

Changes between these phases should not require rewriting picker or management components.

## Testing expectations

The tagging system should maintain focused tests for:

- Case-insensitive uniqueness and name validation.
- Favorite and recent tag behavior.
- Non-overlapping picker sections.
- Search and ranking.
- Usage counts.
- Idempotent batch assignment.
- Import/export compatibility.
- Popup dismissal and click-through prevention.
- Large-catalog rendering limits.

Manual QA should include at least one catalog with 100 or more tags and videos with more assigned tags than a tile can display.

## Revisit triggers

Revisit this decision when one of the following is observed rather than predicted:

- Search is no longer sufficient for users to find tags reliably.
- Tag naming collisions or synonyms become a frequent support issue.
- Count or filter derivation becomes visible in performance profiles.
- Users repeatedly recreate the same tag subsets or filter expressions.
- Rename and move behavior causes unacceptable annotation loss.
- Archives require exchange with established metadata or sidecar formats.

At that point, extend the flat model through separate organizational, relationship, query, or durability layers instead of replacing it with an enforced taxonomy.
