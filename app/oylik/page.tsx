'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MobilographerStat {
  id: string
  name: string
  post: number
  storis: number
  syomka: number
  total: number
  target: number
  progress: number
}

export default function OylikPage() {
  const [stats, setStats] = useState<MobilographerStat[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const month = selectedMonth.getMonth() + 1 // 1-12
      const year = selectedMonth.getFullYear()

      // 1. Mobilograflar
      const { data: mobilographers } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      if (!mobilographers) {
        setLoading(false)
        return
      }

      // 2. Loyihalar
      const { data: projects } = await supabase
        .from('projects')
        .select('*')

      // 3. BARCHA videolar (filter yo'q)
      const { data: allVideos } = await supabase
        .from('videos')
        .select('*')
        .not('record_id', 'is', null)

      // 4. JavaScript'da oy bo'yicha filter
      const filteredVideos = (allVideos || []).filter(video => {
        try {
          const videoDate = new Date(video.created_at)
          const videoMonth = videoDate.getMonth() + 1
          const videoYear = videoDate.getFullYear()
          return videoMonth === month && videoYear === year
        } catch {
          return false
        }
      })

      // 5. Har bir mobilograf uchun statistika
      const mobilographersWithStats: MobilographerStat[] = mobilographers.map(mob => {
        // Bu mobilograf bajargan ishlar
        const mobVideos = filteredVideos.filter(v => v.assigned_mobilographer_id === mob.id)

        // Post montaj
        const postCount = mobVideos.filter(v => 
          v.task_type === 'montaj' && 
          v.content_type === 'post' && 
          v.editing_status === 'completed'
        ).length

        // Storis montaj
        const storisCount = mobVideos.filter(v => 
          v.task_type === 'montaj' && 
          v.content_type === 'storis' && 
          v.editing_status === 'completed'
        ).length

        // Syomka
        const syomkaCount = mobVideos.filter(v => 
          v.task_type === 'syomka' && 
          v.filming_status === 'completed'
        ).length

        // Bu mobilografning barcha loyihalarining maqsadlari
        const mobProjects = (projects || []).filter(p => p.mobilographer_id === mob.id)
        const totalTarget = mobProjects.reduce((sum, p) => sum + (p.monthly_target || 0), 0)
        
        // Progress
        const progress = totalTarget > 0 ? Math.round((postCount / totalTarget) * 100) : 0

        return {
          id: mob.id,
          name: mob.name,
          post: postCount,
          storis: storisCount,
          syomka: syomkaCount,
          total: postCount + storisCount + syomkaCount,
          target: totalTarget,
          progress
        }
      })

      // Ball bo'yicha saralash
      mobilographersWithStats.sort((a, b) => b.total - a.total)

      setStats(mobilographersWithStats)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  const changeMonth = (direction: number) => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + direction)
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
      'from-yellow-400 to-yellow-600',
      'from-gray-400 to-gray-600',
      'from-orange-400 to-orange-600',
      'from-blue-400 to-blue-600'
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

  const totalStats = {
    post: stats.reduce((sum, s) => sum + s.post, 0),
    storis: stats.reduce((sum, s) => sum + s.storis, 0),
    syomka: stats.reduce((sum, s) => sum + s.syomka, 0),
    ball: stats.reduce((sum, s) => sum + s.total, 0),
    completed: stats.reduce((sum, s) => sum + s.post, 0),
    target: stats.reduce((sum, s) => sum + s.target, 0)
  }

  const totalProgress = totalStats.target > 0 
    ? Math.round((totalStats.completed / totalStats.target) * 100) 
    : 0

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          📊 Oylik Hisobot
        </h1>
      </div>

      {/* Month Selector */}
      <div className="card-modern">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeMonth(-1)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-bold transition-all transform hover:scale-105"
          >
            ← Oldingi
          </button>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">{getMonthName()}</h2>
            <p className="text-sm text-gray-500 mt-1">Kim ish qildi - o'shaga ball!</p>
          </div>
          
          <button
            onClick={() => changeMonth(1)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-bold transition-all transform hover:scale-105"
          >
            Keyingi →
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📄</span>
            <span className="text-lg opacity-90">Post Montaj</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.post}</div>
          <div className="text-xs opacity-80 mt-1">Bajarilgan</div>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📱</span>
            <span className="text-lg opacity-90">Storis Montaj</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.storis}</div>
          <div className="text-xs opacity-80 mt-1">Bajarilgan</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📹</span>
            <span className="text-lg opacity-90">Syomka</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.syomka}</div>
          <div className="text-xs opacity-80 mt-1">Bajarilgan</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">⭐</span>
            <span className="text-lg opacity-90">Jami Ball</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.ball}</div>
          <div className="text-xs opacity-80 mt-1">Post + Storis + Syomka</div>
        </div>
      </div>

      {/* Overall Progress */}
      {totalStats.target > 0 && (
        <div className="card-modern">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            📊 Umumiy Progress (Faqat POST Montaj)
          </h3>
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg text-gray-700">
              {totalStats.completed}/{totalStats.target} post montaj
            </span>
            <span className="text-4xl font-bold text-blue-600">{totalProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
            <div
              className="h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
              style={{ width: `${Math.min(totalProgress, 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Barcha loyihalarning oylik maqsadlari qo'shilgan
          </p>
        </div>
      )}

      {/* Rankings */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          🏆 Mobilograflar Reytingi
        </h2>

        {stats.length > 0 ? (
          <div className="space-y-4">
            {stats.map((mob, index) => (
              <div
                key={mob.id}
                className={`p-6 rounded-2xl bg-gradient-to-r ${getRankColor(index)} text-white shadow-lg transform hover:scale-102 transition-all`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-3xl font-bold">
                      {getRankEmoji(index)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{mob.name}</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-bold">{mob.total}</div>
                    <div className="text-sm opacity-90">jami ball</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
                    <div className="text-3xl font-bold">{mob.post}</div>
                    <div className="text-xs opacity-90">📄 Post</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
                    <div className="text-3xl font-bold">{mob.storis}</div>
                    <div className="text-xs opacity-90">📱 Storis</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
                    <div className="text-3xl font-bold">{mob.syomka}</div>
                    <div className="text-xs opacity-90">📹 Syomka</div>
                  </div>
                </div>

                {mob.target > 0 && (
                  <div className="bg-white bg-opacity-20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">📊 Oylik Progress</span>
                      <span className="text-2xl font-bold">{mob.progress}%</span>
                    </div>
                    <div className="w-full bg-white bg-opacity-30 rounded-full h-3 mb-2 overflow-hidden">
                      <div
                        className="h-3 rounded-full bg-white transition-all duration-500"
                        style={{ width: `${Math.min(mob.progress, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs opacity-90">
                      {mob.post}/{mob.target} post montaj (loyihalar maqsadi)
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-500 text-lg">Bu oyda hozircha ma'lumot yo'q</p>
            <p className="text-sm text-gray-400 mt-2">Boshqa oyni tanlang</p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="card-modern bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <span className="text-3xl">ℹ️</span>
          <div>
            <h3 className="font-bold text-lg mb-2">Muhim ma'lumot:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✅ <strong>Kim ish qildi - o'shaga ball!</strong></li>
              <li>✅ Har bir mobilografning o'z loyihalarining maqsadlari hisoblanadi</li>
              <li>✅ Ball = Post montaj + Storis montaj + Syomka</li>
              <li>✅ Progress = Faqat post montaj (loyihalar maqsadiga nisbatan)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
