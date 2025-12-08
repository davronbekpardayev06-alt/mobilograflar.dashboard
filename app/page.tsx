'use client'

import { useState, useEffect } from 'react'
import { supabase, type Task, type Mobilographer, type Project } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [mobilographers, setMobilographers] = useState<Mobilographer[]>([])
  const [todayWorkload, setTodayWorkload] = useState<any[]>([])
  const [weeklyStats, setWeeklyStats] = useState<any[]>([])
  const [monthlyTarget, setMonthlyTarget] = useState<any>({ total: 0, completed: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchProjects(),
        fetchMobilographers(),
        fetchTodayWorkload(),
        fetchWeeklyStats()
      ])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    const { data: projectsData } = await supabase
      .from('projects')
      .select('*, mobilographers(name)')
      .order('name')

    const projectsWithProgress = await Promise.all(
      (projectsData || []).map(async (project) => {
        // ✅ UPDATED: Get completed tasks from tasks table
        const { data: completedTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', project.id)
          .eq('status', 'completed')
          .eq('task_type', 'editing')
          .eq('content_type', 'post')
          .gte('date', firstDay.toISOString().split('T')[0])
          .lte('date', lastDay.toISOString().split('T')[0])

        const completedPosts = completedTasks?.reduce((sum, task) => sum + (task.count || 1), 0) || 0

        const progress = project.monthly_target > 0 
          ? Math.round((completedPosts / project.monthly_target) * 100)
          : 0

        return {
          ...project,
          completed: completedPosts,
          progress
        }
      })
    )

    // Calculate monthly totals
    const totalTarget = projectsWithProgress.reduce((sum, p) => sum + (p.monthly_target || 0), 0)
    const totalCompleted = projectsWithProgress.reduce((sum, p) => sum + p.completed, 0)
    setMonthlyTarget({ total: totalTarget, completed: totalCompleted })

    setProjects(projectsWithProgress)
  }

  const fetchMobilographers = async () => {
    const { data } = await supabase
      .from('mobilographers')
      .select('*')
      .eq('is_active', true)
      .order('name')

    setMobilographers(data || [])
  }

  const fetchTodayWorkload = async () => {
    const today = new Date().toISOString().split('T')[0]

    // ✅ UPDATED: Get tasks instead of records
    const { data: tasks } = await supabase
      .from('tasks')
      .select(`
        *,
        mobilographers(id, name),
        projects(id, name)
      `)
      .eq('date', today)

    const workloadByMobilographer = mobilographers.map(mob => {
      const mobTasks = tasks?.filter(t => t.mobilographer_id === mob.id) || []
      
      let totalDuration = 0
      let totalPost = 0
      let totalStoris = 0
      let totalSyomka = 0
      let totalTahrirlash = 0
      
      mobTasks.forEach(task => {
        if (task.duration_minutes) {
          totalDuration += task.duration_minutes
        }
        const count = task.count || 1
        
        // Count by task type
        if (task.task_type === 'editing' || task.task_type === 'montaj') {
          if (task.content_type === 'post') totalPost += count
          else if (task.content_type === 'storis') totalStoris += count
        } else if (task.task_type === 'filming' || task.task_type === 'syomka') {
          totalSyomka += count
        } else if (task.task_type === 'tahrirlash') {
          totalTahrirlash += count
        }
      })

      const hours = totalDuration / 60
      let status = 'none'
      let statusLabel = 'Ish yo\'q'
      let statusColor = 'gray'
      let recommendation = ''

      if (hours === 0) {
        status = 'none'
        statusLabel = 'Ish yo\'q'
        statusColor = 'gray'
        recommendation = 'Yangi vazifa tayinlang'
      } else if (hours < 3) {
        status = 'light'
        statusLabel = 'Engil yuk'
        statusColor = 'green'
        recommendation = 'Qo\'shimcha vazifa berish mumkin'
      } else if (hours <= 7) {
        status = 'optimal'
        statusLabel = 'Optimal'
        statusColor = 'blue'
        recommendation = 'Yaxshi ish bajarilmoqda'
      } else if (hours <= 10) {
        status = 'heavy'
        statusLabel = 'Og\'ir yuk'
        statusColor = 'orange'
        recommendation = 'Ko\'p vazifa, nazorat qiling'
      } else {
        status = 'overloaded'
        statusLabel = 'Haddan tashqari'
        statusColor = 'red'
        recommendation = 'Vazifalarni qayta taqsimlang!'
      }

      return {
        mobilographer: mob,
        totalDuration,
        totalPost,
        totalStoris,
        totalSyomka,
        totalTahrirlash,
        hours,
        status,
        statusLabel,
        statusColor,
        recommendation,
        tasks: mobTasks
      }
    })

    setTodayWorkload(workloadByMobilographer.sort((a, b) => b.totalDuration - a.totalDuration))
  }

  const fetchWeeklyStats = async () => {
    const today = new Date()
    const stats = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      // ✅ UPDATED: Get tasks instead of records
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('date', dateStr)

      let totalDuration = 0
      let totalWorks = 0

      tasks?.forEach(task => {
        if (task.duration_minutes) {
          totalDuration += task.duration_minutes
        }
        totalWorks += task.count || 1
      })

      stats.push({
        date: dateStr,
        day: date.getDate(),
        weekday: date.toLocaleDateString('uz-UZ', { weekday: 'short' }),
        totalDuration,
        totalWorks,
        isToday: dateStr === today.toISOString().split('T')[0]
      })
    }

    setWeeklyStats(stats)
  }

  const formatDuration = (minutes: number): string => {
    if (!minutes) return '0 daqiqa'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) {
      return `${hours}s ${mins}d`
    } else if (hours > 0) {
      return `${hours} soat`
    } else {
      return `${mins} daqiqa`
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

  const todayTotalDuration = todayWorkload.reduce((sum, w) => sum + w.totalDuration, 0)
  const todayTotalWorks = todayWorkload.reduce((sum, w) => sum + w.totalPost + w.totalStoris + w.totalSyomka + w.totalTahrirlash, 0)
  const activeMobilographers = todayWorkload.filter(w => w.totalDuration > 0).length
  const monthlyProgress = monthlyTarget.total > 0 ? Math.round((monthlyTarget.completed / monthlyTarget.total) * 100) : 0

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🏠 Asosiy Sahifa
        </h1>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('uz-UZ', { weekday: 'long' })}
          </p>
          <p className="text-lg font-bold text-gray-700">
            {new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Today's Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">⏰</span>
            <div>
              <h3 className="font-bold text-lg">Jami Vaqt</h3>
              <p className="text-xs text-gray-600">Bugun</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-blue-600">
            {Math.round(todayTotalDuration / 60)}s
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {formatDuration(todayTotalDuration)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">✅</span>
            <div>
              <h3 className="font-bold text-lg">Jami Ishlar</h3>
              <p className="text-xs text-gray-600">Bugun</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-green-600">
            {todayTotalWorks}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Bajarildi
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">👥</span>
            <div>
              <h3 className="font-bold text-lg">Aktiv</h3>
              <p className="text-xs text-gray-600">Mobilograflar</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-purple-600">
            {activeMobilographers}/{mobilographers.length}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Ishlamoqda
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📁</span>
            <div>
              <h3 className="font-bold text-lg">Loyihalar</h3>
              <p className="text-xs text-gray-600">Jami</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-pink-600">
            {projects.length}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Faol loyihalar
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🎯</span>
            <div>
              <h3 className="font-bold text-lg">Oylik Maqsad</h3>
              <p className="text-xs text-gray-600">Progress</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-orange-600">
            {monthlyProgress}%
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {monthlyTarget.completed}/{monthlyTarget.total}
          </div>
        </div>
      </div>

      {/* Today's Workload */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <h2 className="text-2xl font-bold">📊 Bugungi Ish Yuki</h2>
          <p className="text-sm opacity-90 mt-1">Real-time workload monitoring</p>
        </div>

        <div className="p-6 space-y-4">
          {todayWorkload.length > 0 && todayWorkload.some(w => w.totalDuration > 0) ? (
            todayWorkload.filter(w => w.totalDuration > 0).map((workload, idx) => (
              <div key={idx} className={`border-2 rounded-xl p-4 ${
                workload.statusColor === 'gray' ? 'border-gray-200 bg-gray-50' :
                workload.statusColor === 'green' ? 'border-green-200 bg-green-50' :
                workload.statusColor === 'blue' ? 'border-blue-200 bg-blue-50' :
                workload.statusColor === 'orange' ? 'border-orange-200 bg-orange-50' :
                'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">👤</div>
                    <div>
                      <h3 className="font-bold text-lg">{workload.mobilographer.name}</h3>
                      <p className={`text-sm font-semibold ${
                        workload.statusColor === 'gray' ? 'text-gray-600' :
                        workload.statusColor === 'green' ? 'text-green-600' :
                        workload.statusColor === 'blue' ? 'text-blue-600' :
                        workload.statusColor === 'orange' ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {workload.statusLabel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-700">
                      {formatDuration(workload.totalDuration)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {workload.tasks.length} ta task
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {workload.totalPost > 0 && (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm font-semibold">
                      📄 {workload.totalPost} Post
                    </span>
                  )}
                  {workload.totalStoris > 0 && (
                    <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-lg text-sm font-semibold">
                      📱 {workload.totalStoris} Storis
                    </span>
                  )}
                  {workload.totalSyomka > 0 && (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-semibold">
                      📹 {workload.totalSyomka} Syomka
                    </span>
                  )}
                  {workload.totalTahrirlash > 0 && (
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-sm font-semibold">
                      ✏️ {workload.totalTahrirlash} Tahrirlash
                    </span>
                  )}
                </div>

                <div className={`text-sm font-semibold px-3 py-2 rounded-lg ${
                  workload.statusColor === 'green' ? 'bg-green-100 text-green-700' :
                  workload.statusColor === 'blue' ? 'bg-blue-100 text-blue-700' :
                  workload.statusColor === 'orange' ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  💡 {workload.recommendation}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-lg">Bugun hali hech kim ish kiritmagandi</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white">
          <h2 className="text-2xl font-bold">📈 Haftalik Trend</h2>
          <p className="text-sm opacity-90 mt-1">Oxirgi 7 kun</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-7 gap-4">
            {weeklyStats.map((stat, idx) => {
              const maxDuration = Math.max(...weeklyStats.map(s => s.totalDuration), 1)
              const heightPercent = (stat.totalDuration / maxDuration) * 100

              return (
                <div key={idx} className="text-center">
                  <div className={`rounded-xl p-3 mb-2 ${
                    stat.isToday ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-gray-100'
                  }`}>
                    <div className="text-xs uppercase mb-1">{stat.weekday}</div>
                    <div className="text-2xl font-bold">{stat.day}</div>
                  </div>

                  <div className="h-32 flex items-end justify-center mb-2">
                    <div 
                      className={`w-full rounded-t-lg transition-all ${
                        stat.isToday ? 'bg-gradient-to-t from-blue-500 to-purple-600' : 'bg-gradient-to-t from-gray-300 to-gray-400'
                      }`}
                      style={{ height: `${heightPercent}%`, minHeight: stat.totalDuration > 0 ? '10%' : '0%' }}
                    ></div>
                  </div>

                  <div className="text-sm font-bold text-gray-700">
                    {Math.round(stat.totalDuration / 60)}s
                  </div>
                  <div className="text-xs text-gray-500">
                    {stat.totalWorks} ish
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Projects Progress */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
          <h2 className="text-2xl font-bold">🎯 Loyihalar Progress</h2>
          <p className="text-sm opacity-90 mt-1">Shu oyning natijalari</p>
        </div>

        <div className="p-6 space-y-4">
          {projects.map((project) => (
            <div key={project.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-green-400 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{project.name}</h3>
                  <p className="text-sm text-gray-500">{project.mobilographers?.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {project.completed}/{project.monthly_target}
                  </div>
                  <div className="text-xs text-gray-500">
                    {project.progress}%
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      project.progress >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                      project.progress >= 70 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                      project.progress >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                      'bg-gradient-to-r from-red-500 to-pink-600'
                    }`}
                    style={{ width: `${Math.min(project.progress, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/kiritish" className="block">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 hover:scale-105 transition-transform cursor-pointer shadow-lg">
            <div className="text-5xl mb-3">➕</div>
            <h3 className="text-xl font-bold mb-2">Yangi Ish</h3>
            <p className="text-sm opacity-90">Ish kiritish</p>
          </div>
        </Link>

        <Link href="/timeline" className="block">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl p-6 hover:scale-105 transition-transform cursor-pointer shadow-lg">
            <div className="text-5xl mb-3">📅</div>
            <h3 className="text-xl font-bold mb-2">Timeline</h3>
            <p className="text-sm opacity-90">Haftalik jadval</p>
          </div>
        </Link>

        <Link href="/reyting" className="block">
          <div className="bg-gradient-to-br from-orange-500 to-yellow-600 text-white rounded-2xl p-6 hover:scale-105 transition-transform cursor-pointer shadow-lg">
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="text-xl font-bold mb-2">Reyting</h3>
            <p className="text-sm opacity-90">Ball tizimi</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
