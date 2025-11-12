'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MobilographerStat {
  id: string
  name: string
  post: number
  storis: number
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

      const { data: mobilographers } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      if (!mobilographers) {
        setLoading(false)
        return
      }

      const { data: allVideos } = await supabase
        .from('videos')
        .select('*')
        .not('record_id', 'is', null)

      console.log('📹 JAMI VIDEOLAR:', allVideos?.length)
      if (allVideos && allVideos.length > 0) {
        console.log('📹 BIRINCHI VIDEO:', allVideos[0])
      }

      // FILTER - record_date yoki created_at
      let videos = allVideos || []
      if (filterType === 'month') {
        const month = selectedMonth.getMonth() + 1
        const year = selectedMonth.getFullYear()
        videos = videos.filter(v => {
          try {
            let dateStr = v.record_date || v.created_at
            if (!dateStr) return false
            
            const d = new Date(dateStr)
            return d.getMonth() + 1 === month && d.getFullYear() === year
          } catch {
            return false
          }
        })
      }

      console.log('📹 FILTERLANGAN VIDEOLAR:', videos.length)

      const mobilographersWithStats: MobilographerStat[] = mobilographers.map(mob => {
        const mobVids = videos.filter(v => v.assigned_mobilographer_id === mob.id)
        
        const post = mobVids.filter(v => 
          v.task_type === 'montaj' && 
          v.content_type === 'post' && 
          v.editing_status === 'completed'
        ).length
        
        const storis = mobVids.filter(v => 
          v.task_type === 'montaj' && 
          v.content_type === 'storis' && 
          v.editing_status === 'completed'
        ).length
        
        const syomka = mobVids.filter(v => 
          v.task_type === 'syomka' && 
          v.filming_status === 'completed'
        ).length

        console.log(`👤 ${mob.name}: Post=${post}, Storis=${storis}, Syomka=${syomka}, Total=${post + storis + syomka}`)

        return {
          id: mob.id,
          name: mob.name,
          post,
          storis,
          syomka,
          totalPoints: post + storis + syomka
        }
      })

      mobilographersWithStats.sort((a, b) => b.totalPoints - a.totalPoints)

      setStats(mobilographersWithStats)
      setLoading(false)
    } catch (error) {
      console.error('❌ XATO:', error)
      setLoading(false)
    }
  }

  const changeMonth = (dir: number) => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + dir)
    setSelectedMonth(newDate)
  }

  const getMonthName = () => {
    return selectedMonth.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })
  }

  const getRankEmoji = (index: number) => {
    const emojis = ['🥇', '🥈', '🥉']
    return emojis[index] || `${index + 1}`
  }

  const getRankColor = (index: number) => {
    const colors = [
      'bg-gradient-to-br from-yellow-400 to-yellow-600',
      'bg-gradient-to-br from-gray-400 to-gray-600',
      'bg-gradient-to-br from-orange-400 to-orange-600',
      'bg-gradient-to-br from-blue-400 to-blue-600'
    ]
    return colors[index] || colors[3]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          🏆 Reyting Jadvali
        </h1>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all transform hover:scale-105"
        >
          🔄 Yangilash
        </button>
      </div>

      <div className="card-modern">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setFilterType('all')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              filterType === 'all'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📊 Barcha Vaqt
          </button>
          <button
            onClick={() => setFilterType('month')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              filterType === 'month'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📅 Oylik
          </button>
        </div>

        {filterType === 'month' && (
          <div className="flex items-center justify-between pt-4 border-t-2">
            <button onClick={() => changeMonth(-1)} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold">
              ← Oldingi
            </button>
            <h3 className="text-2xl font-bold">{getMonthName()}</h3>
            <button onClick={() => changeMonth(1)} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold">
              Keyingi →
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {stats.map((mob, index) => (
          <div key={mob.id} className={`card-modern ${getRankColor(index)} text-white p-6`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-3xl font-bold">
                  {getRankEmoji(index)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">{mob.name}</h3>
                  <div className="flex gap-4 text-sm">
                    <span className="bg-white bg-opacity-20 px-3 py-1 rounded-lg">📄 Post: {mob.post}</span>
                    <span className="bg-white bg-opacity-20 px-3 py-1 rounded-lg">📱 Storis: {mob.storis}</span>
                    <span className="bg-white bg-opacity-20 px-3 py-1 rounded-lg">📹 Syomka: {mob.syomka}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-6xl font-bold">{mob.totalPoints}</div>
                <div className="text-sm opacity-90">jami ball</div>
              </div>
            </div>
          </div>
        ))}

        {stats.length === 0 && (
          <div className="card-modern text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-gray-500 text-lg">Hozircha ma'lumot yo'q</p>
          </div>
        )}
      </div>
    </div>
  )
}
