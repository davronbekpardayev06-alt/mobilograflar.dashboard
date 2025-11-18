'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MobilographerStats {
  id: string
  name: string
  postCount: number
  storisCount: number
  syomkaCount: number
  totalPoints: number
  totalCompleted: number
  totalTarget: number
  progress: number
  projectsCount: number
}

export default function OylikPage() {
  const [stats, setStats] = useState<MobilographerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  const fetchData = async () => {
    try {
      const month = selectedMonth.getMonth()
      const year = selectedMonth.getFullYear()

      // Oyning birinchi va oxirgi kunini to'g'ri topish
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0) // Keyingi oyning 0-kuni = bu oyning oxirgi kuni

      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

      console.log('Fetching data for:', startDate, 'to', endDate)

      const { data: mobilographers, error: mobError } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      if (mobError) throw mobError

      const { data: projects, error: projError } = await supabase
        .from('projects')
        .select(`
          *,
          videos(id, editing_status, filming_status, content_type, task_type, created_at, record_id)
        `)

      if (projError) throw projError

      const { data: records, error: recError } = await supabase
        .from('records')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)

      if (recError) throw recError

      console.log('Records found:', records?.length)

      const mobilographersWithStats = mobilographers?.map(mob => {
        const mobProjects = projects?.filter(p => p.mobilographer_id === mob.id) || []
        
        // FAQAT MONTAJ POST hisoblash - KIRITISHDAN
        let totalCompleted = 0
        let totalTarget = 0

        mobProjects.forEach(project => {
          const monthVideos = project.videos?.filter((v: any) => {
            // FAQAT MONTAJ TASK_TYPE!
            if (v.task_type !== 'montaj') return false
            
            // FAQAT POST CONTENT_TYPE!
            if (v.content_type !== 'post') return false
            
            // FAQAT COMPLETED EDITING_STATUS!
            if (v.editing_status !== 'completed') return false
            
            // FAQAT KIRITISHDAN (record_id bor)!
            if (!v.record_id) return false
            
            const videoDate = new Date(v.created_at)
            return videoDate.getMonth() === month && videoDate.getFullYear() === year
          })

          totalCompleted += monthVideos?.length || 0
          totalTarget += project.monthly_target || 12
        })

        // Records statistikasi
        const mobRecords = records?.filter(r => r.mobilographer_id === mob.id) || []
        
        console.log(`${mob.name}: ${mobRecords.length} records`)
        
        const postCount = mobRecords
          .filter(r => r.type === 'editing' && r.content_type === 'post')
          .reduce((sum, r) => sum + (r.count || 1), 0)
        
        const storisCount = mobRecords
          .filter(r => r.type === 'editing' && r.content_type === 'storis')
          .reduce((sum, r) => sum + (r.count || 1), 0)
        
        const syomkaCount = mobRecords
          .filter(r => r.type === 'filming')
          .reduce((sum, r) => sum + (r.count || 1), 0)

        const totalPoints = postCount + storisCount + syomkaCount
        const progress = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0

        return {
          id: mob.id,
          name: mob.name,
          postCount,
          storisCount,
          syomkaCount,
          totalPoints,
          totalCompleted,
          totalTarget,
          progress,
          projectsCount: mobProjects.length
        }
      }).sort((a, b) => b.totalPoints - a.totalPoints)

      setStats(mobilographersWithStats || [])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const changeMonth = (direction: number) => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + direction)
    setSelectedMonth(newDate)
  }

  const getMonthName = () => {
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ]
    return `${months[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`
  }

  const getRankEmoji = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}`
  }

  const getRankColor = (index: number) => {
    if (index === 0) return 'from-yellow-400 to-yellow-600'
    if (index === 1) return 'from-gray-400 to-gray-600'
    if (index === 2) return 'from-orange-400 to-orange-600'
    return 'from-blue-400 to-blue-600'
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
    post: stats.reduce((sum, s) => sum + s.postCount, 0),
    storis: stats.reduce((sum, s) => sum + s.storisCount, 0),
    syomka: stats.reduce((sum, s) => sum + s.syomkaCount, 0),
    totalPoints: stats.reduce((sum, s) => sum + s.totalPoints, 0),
    totalCompleted: stats.reduce((sum, s) => sum + s.totalCompleted, 0),
    totalTarget: stats.reduce((sum, s) => sum + s.totalTarget, 0)
  }

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
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-bold transition transform hover:scale-105 shadow-lg"
          >
            ← Oldingi oy
          </button>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">{getMonthName()}</h2>
            <p className="text-sm text-gray-500 mt-1">Progress: Faqat MONTAJ POST</p>
          </div>
          
          <button
            onClick={() => changeMonth(1)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-bold transition transform hover:scale-105 shadow-lg"
          >
            Keyingi oy →
          </button>
        </div>
      </div>

      {/* Umumiy Statistika */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg card-hover transform transition-transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📄</span>
            <span className="text-lg opacity-90">Post Montaj</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.post}</div>
          <p className="text-sm opacity-90 mt-2">{getMonthName()}</p>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-2xl p-6 shadow-lg card-hover transform transition-transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📱</span>
            <span className="text-lg opacity-90">Storis Montaj</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.storis}</div>
          <p className="text-sm opacity-90 mt-2">{getMonthName()}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg card-hover transform transition-transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📹</span>
            <span className="text-lg opacity-90">Syomka</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.syomka}</div>
          <p className="text-sm opacity-90 mt-2">{getMonthName()}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg card-hover transform transition-transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">⭐</span>
            <span className="text-lg opacity-90">Jami Ball</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.totalPoints}</div>
          <p className="text-sm opacity-90 mt-2">{getMonthName()}</p>
        </div>
      </div>

      {/* Progress Umumiy */}
      <div className="card-modern bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <h3 className="text-xl font-bold mb-4">📊 Umumiy Progress (Faqat MONTAJ POST)</h3>
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg text-gray-700">
            📄 {totalStats.totalCompleted}/{totalStats.totalTarget} post montaj
          </span>
          <span className="text-3xl font-bold text-blue-600">
            {totalStats.totalTarget > 0 ? Math.round((totalStats.totalCompleted / totalStats.totalTarget) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-6">
          <div
            className="progress-bar h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
            style={{ 
              width: `${Math.min(totalStats.totalTarget > 0 ? (totalStats.totalCompleted / totalStats.totalTarget) * 100 : 0, 100)}%` 
            }}
          />
        </div>
      </div>

      {/* Mobilograflar Reytingi */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          🏆 Mobilograflar Reytingi
        </h2>

        {stats.length > 0 ? (
          <div className="space-y-4">
            {stats.map((mob, index) => (
              <div
                key={mob.id}
                className={`p-6 rounded-2xl bg-gradient-to-r ${getRankColor(index)} text-white shadow-lg transform transition-all hover:scale-102`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-3xl font-bold">
                      {getRankEmoji(index)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{mob.name}</h3>
                      <p className="text-sm opacity-90">{mob.projectsCount} ta loyiha</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-bold">{mob.totalPoints}</div>
                    <div className="text-sm opacity-90">jami ball</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
                    <div className="text-3xl font-bold">{mob.postCount}</div>
                    <div className="text-xs opacity-90">📄 Post</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
                    <div className="text-3xl font-bold">{mob.storisCount}</div>
                    <div className="text-xs opacity-90">📱 Storis</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
                    <div className="text-3xl font-bold">{mob.syomkaCount}</div>
                    <div className="text-xs opacity-90">📹 Syomka</div>
                  </div>
                </div>

                {/* Progress - Faqat MONTAJ POST */}
                <div className="bg-white bg-opacity-20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">
                      📊 Progress (Faqat MONTAJ POST)
                    </span>
                    <span className="text-2xl font-bold">{mob.progress}%</span>
                  </div>
                  <div className="w-full bg-white bg-opacity-30 rounded-full h-3 mb-2">
                    <div
                      className="h-3 rounded-full bg-white transition-all duration-500"
                      style={{ width: `${Math.min(mob.progress, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs opacity-90">
                    {mob.totalCompleted}/{mob.totalTarget} post montaj
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-7xl mb-4">📊</div>
            <p className="text-gray-500 text-xl font-medium mb-2">Bu oyda hozircha ma'lumot yo'q</p>
            <p className="text-gray-400 text-sm">{getMonthName()}</p>
          </div>
        )}
      </div>

      {/* Eslatma */}
      <div className="card-modern bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <span className="text-3xl">ℹ️</span>
          <div>
            <h3 className="font-bold text-lg mb-2">Eslatma:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✅ <strong>Ball hisob:</strong> Post montaj + Storis montaj + Syomka</li>
              <li>✅ <strong>Progress:</strong> Faqat MONTAJ POST (Storis va Syomka hisoblanmaydi)</li>
              <li>✅ <strong>Reyting:</strong> Jami ball bo'yicha</li>
              <li>✅ <strong>Faqat kiritish:</strong> REJA progress'ga kirmaydi</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
