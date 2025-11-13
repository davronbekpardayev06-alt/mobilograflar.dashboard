'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MobilographerStat {
  id: string
  name: string
  posti: number
  storiki: number
  syomka: number
  totalPoints: number
}

export default function ReytingPage() {
  const [stats, setStats] = useState<MobilographerStat[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'month'>('all')
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [filterType, selectedMonth])

  const fetchData = async () => {
    try {
      setLoading(true)

      const { data: mobilographers, error } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching mobilographers:', error)
        setLoading(false)
        return
      }

      if (!mobilographers) {
        setLoading(false)
        return
      }

      const statsPromises = mobilographers.map(async (mob) => {
        let query = supabase
          .from('work_entries')
          .select('*')
          .eq('mobilographer_id', mob.id)

        if (filterType === 'month') {
          const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
          const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)
          query = query
            .gte('date', startOfMonth.toISOString())
            .lte('date', endOfMonth.toISOString())
        }

        const { data: entries, error: entriesError } = await query

        if (entriesError) {
          console.error('Error fetching entries:', entriesError)
          return {
            id: mob.id,
            name: mob.name,
            posti: 0,
            storiki: 0,
            syomka: 0,
            totalPoints: 0
          }
        }

        const posti = entries?.filter(e => e.type === 'montaj' && e.content_type === 'post').length || 0
        const storiki = entries?.filter(e => e.type === 'montaj' && e.content_type === 'story').length || 0
        const syomka = entries?.filter(e => e.type === 'syomka').length || 0
        const totalPoints = posti + (storiki * 0.5) + syomka

        return {
          id: mob.id,
          name: mob.name,
          posti,
          storiki,
          syomka,
          totalPoints
        }
      })

      const calculatedStats = await Promise.all(statsPromises)
      const sortedStats = calculatedStats.sort((a, b) => b.totalPoints - a.totalPoints)
      setStats(sortedStats)
    } catch (error) {
      console.error('Unexpected error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMonthName = (date: Date) => {
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ]
    return months[date.getMonth()]
  }

  const getRankEmoji = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}`
  }

  const getRankColor = (index: number) => {
    if (index === 0) return 'bg-yellow-500/20 border-yellow-500'
    if (index === 1) return 'bg-gray-400/20 border-gray-400'
    if (index === 2) return 'bg-orange-600/20 border-orange-600'
    return 'bg-gray-800 border-gray-700'
  }

  const changeMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Yuklanmoqda...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">📊 Reyting</h1>

      <div className="mb-6 flex gap-4 items-center justify-center">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-lg ${
            filterType === 'all' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          Umumiy
        </button>
        <button
          onClick={() => setFilterType('month')}
          className={`px-4 py-2 rounded-lg ${
            filterType === 'month' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          Oylik
        </button>
      </div>

      {filterType === 'month' && (
        <div className="mb-6 flex items-center justify-center gap-4">
          <button
            onClick={() => changeMonth('prev')}
            className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700"
          >
            ←
          </button>
          <span className="text-xl font-semibold">
            {getMonthName(selectedMonth)} {selectedMonth.getFullYear()}
          </span>
          <button
            onClick={() => changeMonth('next')}
            className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700"
          >
            →
          </button>
        </div>
      )}

      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div
            key={stat.id}
            className={`p-4 rounded-lg border-2 ${getRankColor(index)} transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold w-12 text-center">
                  {getRankEmoji(index)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{stat.name}</h3>
                  <div className="flex gap-4 text-sm text-gray-400 mt-1">
                    <span>📱 Posti: {stat.posti}</span>
                    <span>📖 Storiki: {stat.storiki}</span>
                    <span>🎥 Syomka: {stat.syomka}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-400">
                  {stat.totalPoints.toFixed(1)}
                </div>
                <div className="text-sm text-gray-400">ball</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {stats.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          Hozircha ma'lumot yo'q
        </div>
      )}
    </div>
  )
}
