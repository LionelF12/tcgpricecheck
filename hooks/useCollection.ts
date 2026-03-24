import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { CollectionItem, CardMetadata, SourcePrices } from '@/lib/types'

export function useCollection(userId: string | null) {
  const [collection, setCollection] = useState<CollectionItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCollection = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    const { data } = await supabase
      .from('mobile_collection')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })
    if (data) setCollection(data as CollectionItem[])
    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    fetchCollection()
  }, [fetchCollection])

  const saveCard = useCallback(
    async (
      cardName: string,
      cardImage: string | null,
      metadata: CardMetadata,
      priceSnapshot: SourcePrices[] | null
    ): Promise<void> => {
      if (!userId) throw new Error('Not authenticated')
      const { error } = await supabase.from('mobile_collection').insert({
        user_id: userId,
        card_name: cardName,
        card_image: cardImage,
        metadata,
        price_snapshot: priceSnapshot,
      })
      if (error) throw error
      await fetchCollection()
    },
    [userId, fetchCollection]
  )

  const removeCard = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('mobile_collection')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
      if (error) throw error
      await fetchCollection()
    },
    [userId, fetchCollection]
  )

  return { collection, isLoading, saveCard, removeCard, refetch: fetchCollection }
}
