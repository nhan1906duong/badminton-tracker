import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { BWF_GRADE_2_CATEGORIES } from '../lib/bwf-api'

export interface BwfTournament {
  id: string
  name: string
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
  categorySlug: string
  categoryName: string
  venue?: string | null
}

export function useBwfTournaments() {
  return useQuery({
    queryKey: ['bwf-tournaments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bwf_tournaments')
        .select('*')
        .order('start_date', { ascending: true })

      if (error) throw error

      return (data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        startDate: row.start_date as string,
        endDate: row.end_date as string,
        categorySlug: row.category_slug as string,
        categoryName: row.category_name as string,
        venue: row.venue as string | null,
      })) satisfies BwfTournament[]
    },
    staleTime: 60 * 60 * 1000,   // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  })
}

export function useNearbyBwfTournaments(dayRange = 14) {
  const { data, isLoading, refetch } = useBwfTournaments()

  const tournaments = useMemo(() => {
    if (!data) return []
    const now = new Date()
    const windowStart = new Date(now)
    windowStart.setDate(windowStart.getDate() - dayRange)
    const windowEnd = new Date(now)
    windowEnd.setDate(windowEnd.getDate() + dayRange)

    return data
      .filter((t) => {
        const start = new Date(t.startDate)
        const end = new Date(t.endDate)
        return start <= windowEnd && end >= windowStart
      })
      .sort((a, b) => {
        const pa = BWF_GRADE_2_CATEGORIES.find((c) => c.categorySlug === a.categorySlug)?.priority ?? 0
        const pb = BWF_GRADE_2_CATEGORIES.find((c) => c.categorySlug === b.categorySlug)?.priority ?? 0
        if (pb !== pa) return pb - pa
        return a.startDate.localeCompare(b.startDate)
      })
  }, [data, dayRange])

  return { tournaments, isLoading, refetch }
}
