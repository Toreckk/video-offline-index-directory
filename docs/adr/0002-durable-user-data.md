# ADR 0002: transactional personal data with explicit migration

Status: implemented in the v0.4 candidate; installed migration validation pending.

The previous shared IndexedDB stores made desktop organization depend on a WebView origin and allowed multi-store imports/rename metadata to commit separately. Thumbnail/catalog rebuilds must not reset user-authored organization.

Use a `UserDataPort` with versioned snapshot load, compare-and-swap commit and retained recovery snapshots. Desktop owns it in SQLite, browser in one IndexedDB transaction. Retain per-store payload versions for compatible Zustand migrations, with one hydration gate and validation before store merge. SQLite commits can also include a validated native catalog for verified rename migrations. Unknown schema, corruption, stale revision and failed writes enter explicit recovery; none initialize over existing data.

Only migrate known legacy keys from the current origin, after a preview. Retain the source, migration receipt and snapshot. Separate native development and installed namespaces. A native picker reauthorizes the same root when its migrated reference lacks a trusted catalog; never silently grant an arbitrary imported root or infer identity from its display name.

Whole snapshots simplify atomicity for v0.4. They are bounded to 16 MiB of store content (native serialized envelope limit 32 MiB), with five pre-import recovery points and the migration snapshot. v0.5 must measure write amplification and consider batched/delta records; v0.8 extends portable root identity/relinking. A concurrent in-memory edit during import/rename is retained for export and blocks automatic replay rather than overwriting either result.

The [recovery contract](../DATA_RECOVERY.md), [candidate tests](../V0.4_TESTING.md), native transaction/rollback tests and shared migration/validation tests define the behavior. Browser smoke is useful evidence but does not establish installed WebView origin migration or OS-level durability across every power-loss scenario.
