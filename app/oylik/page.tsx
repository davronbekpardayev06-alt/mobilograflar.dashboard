'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function OylikPage() {
  const [monthlyData, setMonthlyData] = useState<any>({
    totalMontaj: 0,
    totalSyomka: 0,
    totalVideos: 0,
    mobilographers: [],
    projects: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const today = new Date()
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      
      const startDate = monthStart.toISOString().split('T')[0]
      const endDate = today.toISOString().split('T')[0]

      // Records
      const { data: records } = await supabase
        .from('records')
        .select('*, mobilographers(id, name), projects(id, name)')
        .gte('date', startDate)
        .lte('date', endDate)

      // Projects with videos
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          *,
          mobilographers(name),
          videos(id, editing_status)
        `)

      const montajCount = records?.filter(r => r.type === 'editing').length || 0
      const syomkaCount = records?.filter(r => r.type === 'filming').length || 0

      // Mobilograflar statistikasi
      const mobilographersMap = new Map()
      records?.forEach(record => {
        const mobId = record.mobilographers?.id
        if (!mobId) return

        if (!mobilographersMap.has(mobId)) {
          mobilographersMap.set(mobId, {
            id: mobId,
            name: record.mobilographers.name,
            montaj: 0,
            syomka: 0,
            total: 0
          })
        }

        const mob = mobilographersMap.get(mobId)
        if (record.type === 'editing') mob.montaj++
        if (record.type === 'filming') mob.syomka++
        mob.total++
      })

      // Loyihalar progress
      const projectsWithProgress = projects?.map(project => {
        const completed = project.videos?.filter((v: any) => 
          v.editing_status === 'completed'
        ).length || 0
        const target = project.monthly_target || 12
        const progress = Math.round((completed / target) * 100)

        return {
          ...project,
          completed,
          target,
          progress
        }
      }).sort((a, b) => b.progress - a.progress)

      setMonthlyData({
        totalMontaj: montajCount,
        totalSyomka: syomkaCount,
        totalVideos: records?.length || 0,
        mobilographers: Array.from(mobilographersMap.values()).sort((a, b) => b.total - a.total),
        projects: projectsWithProgress || [],
        monthName: today.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })
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
          <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          📈 Oylik Hisobot
        </h1>
        <p className="text-gray-600 mt-2">{monthlyData.monthName}</p>
      </div>

      {/* Umumiy statistika */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📊</span>
            <span className="text-lg opacity-90">Jami Video</span>
          </div>
          <div className="text-5xl font-bold">{monthlyData.totalVideos}</div>
          <p className="text-sm opacity-90 mt-2">Bu oyda</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🎬</span>
            <span className="text-lg opacity-90">Montaj</span>
          </div>
          <div className="text-5xl font-bold">{monthlyData.totalMontaj}</div>
          <p className="text-sm opacity-90 mt-2">Tugallangan</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📹</span>
            <span className="text-lg opacity-90">Syomka</span>
          </div>
          <div className="text-5xl font-bold">{monthlyData.totalSyomka}</div>
          <p className="text-sm opacity-90 mt-2">Suratga olingan</p>
        </div>
      </div>

      {/* Loyihalar progress */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-6">📁 Loyihalar Progress</h2>
        
        <div className="space-y-4">
          {monthlyData.projects.map((project: any) => (
            <div key={project.id} className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold">{project.name}</h3>
                  <p className="text-sm text-gray-600">👤 {project.mobilographers?.name}</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    project.progress >= 100 ? 'text-green-600' :
                    project.progress >= 75 ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>
                    {project.progress}%
                  </div>
                  <p className="text-xs text-gray-500">{project.completed}/{project.target}</p>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`progress-bar h-3 rounded-full ${
                    project.progress >= 100 ? 'bg-green-500' :
                    project.progress >= 75 ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(project.progress, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {monthlyData.projects.length === 0 && (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">📁</div>
            <p className="text-gray-500">Loyihalar yo'q</p>
          </div>
        )}
      </div>

      {/* Oylik reyting */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-6">🏆 Oylik Reyting</h2>
        
        <div className="space-y-4">
          {monthlyData.mobilographers.map((mob: any, index: number) => (
            <div key={mob.id} className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{mob.name}</h3>
                    <div className="flex items-center gap-3 text-sm mt-1">
                      <span className="flex items-center gap-1">
                        <span>🎬</span>
                        <span className="font-semibold">{mob.montaj}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span>📹</span>
                        <span className="font-semibold">{mob.syomka}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-orange-600">{mob.total}</div>
                  <div className="text-xs text-gray-500">jami</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {monthlyData.mobilographers.length === 0 && (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">📊</div>
            <p className="text-gray-500">Bu oyda faoliyat yo'q</p>
          </div>
        )}
      </div>
    </div>
  )
}
