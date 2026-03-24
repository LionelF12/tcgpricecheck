import type { CardResult, CollectionItem } from './types'

// In-memory stores for admin bypass (no real UUID, can't use Supabase DB)
const resultStore = new Map<string, CardResult>()
const collectionStore: CollectionItem[] = []

export const resultCache = {
  set: (id: string, result: CardResult) => resultStore.set(id, result),
  get: (id: string): CardResult | undefined => resultStore.get(id),
}

export const collectionCache = {
  getAll: (): CollectionItem[] => [...collectionStore],
  add: (item: CollectionItem) => collectionStore.unshift(item),
  remove: (id: string) => {
    const idx = collectionStore.findIndex((i) => i.id === id)
    if (idx !== -1) collectionStore.splice(idx, 1)
  },
}
