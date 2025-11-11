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
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [projectsStatus, setProjectsStatus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
          mobilographers(name),
          videos (
            id,
            editing_status,
            content_type,
            deadline,
            created_at,
            record_id
          )
        `)

      const today = new Date().toISOString().split('T')[0]
      
      const { data: todayRecords } = await supabase
        .from('records')
        .select('*')
        .eq('date', today)

      const { data: recentRecords } = await supabase
        .from('records')
        .select(`
          *,
          mobilographers(name),
          projects(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      const totalVideos = projects?.reduce((sum, p) => sum + (p.videos?.length || 0), 0) || 0

      const projectsWithStatus = projects?.map(project => {
        // FAQAT SHU OYNING POST'LARINI HISOBLASH - FAQAT KIRITISHDAN!
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        
        const thisMonthVideos = project.videos?.filter((v: any) => {
          // FAQAT KIRITISHDAN YARATILGAN POST'LAR!
          if (v.editing_status !== 'completed') return false
          if (v.content_type !== 'post') return false  // FAQAT POST!
          if (!v.record_id) return false  // FAQAT KIRITISHDAN!
          
          const videoDate = new Date(v.created_at)
          return videoDate.getMonth() === currentMonth && videoDate.getFullYear() === currentYear
        })
        
        const completed = thisMonthVideos?.length || 0
        const target = project.monthly_target || 12
        const progress = Math.round((completed / target) * 100)
        
        const nearestDeadline = project.videos
          ?.filter((v: any) => v.deadline && v.editing_status !== 'completed')
          .sort((a: any, b: any) => 
            new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          )[0]

        return {
          ...project,
          completed,
          target,
          progress,
          nearestDeadline: nearestDeadline?.deadline
        }
      }).sort((a, b) => {
        if (a.nearestDeadline && !b.nearestDeadline) return -1
        if (!a.nearestDeadline && b.nearestDeadline) return 1
        if (a.nearestDeadline && b.nearestDeadline) {
          return new Date(a.nearestDeadline).getTime() - new Date(b.nearestDeadline).getTime()
        }
        return b.progress - a.progress
      })

      setStats({
        mobilographers: mobilographers?.length || 0,
        projects: projects?.length || 0,
        totalVideos,
        todayWork: todayRecords?.length || 0
      })

      setRecentActivity(recentRecords || [])
      setProjectsStatus(projectsWithStatus || [])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const getDeadlineInfo = (deadline: string | null) => {
    if (!deadline) return null
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(deadline)
    deadlineDate.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} kun kechikdi`, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-400' }
    }
    if (diffDays === 0) {
      return { text: 'Bugun!', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-400' }
    }
    if (diffDays <= 3) {
      return { text: `${diffDays} kun qoldi`, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-400' }
    }
    if (diffDays <= 7) {
      return { text: `${diffDays} kun qoldi`, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-400' }
    }
    return { text: `${diffDays} kun qoldi`, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-400' }
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

      {/* Kim Nima Qilyapti */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          👀 Kim Nima Qilyapti? (Oxirgi Faoliyat)
        </h2>
        
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">
                    {activity.type === 'editing' 
                      ? activity.content_type === 'post' ? '📄' : '📱'
                      : '📹'}
                  </span>
                  <div>
                    <p className="font-bold text-lg">{activity.mobilographers?.name}</p>
                    <p className="text-sm text-gray-600">{activity.projects?.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(activity.created_at).toLocaleDateString('uz-UZ')} • 
                      {new Date(activity.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-4 py-2 rounded-lg font-bold text-sm ${
                    activity.type === 'editing' 
                      ? activity.content_type === 'post'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-pink-100 text-pink-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {activity.type === 'editing' 
                      ? activity.content_type === 'post' ? '📄 POST' : '📱 STORIS'
                      : '📹 SYOMKA'}
                  </span>
                  {activity.count && activity.count > 1 && (
                    <p className="text-2xl font-bold text-gray-700 mt-2">{activity.count}x</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <div className="text-5xl mb-3">😴</div>
            <p className="text-gray-500">Hozircha faoliyat yo'q</p>
          </div>
        )}
      </div>

      {/* Loyihalar Holati */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          📊 Loyihalar Holati (Shu Oylik Progress - Faqat POST)
        </h2>
        
        {projectsStatus.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectsStatus.map((project) => {
              const deadlineInfo = getDeadlineInfo(project.nearestDeadline)
              
              return (
                <div
                  key={project.id}
                  className={`card-modern border-2 ${deadlineInfo?.borderColor || 'border-gray-200'} ${deadlineInfo?.bgColor || ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{project.name}</h3>
                      <p className="text-sm text-gray-600">👤 {project.mobilographers?.name}</p>
                    </div>
                    <span className={`text-2xl font-bold ${
                      project.progress >= 100 ? 'text-green-600' :
                      project.progress >= 75 ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {project.progress}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                    <div
                      className={`progress-bar h-3 rounded-full ${
                        project.progress >= 100 ? 'bg-green-500' :
                        project.progress >= 75 ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(project.progress, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      📄 {project.completed}/{project.target} post (shu oy)
                    </span>
                    {deadlineInfo && (
                      <span className={`font-bold ${deadlineInfo.color}`}>
                        ⏰ {deadlineInfo.text}
                      </span>
                    )}
                  </div>

                  {project.progress >= 100 && (
                    <div className="mt-3 bg-green-100 text-green-700 px-3 py-2 rounded-lg text-center font-bold text-sm">
                      ✅ Bajarildi!
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <div className="text-5xl mb-3">📁</div>
            <p className="text-gray-500">Loyihalar yo'q</p>
          </div>
        )}
      </div>
    </div>
  )
}
