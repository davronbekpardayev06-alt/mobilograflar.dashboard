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
      const daysInMonth = new Date(year, month, 0).getDate()
      const today = new Date()
      const currentDay = today.getDate()
      const currentMonth = today.getMonth() + 1
      const currentYear = today.getFullYear()

      let remainingDays = 0
      if (month === currentMonth && year === currentYear) {
        remainingDays = daysInMonth - currentDay
      }

      const startOfMonth = new Date(year, month - 1, 1)
      const endOfMonth = new Date(year, month, 0, 23, 59, 59)

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('name')

      if (projectsError) {
        console.error('Error fetching projects:', projectsError)
        setLoading(false)
        return
      }

      if (!projectsData) {
        setLoading(false)
        return
      }

      const progressPromises = projectsData.map(async (project) => {
        const { data: assignments, error: assignmentsError } = await supabase
          .from('project_assignments')
          .select('mobilographer_id')
          .eq('project_id', project.id)

        if (assignmentsError) {
          console.error('Error fetching assignments:', assignmentsError)
        }

        const mobilographerIds = assignments?.map(a => a.mobilographer_id) || []

        let mobilographerNames: string[] = []
        if (mobilographerIds.length > 0) {
          const { data: mobilographers, error: mobError } = await supabase
            .from('mobilographers')
            .select('name')
            .in('id', mobilographerIds)

          if (mobError) {
            console.error('Error fetching mobilographers:', mobError)
          } else {
            mobilographerNames = mobilographers?.map(m => m.name) || []
          }
        }

        const { data: workEntries, error: entriesError } = await supabase
          .from('work_entries')
          .select('*')
          .eq('project_id', project.id)
          .eq('type', 'montaj')
          .eq('content_type', 'post')
          .gte('date', startOfMonth.toISOString())
          .lte('date', endOfMonth.toISOString())

        if (entriesError) {
          console.error('Error fetching work entries:', entriesError)
        }

        const completed = workEntries?.length || 0
        const progress = project.monthly_target > 0 
          ? Math.round((completed / project.monthly_target) * 100) 
          : 0

        let status: 'ahead' | 'on-track' | 'behind' = 'on-track'
        if (month === currentMonth && year === currentYear) {
          const expectedProgress = (currentDay / daysInMonth) * project.monthly_target
          if (completed > expectedProgress * 1.1) {
            status = 'ahead'
          } else if (completed < expectedProgress * 0.8) {
            status = 'behind'
          }
        }

        return {
          id: project.id,
          name: project.name,
          mobilographer: mobilographerNames.join(', ') || 'Tayinlanmagan',
          target: project.monthly_target,
          completed,
          progress,
          remainingDays,
          status
        }
      })

      const calculatedProjects = await Promise.all(progressPromises)
      setProjects(calculatedProjects)

      const totalTarget = calculatedProjects.reduce((sum, p) => sum + p.target, 0)
      const totalCompleted = calculatedProjects.reduce((sum, p) => sum + p.completed, 0)
      const totalProgress = totalTarget > 0 
        ? Math.round((totalCompleted / totalTarget) * 100) 
        : 0

      setTotalStats({
        totalTarget,
        totalCompleted,
        totalProgress
      })
    } catch (error) {
      console.error('Unexpected error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMonthName = (date: Date) => {
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ]
    return months[date.getMonth()]
  }

  const changeMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const getStatusColor = (status: string) => {
    if (status === 'ahead') return 'bg-green-500/20 border-green-500'
    if (status === 'behind') return 'bg-red-500/20 border-red-500'
    return 'bg-blue-500/20 border-blue-500'
  }

  const getStatusEmoji = (status: string) => {
    if (status === 'ahead') return '🚀'
    if (status === 'behind') return '⚠️'
    return '✅'
  }

  const getStatusText = (status: string) => {
    if (status === 'ahead') return 'Oldindan'
    if (status === 'behind') return 'Orqada'
    return "O'z vaqtida"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Yuklanmoqda...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 text-center">📅 Oylik Maqsadlar</h1>

      <div className="mb-6 flex items-center justify-center gap-4">
        <button
          onClick={() => changeMonth('prev')}
          className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          ←
        </button>
        <span className="text-2xl font-semibold">
          {getMonthName(selectedMonth)} {selectedMonth.getFullYear()}
        </span>
        <button
          onClick={() => changeMonth('next')}
          className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          →
        </button>
      </div>

      <div className="mb-6 p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border-2 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Umumiy Progress</h2>
            <div className="flex gap-6 text-lg">
              <span>🎯 Maqsad: <strong>{totalStats.totalTarget}</strong></span>
              <span>✅ Bajarildi: <strong>{totalStats.totalCompleted}</strong></span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold text-blue-400">
              {totalStats.totalProgress}%
            </div>
          </div>
        </div>
        <div className="mt-4 bg-gray-800 rounded-full h-4 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
            style={{ width: `${Math.min(totalStats.totalProgress, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`p-5 rounded-lg border-2 ${getStatusColor(project.status)} transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {getStatusEmoji(project.status)} {project.name}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  👤 {project.mobilographer}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                project.status === 'ahead' 
                  ? 'bg-green-500/30 text-green-400' 
                  : project.status === 'behind'
                  ? 'bg-red-500/30 text-red-400'
                  : 'bg-blue-500/30 text-blue-400'
              }`}>
                {getStatusText(project.status)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>🎯 Maqsad:</span>
                <span className="font-semibold">{project.target}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>✅ Bajarildi:</span>
                <span className="font-semibold text-green-400">{project.completed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>📊 Progress:</span>
                <span className="font-semibold text-blue-400">{project.progress}%</span>
              </div>
              {project.remainingDays > 0 && (
                <div className="flex justify-between text-sm">
                  <span>⏰ Qolgan kunlar:</span>
                  <span className="font-semibold text-orange-400">{project.remainingDays}</span>
                </div>
              )}
            </div>

            <div className="mt-4 bg-gray-800 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  project.status === 'ahead' 
                    ? 'bg-green-500' 
                    : project.status === 'behind'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(project.progress, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          Hozircha proyekt yo'q
        </div>
      )}
    </div>
  )
}
