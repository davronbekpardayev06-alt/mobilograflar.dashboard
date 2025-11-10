'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [stats, setStats] = useState({
    mobilographers: 0,
    projects: 0,
    totalVideos: 0,
    todayWork: 0
  })
  const [loading, setLoading] = useState(true)
  const [overallProgress, setOverallProgress] = useState({ 
    completed: 0, 
    target: 0, 
    percentage: 0 
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: mobilographers } = await supabase
        .from('mobilographers')
        .select('*')

      const { data: projects } = await supabase
        .from('projects')
        .select(`
          *,
          videos (
            id,
            editing_status
          )
        `)

      const today = new Date().toISOString().split('T')[0]
      
      const { data: todayRecords } = await supabase
        .from('records')
        .select('*')
        .eq('date', today)

      const totalVideos = projects?.reduce((sum, p) => sum + (p.videos?.length || 0), 0) || 0

      let totalCompleted = 0
      let totalTarget = 0
      
      projects?.forEach(project => {
        const completed = project.videos?.filter((v: any) => 
          v.editing_status === 'completed'
        ).length || 0
        const target = project.monthly_target || 12
        totalCompleted += completed
        totalTarget += target
      })

      const percentage = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0

      setStats({
        mobilographers: mobilographers?.length || 0,
        projects: projects?.length || 0,
        totalVideos,
        todayWork: todayRecords?.length || 0
      })

      setOverallProgress({
        completed: totalCompleted,
        target: totalTarget,
        percentage
      })

      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Statistika kartochkalari */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">👥</span>
            <span className="text-lg opacity-90">Mobilograflar</span>
          </div>
          <div className="text-5xl font-bold">{stats.mobilographers}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🎬</span>
            <span className="text-lg opacity-90">Loyihalar</span>
          </div>
          <div className="text-5xl font-bold">{stats.projects}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🎥</span>
            <span className="text-lg opacity-90">Jami Videolar</span>
          </div>
          <div className="text-5xl font-bold">{stats.totalVideos}</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">⏰</span>
            <span className="text-lg opacity-90">Bugun</span>
          </div>
          <div className="text-5xl font-bold">{stats.todayWork}</div>
        </div>
      </div>

      {/* Umumiy Progress Bar */}
      <div className="card-modern border-2 border-yellow-200">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          🎯 Oylik Umumiy Progress
        </h2>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">
              {overallProgress.completed} / {overallProgress.target} video
            </span>
            <span className={`text-4xl font-bold ${
              overallProgress.percentage >= 100 ? 'text-green-600' :
              overallProgress.percentage >= 75 ? 'text-yellow-600' :
              'text-blue-600'
            }`}>
              {overallProgress.percentage}%
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
            <div 
              className={`progress-bar h-8 rounded-full flex items-center justify-end pr-3 ${
                overallProgress.percentage >= 100 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                overallProgress.percentage >= 75 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                'bg-gradient-to-r from-blue-500 to-blue-600'
              }`}
              style={{ width: `${Math.min(overallProgress.percentage, 100)}%` }}
            >
              {overallProgress.percentage > 10 && (
                <span className="text-white text-sm font-bold">
                  {overallProgress.percentage}%
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600">
            {overallProgress.percentage >= 100 ? (
              <span className="text-green-600 font-semibold text-lg">
                ✅ Ajoyib! Barcha maqsadlar bajarildi! 🎉
              </span>
            ) : overallProgress.percentage >= 75 ? (
              <span className="text-yellow-600 font-semibold">
                🔥 Yaxshi ketmoqda! Yana {overallProgress.target - overallProgress.completed} video qoldi
              </span>
            ) : (
              <span className="text-blue-600 font-semibold">
                💪 Kuch! Yana {overallProgress.target - overallProgress.completed} video qoldi
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Kim nima qilyapti */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-4">👀 Kim Nima Qilyapti? (Bugun)</h2>
        <p className="text-gray-500">Bugun faoliyat yo'q</p>
      </div>
    </div>
  )
}
