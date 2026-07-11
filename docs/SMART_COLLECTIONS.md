# Smart Collections

## Product requirement

VOID must stay approachable for a casual library while allowing archivists to express precise, live slices such as:

- `Category A AND Category B`
- `Category A AND NOT Category C`
- `Category A OR Category B`
- `(1910s OR 1920s) AND silent AND NOT damaged`

A fixed AND/OR/NOT column layout cannot express these consistently. It also implies that users should populate every column, even when a collection only needs one operator.

## Plex reference and VOID decision

Plex creates a smart collection by saving the current filtered and sorted library view. Items are then added or removed automatically as they begin or cease matching that filter. See [Plex Collections](https://support.plex.tv/articles/201273953-collections/) and [Using the Library View](https://support.plex.tv/articles/200392126-using-the-library-view/).

VOID keeps that useful live-filter behavior, but uses an explicit Boolean expression tree because its tag-first archival use cases need composable logic:

- Every group selects **All rules** (`AND`) or **Any rule** (`OR`).
- A tag rule selects **Has tag** or **Does not have** (`NOT`).
- A nested group can be included or excluded, allowing `NOT (A OR B)`.
- Watched and unwatched are ordinary rules instead of a mandatory global field.
- Groups can currently nest four levels deep, preventing an accidentally pathological UI or matcher while covering realistic archival filters.

An empty collection intentionally matches all videos. This makes “all videos” a valid collection and gives the editor a predictable starting state.

The Collections navigation entry first presents only the collection catalog and creation workflow. Opening a collection switches to a dedicated viewer with its title, live count, matching video queue, rule editor, and explicit back action. This prevents a large result grid from competing with the catalog on the same screen.

## Persistence and compatibility

The persisted model stores stable rule IDs and a recursive group tree. The matcher is a pure recursive function independent of React and persistence.

Version 1 collections are migrated automatically:

- Every legacy AND tag becomes a positive rule in the root AND group.
- The legacy OR list becomes one nested OR group.
- Every legacy NOT tag becomes a negative tag rule.
- A legacy watched-state selection becomes a watched or unwatched rule.

This preserves the old collection's meaning while allowing it to be edited with the new builder.

## Viable future improvements

- Rule summaries rendered as a compact human-readable sentence on collection cards.
- Duplicate, favorite, folder, filename, duration, and future rating predicates.
- Drag-and-drop rule ordering and moving rules between groups.
- A flat casual mode that starts with one group, while retaining the same expression model underneath.
- Collection export/import as part of the unified archival metadata schema.
