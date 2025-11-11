'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoyihalarPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select(`
          *,
          mobilographers(name),
          videos(id, editing_status, content_type, deadline, created_at, record_id)
        `)
        .order('name')

      const projectsWithProgress = data?.map(project => {
        // FAQAT SHU OYNING POST'LARINI HISOBLASH - FAQAT KIRITISHDAN!
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        
        const thisMonthVideos = project.videos?.filter((v: any) => {
          // FAQAT KIRITISHDAN YARATILGAN VA POST BO'LGAN VIDEOLAR!
          if (v.editing_status !== 'completed') return false
          if (v.content_type !== 'post') return false
          if (!v.record_id) return false  // MUHIM! Faqat kiritishdan yaratilgan
          
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

      setProjects(projectsWithProgress || [])
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

  const handleDelete = async (id: string) => {
    if (!confirm('Bu loyihani o\'chirmoqchimisiz?')) return

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('✅ Loyiha o\'chirildi!')
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
    }
  }

  const getCurrentMonthName = () => {
    const now = new Date()
    return now.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            📁 Loyihalar
          </h1>
          <p className="text-sm text-gray-500 mt-1">📅 {getCurrentMonthName()} - Oylik Progress</p>
        </div>
        <Link href="/loyihalar/yangi">
          <button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition transform hover:scale-105">
            ➕ Yangi Loyiha
          </button>
        </Link>
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => {
            const deadlineInfo = getDeadlineInfo(project.nearestDeadline)
            
            return (
              <div
                key={project.id}
                className={`card-modern border-2 ${deadlineInfo?.borderColor || 'border-gray-200'} ${deadlineInfo?.bgColor || ''} hover:shadow-xl transition-all`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{project.name}</h3>
                    <p className="text-sm text-gray-600">👤 {project.mobilographers?.name}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-red-500 hover:text-red-700 text-2xl transition"
                  >
                    🗑️
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      📄 {project.completed}/{project.target} post (shu oy)
                    </span>
                    <span className={`text-2xl font-bold ${
                      project.progress >= 100 ? 'text-green-600' :
                      project.progress >= 75 ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {project.progress}%
                    </span>
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

                  {deadlineInfo && (
                    <div className={`text-sm font-semibold ${deadlineInfo.color}`}>
                      ⏰ {deadlineInfo.text}
                    </div>
                  )}

                  {project.progress >= 100 && (
                    <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-center font-bold text-sm">
                      ✅ Shu oylik maqsad bajarildi!
                    </div>
                  )}

                  {project.progress < 100 && (
                    <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-center text-sm">
                      📊 Yana {project.target - project.completed} ta post kerak
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400 mt-3 pt-3 border-t">
                  🎯 Oylik maqsad: {project.target} post
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="text-6xl mb-4">📁</div>
          <p className="text-gray-500 text-lg mb-4">Hozircha loyihalar yo'q</p>
          <Link href="/loyihalar/yangi">
            <button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold">
              ➕ Birinchi Loyiha Yaratish
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}
