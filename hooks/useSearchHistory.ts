import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { SearchHistoryItem, CardResult } from '@/lib/types'

const SEVEN_DAYS_AGO = () => {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

export function useSearchHistory(userId: string | null) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchHistory = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    const { data } = await supabase
      .from('mobile_search_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', SEVEN_DAYS_AGO())
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setHistory(data as SearchHistoryItem[])
    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const addSearch = useCallback(
    async (cardName: string, cardImage: string | null, result: CardResult): Promise<string> => {
      if (!userId) return ''
      const { data, error } = await supabase
        .from('mobile_search_history')
        .insert({
          user_id: userId,
          card_name: cardName,
          card_image: cardImage,
          result_data: result,
        })
        .select('id')
        .single()
      if (error) throw error
      await fetchHistory()
      return data.id as string
    },
    [userId, fetchHistory]
  )

  return { history, isLoading, addSearch, refetch: fetchHistory }
}
