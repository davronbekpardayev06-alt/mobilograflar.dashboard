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
      const month = selectedMonth.getMonth()
      const year = selectedMonth.getFullYear()

      const { data: mobilographers } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      // BARCHA VIDEOLARNI OLISH - assigned_mobilographer_id bilan
      const { data: allVideos } = await supabase
        .from('videos')
        .select(`
          *,
          projects(id, name, monthly_target, mobilographer_id)
        `)

      const mobilographersWithStats = mobilographers?.map(mob => {
        // SHU MOBILOGRAFNING SHU OYDAGI BARCHA VIDEOLARI
        const mobVideos = allVideos?.filter((v: any) => {
          // FAQAT KIM ISH QILGAN - ASSIGNED_MOBILOGRAPHER_ID!
          if (v.assigned_mobilographer_id !== mob.id) return false
          
          // FAQAT KIRITISHDAN (record_id bor)
          if (!v.record_id) return false
          
          // FAQAT SHU OY
          const videoDate = new Date(v.created_at)
          return videoDate.getMonth() === month && videoDate.getFullYear() === year
        }) || []

        // POST MONTAJ (videos'dan) - PROGRESS UCHUN
        const postCount = mobVideos.filter((v: any) => 
          v.task_type === 'montaj' && 
          v.content_type === 'post' && 
          v.editing_status === 'completed'
        ).length
        
        // STORIS MONTAJ (videos'dan) - BALL UCHUN
        const storisCount = mobVideos.filter((v: any) => 
          v.task_type === 'montaj' && 
          v.content_type === 'storis' && 
          v.editing_status === 'completed'
        ).length
        
        // SYOMKA (videos'dan) - BALL UCHUN
        const syomkaCount = mobVideos.filter((v: any) => 
          v.task_type === 'syomka' && 
          v.filming_status === 'completed'
        ).length

        // JAMI BALL
        const totalPoints = postCount + storisCount + syomkaCount

        // PROGRESS HISOBLASH - SHU MOBILOGRAFNING LOYIHALARIDAGI MAQSADLAR
        const { data: mobProjects } = supabase
          .from('projects')
          .select('monthly_target')
          .eq('mobilographer_id', mob.id)
        
        // Hozircha barcha loyihalar bir xil maqsad deb hisoblaymiz
        // Kelajakda har bir loyiha alohida bo'lishi mumkin
        const totalTarget = postCount > 0 ? 12 : 0 // Agar ish qilgan bo'lsa, default maqsad
        const progress = totalTarget > 0 ? Math.round((postCount / totalTarget) * 100) : 0

        // LOYIHALAR SONI - SHU MOBILOGRAF ISHTIROK ETGAN
        const uniqueProjects = new Set(mobVideos.map((v: any) => v.projects?.id).filter(Boolean))
        const projectsCount = uniqueProjects.size

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
            <p className="text-sm text-gray-500 mt-1">Ball: Kim ish qildi - o'shaga! | Progress: Faqat MONTAJ POST</p>
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
          <div className="text-xs opacity-80 mt-1">Kim ish qildi - o'shaga!</div>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📱</span>
            <span className="text-lg opacity-90">Storis Montaj</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.storis}</div>
          <div className="text-xs opacity-80 mt-1">Kim ish qildi - o'shaga!</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📹</span>
            <span className="text-lg opacity-90">Syomka</span>
          </div>
          <div className="text-5xl font-bold">{totalStats.syomka}</div>
          <div className="text-xs opacity-80 mt-1">Kim ish qildi - o'shaga!</div>
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
                      <p className="text-sm opacity-90">{mob.projectsCount} ta loyihada ishtirok etdi</p>
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
                      className="h-3 rounded-full bg-white"
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
            <h3 className="font-bold text-lg mb-2">Eslatma:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✅ <strong>Kim ish qildi - o'shaga ball!</strong> (assigned_mobilographer_id)</li>
              <li>✅ <strong>Dadaxonbekning loyihasida Firdavs ish qilsa:</strong> Ball Firdavs'ga ketadi!</li>
              <li>✅ <strong>Ball hisob:</strong> Post + Storis + Syomka</li>
              <li>✅ <strong>Progress:</strong> Faqat MONTAJ POST</li>
              <li>✅ <strong>Reyting:</strong> Jami ball bo'yicha</li>
              <li>✅ <strong>Loyihalar soni:</strong> Qaysi loyihalarda ishtirok etgan</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
