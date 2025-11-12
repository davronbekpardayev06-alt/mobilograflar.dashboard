'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function OylikPage() {
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  const fetchData = async () => {
    try {
      setLoading(true)
      const month = selectedMonth.getMonth()
      const year = selectedMonth.getFullYear()

      // 1. Barcha mobilograflarni olish
      const { data: mobilographers } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      // 2. Barcha videolarni olish (SHU OY)
      const { data: allVideos } = await supabase
        .from('videos')
        .select('*')
        .not('record_id', 'is', null) // Faqat kiritilgan ishlar
        .gte('created_at', `${year}-${String(month + 1).padStart(2, '0')}-01`)
        .lte('created_at', `${year}-${String(month + 1).padStart(2, '0')}-31`)

      console.log('📹 BARCHA VIDEOLAR:', allVideos?.length)

      // 3. Har bir mobilograf uchun statistika
      const mobilographersWithStats = mobilographers?.map(mob => {
        // SHU MOBILOGRAF ISHTIROK ETGAN VIDEOLAR
        const mobVideos = allVideos?.filter((v: any) => 
          v.assigned_mobilographer_id === mob.id
        ) || []

        console.log(`👤 ${mob.name} - ${mobVideos.length} ta video`)

        // POST MONTAJ
        const postVideos = mobVideos.filter((v: any) => 
          v.task_type === 'montaj' && 
          v.content_type === 'post' && 
          v.editing_status === 'completed'
        )
        
        // STORIS MONTAJ
        const storisVideos = mobVideos.filter((v: any) => 
          v.task_type === 'montaj' && 
          v.content_type === 'storis' && 
          v.editing_status === 'completed'
        )
        
        // SYOMKA
        const syomkaVideos = mobVideos.filter((v: any) => 
          v.task_type === 'syomka' && 
          v.filming_status === 'completed'
        )

        const postCount = postVideos.length
        const storisCount = storisVideos.length
        const syomkaCount = syomkaVideos.length
        const totalPoints = postCount + storisCount + syomkaCount

        console.log(`${mob.name}: Post=${postCount}, Storis=${storisCount}, Syomka=${syomkaCount}, Total=${totalPoints}`)

        // LOYIHALAR SONI
        const projectIds = new Set(mobVideos.map((v: any) => v.project_id).filter(Boolean))
        const projectsCount = projectIds.size

        // PROGRESS - default 12 ta
        const totalTarget = postCount > 0 ? 12 : 0
        const progress = totalTarget > 0 ? Math.round((postCount / totalTarget) * 100) : 0

        return {
          id: mob.id,
          name: mob.name,
          postCount,
          storisCount,
          syomkaCount,
          totalPoints,
          totalCompleted: postCount,
          totalTarget,
          progress,
          projectsCount
        }
      }).sort((a, b) => b.totalPoints - a.totalPoints)

      console.log('📊 FINAL STATS:', mobilographersWithStats)

      setStats(mobilographersWithStats || [])
      setLoading(false)
    } catch (error) {
      console.error('❌ Error:', error)
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
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
        >
          🔄 Yangilash
        </button>
      </div>

      {/* Month Selector */}
      <div className="card-modern">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeMonth(-1)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-bold transition transform hover:scale-105"
          >
            ← Oldingi oy
          </button>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">{getMonthName()}</h2>
            <p className="text-sm text-gray-500 mt-1">✅ Kim ish qildi - o'shaga ball!</p>
          </div>
          
          <button
            onClick={() => changeMonth(1)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-bold transition transform hover:scale-105"
          >
            Keyingi oy →
          </button>
        </div>
      </div>

      {/* Umumiy Statistika */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📄</span>
            <span className="text-lg opacity-90">Post Montaj</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.post}</div>
          <div className="text-xs opacity-80 mt-1">assigned_mobilographer_id</div>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📱</span>
            <span className="text-lg opacity-90">Storis Montaj</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.storis}</div>
          <div className="text-xs opacity-80 mt-1">assigned_mobilographer_id</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📹</span>
            <span className="text-lg opacity-90">Syomka</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.syomka}</div>
          <div className="text-xs opacity-80 mt-1">assigned_mobilographer_id</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">⭐</span>
            <span className="text-lg opacity-90">Jami Ball</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.totalPoints}</div>
          <div className="text-xs opacity-80 mt-1">Post + Storis + Syomka</div>
        </div>
      </div>

      {/* Mobilograflar Reytingi */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          🏆 Mobilograflar Reytingi (Ball bo'yicha)
        </h2>

        {stats.length > 0 ? (
          <div className="space-y-4">
            {stats.map((mob, index) => (
              <div
                key={mob.id}
                className={`p-6 rounded-2xl bg-gradient-to-r ${getRankColor(index)} text-white shadow-lg`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-3xl font-bold">
                      {getRankEmoji(index)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{mob.name}</h3>
                      <p className="text-sm opacity-90">{mob.projectsCount} ta loyihada ishtirok</p>
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

                {/* Progress */}
                {mob.totalTarget > 0 && (
                  <div className="bg-white bg-opacity-20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">
                        📊 Progress (Faqat POST)
                      </span>
                      <span className="text-2xl font-bold">{mob.progress}%</span>
                    </div>
                    <div className="w-full bg-white bg-opacity-30 rounded-full h-3 mb-2">
                      <div
                        className="h-3 rounded-full bg-white"
                        style={{ width: `${Math.min(mob.progress, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs opacity-90">
                      {mob.totalCompleted}/{mob.totalTarget} post
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
          </div>
        )}
      </div>

      {/* Eslatma */}
      <div className="card-modern bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <span className="text-3xl">ℹ️</span>
          <div>
            <h3 className="font-bold text-lg mb-2">Muhim ma'lumot:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✅ <strong>KIM ISH QILDI - O'SHAGA BALL!</strong></li>
              <li>✅ Dadaxonbekning loyihasida Firdavs ish qilsa → Ball Firdavs'ga</li>
              <li>✅ Console'da loglarni ko'ring (F12 → Console)</li>
              <li>✅ "🔄 Yangilash" tugmasini bosing agar tuzatish kerak bo'lsa</li>
              <li>✅ Browser Console: `📹 BARCHA VIDEOLAR`, `👤 Ismi - N ta video`</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
