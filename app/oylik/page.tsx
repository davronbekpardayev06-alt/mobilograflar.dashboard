'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ProjectProgress {
  id: string
  name: string
  mobilographer: string
  target: number
  completed: number
  progress: number
  remainingDays: number
  status: 'ahead' | 'on-track' | 'behind'
}

export default function OylikPage() {
  const [projects, setProjects] = useState<ProjectProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [totalStats, setTotalStats] = useState({
    totalTarget: 0,
    totalCompleted: 0,
    totalProgress: 0
  })

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [selectedMonth])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const month = selectedMonth.getMonth() + 1
      const year = selectedMonth.getFullYear()

      console.log('📅 Tanlangan oy:', month, '/', year)

      // Loyihalar va mobilograflar
      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          *,
          mobilographers (
            name
          )
        `)
        .order('name')

      if (!projectsData) {
        setLoading(false)
        return
      }

      // Barcha videolar (bu oy)
      const { data: allVideos } = await supabase
        .from('videos')
        .select('*')
        .not('record_id', 'is', null)

      console.log('📹 Jami videolar:', allVideos?.length)

      // Oy bo'yicha filter
      const filteredVideos = (allVideos || []).filter(video => {
        try {
          if (!video.record_date) return false
          const videoDate = new Date(video.record_date)
          return videoDate.getMonth() + 1 === month && videoDate.getFullYear() === year
        } catch {
          return false
        }
      })

      console.log(`📹 Bu oydagi videolar: ${filteredVideos.length}`)

      // Qolgan kunlar
      const today = new Date()
      const lastDayOfMonth = new Date(year, month, 0)
      const remainingDays = Math.max(0, Math.ceil((lastDayOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

      // Har bir loyiha uchun progress
      const projectsWithProgress: ProjectProgress[] = projectsData.map(project => {
        // Bu loyihaning bu oydagi completed post montaj videolari
        const completed = filteredVideos.filter(v => 
          v.project_id === project.id &&
          v.task_type === 'montaj' &&
          v.content_type === 'post' &&
          v.editing_status === 'completed'
        ).length

        const target = project.monthly_target || 0
        const progress = target > 0 ? Math.round((completed / target) * 100) : 0

        // Status
        let status: 'ahead' | 'on-track' | 'behind' = 'on-track'
        if (remainingDays > 0) {
          const daysInMonth = new Date(year, month, 0).getDate()
          const daysPassed = daysInMonth - remainingDays
          const expectedProgress = (daysPassed / daysInMonth) * 100
          
          if (progress > expectedProgress + 10) {
            status = 'ahead'
          } else if (progress < expectedProgress - 10) {
            status = 'behind'
          }
        }

        console.log(`📊 ${project.name}: Completed=${completed}, Target=${target}, Progress=${progress}%`)

        return {
          id: project.id,
          name: project.name,
          mobilographer: project.mobilographers?.name || 'Tayinlanmagan',
          target,
          completed,
          progress,
          remainingDays,
          status
        }
      })

      // Sort by progress (highest first)
      projectsWithProgress.sort((a, b) => b.progress - a.progress)

      // Umumiy statistika
      const totalTarget = projectsWithProgress.reduce((sum, p) => sum + p.target, 0)
      const totalCompleted = projectsWithProgress.reduce((sum, p) => sum + p.completed, 0)
      const totalProgress = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0

      setProjects(projectsWithProgress)
      setTotalStats({ totalTarget, totalCompleted, totalProgress })
      setLoading(false)
    } catch (error) {
      console.error('❌ XATO:', error)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead': return 'from-green-500 to-green-600'
      case 'on-track': return 'from-blue-500 to-blue-600'
      case 'behind': return 'from-red-500 to-red-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'ahead': return '🚀'
      case 'on-track': return '✅'
      case 'behind': return '⚠️'
      default: return '📊'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ahead': return 'Oldinda'
      case 'on-track': return 'Rejalashtirilgan'
      case 'behind': return 'Orqada'
      default: return 'Normal'
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          📊 Oylik Loyihalar
        </h1>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all transform hover:scale-105"
        >
          🔄 Yangilash
        </button>
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
            <p className="text-sm text-gray-500 mt-1">Loyihalar holati va progressi</p>
          </div>
          
          <button
            onClick={() => changeMonth(1)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-bold transition-all transform hover:scale-105"
          >
            Keyingi →
          </button>
        </div>
      </div>

      {/* Umumiy Progress */}
      <div className="card-modern bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
          📊 Umumiy Progress
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">{totalStats.totalCompleted}</div>
            <div className="text-sm text-gray-600">Bajarilgan</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600">{totalStats.totalTarget}</div>
            <div className="text-sm text-gray-600">Maqsad</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600">{totalStats.totalProgress}%</div>
            <div className="text-sm text-gray-600">Progress</div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
          <div
            className="h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 transition-all duration-500 flex items-center justify-center text-white font-bold"
            style={{ width: `${Math.min(totalStats.totalProgress, 100)}%` }}
          >
            {totalStats.totalProgress > 10 && `${totalStats.totalProgress}%`}
          </div>
        </div>
      </div>

      {/* Loyihalar */}
      <div className="space-y-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`card-modern bg-gradient-to-r ${getStatusColor(project.status)} text-white p-6 transform hover:scale-102 transition-all`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">{getStatusEmoji(project.status)}</span>
                  <h3 className="text-2xl font-bold">{project.name}</h3>
                </div>
                <p className="text-sm opacity-90">
                  👤 Mas&#39;ul: <strong>{project.mobilographer}</strong>
                </p>
                <p className="text-xs opacity-80 mt-1">
                  {getStatusText(project.status)} • {project.remainingDays} kun qoldi
                </p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold">{project.progress}%</div>
                <div className="text-sm opacity-90">{project.completed}/{project.target}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white bg-opacity-30 rounded-full h-4 overflow-hidden mb-3">
              <div
                className="h-4 rounded-full bg-white transition-all duration-500"
                style={{ width: `${Math.min(project.progress, 100)}%` }}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
                <div className="text-xl font-bold">{project.completed}</div>
                <div className="text-xs opacity-90">Bajarilgan</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
                <div className="text-xl font-bold">{project.target - project.completed}</div>
                <div className="text-xs opacity-90">Qolgan</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
                <div className="text-xl font-bold">{project.target}</div>
                <div className="text-xs opacity-90">Maqsad</div>
              </div>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="card-modern text-center py-12 bg-gray-50">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-500 text-lg">Loyihalar topilmadi</p>
            <p className="text-sm text-gray-400 mt-2">Loyihalar qo&#39;shing yoki boshqa oy tanlang</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="card-modern bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <span className="text-3xl">ℹ️</span>
          <div>
            <h3 className="font-bold text-lg mb-2">Muhim ma&#39;lumot:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>🚀 <strong>Oldinda:</strong> Rejalashtirilgandan 10% ko&#39;proq</li>
              <li>✅ <strong>Rejalashtirilgan:</strong> Normal progress</li>
              <li>⚠️ <strong>Orqada:</strong> Rejalashtirilgandan 10% kam</li>
              <li>📊 <strong>Progress:</strong> Faqat POST montaj hisoblanadi</li>
              <li>🔄 <strong>Avtomatik yangilanish:</strong> Har 10 soniyada</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Commit:**
```
Refactor oylik - show projects progress instead of mobilographers
