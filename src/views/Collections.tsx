import { useMemo, useState } from 'react'
import { ArrowLeft, FolderHeart, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCollectionStore } from '../features/collections/store/collectionStore'
import { createEmptyCollectionRules, type SmartCollectionRules } from '../features/collections/model/collectionTypes'
import { CollectionRuleEditor } from '../features/collections/components/CollectionRuleEditor'
import { selectTags } from '../features/annotations/services/tagCatalog'
import { useAnnotationStore } from '../features/annotations/store/annotationStore'
import { useMediaStore } from '../features/explorer/store/mediaStore'
import { usePlaybackStore } from '../features/playback/store/playbackStore'
import { matchesCollectionRules } from '../features/collections/services/collectionMatcher'
import { MediaTile } from '../features/explorer/components/MediaTile'
import { usePlayerStore } from '../features/player/store/playerStore'

export default function Collections() {
  const collectionsById = useCollectionStore((state) => state.collectionsById)
  const orderedCollectionIds = useCollectionStore((state) => state.orderedCollectionIds)
  const createCollection = useCollectionStore((state) => state.createCollection)
  const updateCollection = useCollectionStore((state) => state.updateCollection)
  const deleteCollection = useCollectionStore((state) => state.deleteCollection)
  const tagsById = useAnnotationStore((state) => state.tagsById)
  const orderedTagIds = useAnnotationStore((state) => state.orderedTagIds)
  const annotations = useAnnotationStore((state) => state.annotationsByMediaId)
  const playback = usePlaybackStore((state) => state.recordsByMediaId)
  const assetsById = useMediaStore((state) => state.assetsById)
  const orderedIds = useMediaStore((state) => state.orderedIds)
  const openPlayer = usePlayerStore((state) => state.openPlayer)
  const tags = useMemo(() => selectTags(tagsById, orderedTagIds), [orderedTagIds, tagsById])
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [rules, setRules] = useState<SmartCollectionRules>(() => createEmptyCollectionRules())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const selected = selectedId ? collectionsById[selectedId] : undefined
  const matchingAssets = useMemo(() => selected ? orderedIds.flatMap((id) => {
    const asset = assetsById[id]
    return asset && matchesCollectionRules(annotations[id], playback[id], selected.rules) ? [asset] : []
  }) : [], [annotations, assetsById, orderedIds, playback, selected])

  const resetEditor = () => { setName(''); setRules(createEmptyCollectionRules()); setIsEditing(false); setEditingId(null); setError(null) }
  const beginCreate = () => { resetEditor(); setIsEditing(true) }
  const beginEdit = (id: string) => {
    const collection = collectionsById[id]
    if (!collection) return
    setName(collection.name)
    setRules(structuredClone(collection.rules))
    setEditingId(id)
    setIsEditing(true)
    setError(null)
  }
  const save = () => {
    try {
      if (editingId) {
        updateCollection(editingId, name, rules)
        setSelectedId(editingId)
        resetEditor()
      } else {
        const collection = createCollection(name, rules)
        resetEditor()
        setSelectedId(collection.id)
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save collection.')
    }
  }
  const backToCollections = () => { resetEditor(); setSelectedId(null) }

  if (selected) {
    const queueIds = matchingAssets.map((asset) => asset.id)
    return <div className="min-h-screen w-full bg-surface-dim px-8 py-10">
      <header className="border-b border-white/7 pb-7">
        <button type="button" onClick={backToCollections} className="flex items-center gap-2 text-sm font-black text-on-secondary hover:text-white"><ArrowLeft size={17} />Back to collections</button>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-primary-fixed-dim">Smart collection</p><h2 className="mt-3 text-4xl font-black">{selected.name}</h2><p className="mt-3 text-on-secondary">{matchingAssets.length} live {matchingAssets.length === 1 ? 'match' : 'matches'}</p></div>
          <button type="button" onClick={() => isEditing ? resetEditor() : beginEdit(selected.id)} className="flex items-center gap-2 border border-white/10 px-4 py-2.5 text-sm font-black">{isEditing ? <X size={16} /> : <Pencil size={16} />}{isEditing ? 'Close editor' : 'Edit rules'}</button>
        </div>
      </header>
      {isEditing && <CollectionEditor name={name} rules={rules} tags={tags} error={error} isUpdate onNameChange={(value) => { setName(value); setError(null) }} onRulesChange={setRules} onSave={save} />}
      <section className="mt-7">
        {matchingAssets.length === 0 ? <div className="border border-dashed border-white/10 py-20 text-center text-on-secondary">No videos currently match this collection.</div> : <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-px">{matchingAssets.map((asset, index) => <MediaTile key={asset.id} asset={asset} priorityIndex={index} onOpen={() => openPlayer(asset.id, queueIds)} />)}</div>}
      </section>
    </div>
  }

  return <div className="min-h-screen w-full bg-surface-dim px-8 py-10">
    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/7 pb-7"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-primary-fixed-dim">Smart organization</p><h2 className="mt-3 text-4xl font-black">Collections</h2><p className="mt-3 text-on-secondary">Create and browse live filters. Open a collection to view its videos.</p></div><button type="button" onClick={beginCreate} className="flex items-center gap-2 bg-primary px-5 py-3 text-sm font-black"><Plus size={17} />Create collection</button></header>
    {isEditing && <CollectionEditor name={name} rules={rules} tags={tags} error={error} onNameChange={(value) => { setName(value); setError(null) }} onRulesChange={setRules} onSave={save} onClose={resetEditor} />}
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {orderedCollectionIds.map((id) => {
        const collection = collectionsById[id]
        if (!collection) return null
        const count = orderedIds.filter((mediaId) => matchesCollectionRules(annotations[mediaId], playback[mediaId], collection.rules)).length
        return <article key={id} className="group relative min-h-40 border border-white/8 bg-surface-container hover:border-white/20"><button type="button" onClick={() => setSelectedId(id)} className="h-full min-h-40 w-full p-5 text-left"><FolderHeart size={27} className="text-primary-fixed-dim" /><h3 className="mt-5 truncate pr-7 text-xl font-black">{collection.name}</h3><p className="mt-2 text-sm text-on-secondary">{count} matching {count === 1 ? 'video' : 'videos'}</p></button><button type="button" onClick={() => deleteCollection(id)} className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label={`Delete ${collection.name}`}><Trash2 size={16} /></button></article>
      })}
      <button type="button" onClick={beginCreate} className="flex min-h-40 flex-col items-center justify-center border border-dashed border-white/15 bg-surface-container/40 text-on-secondary hover:border-primary/50 hover:text-white"><Plus size={28} /><span className="mt-3 text-sm font-black">Create new collection</span></button>
    </div>
    {orderedCollectionIds.length === 0 && !isEditing && <div className="mt-5 text-center text-sm text-on-secondary">No collections yet. Use the + tile or create button to save your first rule set.</div>}
  </div>
}

function CollectionEditor({ name, rules, tags, error, isUpdate = false, onNameChange, onRulesChange, onSave, onClose }: {
  name: string
  rules: SmartCollectionRules
  tags: ReturnType<typeof selectTags>
  error: string | null
  isUpdate?: boolean
  onNameChange: (name: string) => void
  onRulesChange: (rules: SmartCollectionRules) => void
  onSave: () => void
  onClose?: () => void
}) {
  return <section className="mt-7 border border-primary/30 bg-surface-container p-5"><div className="flex items-center justify-between"><h3 className="text-xl font-black">{isUpdate ? 'Edit smart collection' : 'New smart collection'}</h3>{onClose && <button type="button" onClick={onClose} aria-label="Close collection editor"><X /></button>}</div><input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Collection name" maxLength={64} className="mt-5 h-12 w-full border border-white/10 bg-surface-dim px-4 outline-none focus:border-primary/60" /><div className="mt-5"><CollectionRuleEditor tags={tags} value={rules} onChange={onRulesChange} /></div>{error && <p className="mt-4 text-sm text-red-200">{error}</p>}<button type="button" onClick={onSave} disabled={!name.trim()} className="mt-5 bg-primary px-5 py-3 text-sm font-black disabled:opacity-40">{isUpdate ? 'Update collection' : 'Save collection'}</button></section>
}
