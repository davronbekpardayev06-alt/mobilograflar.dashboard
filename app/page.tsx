'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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
  
  // YANGI FILTER STATE
  const [filterType, setFilterType] = useState<'today' | 'yesterday' | 'month'>('month')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [availableYears, setAvailableYears] = useState<number[]>([])

  useEffect(() => {
    loadAvailableYears()
  }, [])

  useEffect(() => {
    fetchData()
  }, [filterType, selectedYear, selectedMonth])

  const loadAvailableYears = async () => {
    try {
      const { data: records } = await supabase
        .from('records')
        .select('date')
        .order('date', { ascending: false })

      if (!records || records.length === 0) {
        setAvailableYears([new Date().getFullYear()])
        return
      }

      const years = new Set<number>()
      records.forEach(record => {
        if (record.date) {
          const year = new Date(record.date).getFullYear()
          years.add(year)
        }
      })

      setAvailableYears(Array.from(years).sort((a, b) => b - a))
    } catch (error) {
      console.error('Error loading years:', error)
      setAvailableYears([new Date().getFullYear()])
    }
  }

  const getMonthName = (monthNum: number) => {
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ]
    return months[monthNum - 1]
  }

  const getFilterLabel = () => {
    if (filterType === 'today') return 'Bugun'
    if (filterType === 'yesterday') return 'Kecha'
    return `${getMonthName(selectedMonth)} ${selectedYear}`
  }

  const fetchData = async () => {
    try {
      // DATE RANGE ni hisoblash
      const today = new Date()
      let startDate: Date
      let endDate: Date

      if (filterType === 'today') {
        startDate = new Date(today)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(today)
        endDate.setHours(23, 59, 59, 999)
      } else if (filterType === 'yesterday') {
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(today)
        endDate.setDate(today.getDate() - 1)
        endDate.setHours(23, 59, 59, 999)
      } else {
        startDate = new Date(selectedYear, selectedMonth - 1, 1)
        endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)
      }

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // TANLANGAN DAVR uchun RECORDS
      const { data: periodRecords } = await supabase
        .from('records')
        .select('*, mobilographers(id, name)')
        .gte('date', startDateStr)
        .lte('date', endDateStr)

      // Tanlangan davrdagi FAOL MOBILOGRAFLAR
      const activeMobilographers = new Set(
        periodRecords?.map(r => r.mobilographer_id) || []
      )

      // Tanlangan davrdagi FAOL LOYIHALAR
      const activeProjects = new Set(
        periodRecords?.map(r => r.project_id) || []
      )

      // Tanlangan davrdagi VIDEOLAR soni
      const totalVideos = periodRecords?.reduce((sum, record) => {
        return sum + (record.count || 1)
      }, 0) || 0

      // Bugungi ish (har doim bugungi)
      const todayStr = new Date().toISOString().split('T')[0]
      const { data: todayRecords } = await supabase
        .from('records')
        .select('*')
        .eq('date', todayStr)

      // OXIRGI 5 FAOLIYAT (tanlangan davrdan)
      const { data: recentRecords } = await supabase
        .from('records')
        .select(`
          *,
          mobilographers(name),
          projects(name)
        `)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('created_at', { ascending: false })
        .limit(5)

      // LOYIHALAR HOLATI (tanlangan oy uchun)
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          *,
          mobilographers(name),
          videos (
            id,
            editing_status,
            filming_status,
            content_type,
            task_type,
            deadline,
            created_at,
            record_id
          )
        `)

      const projectsWithStatus = projects?.map(project => {
        // Tanlangan oyning videolarini hisoblash
        const monthVideos = project.videos?.filter((v: any) => {
          if (v.task_type !== 'montaj') return false
          if (v.content_type !== 'post') return false
          if (v.editing_status !== 'completed') return false
          if (!v.record_id) return false
          
          const videoDate = new Date(v.created_at)
          return videoDate.getMonth() === selectedMonth - 1 && 
                 videoDate.getFullYear() === selectedYear
        })
        
        const completed = monthVideos?.length || 0
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
        mobilographers: activeMobilographers.size,
        projects: activeProjects.size,
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
      {/* YANGI FILTER SECTION */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100">
        <h2 className="text-xl font-bold mb-4">📊 Davr Tanlash</h2>
        
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setFilterType('today')}
            className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
              filterType === 'today'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📅 Bugun
          </button>

          <button
            onClick={() => setFilterType('yesterday')}
            className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
              filterType === 'yesterday'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📅 Kecha
          </button>

          <button
            onClick={() => setFilterType('month')}
            className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
              filterType === 'month'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Oy bo'yicha
          </button>
        </div>

        {filterType === 'month' && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                📆 Yil
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-semibold"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year} yil</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                📅 Oy
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none font-semibold"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                  <option key={month} value={month}>{getMonthName(month)}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <p className="text-sm text-gray-600 font-medium">Ko'rsatilgan davr:</p>
              <p className="text-xl font-bold text-gray-800">{getFilterLabel()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistika kartochkalari */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">👥</span>
            <span className="text-lg opacity-90">Mobilograflar</span>
          </div>
          <div className="text-5xl font-bold">{stats.mobilographers}</div>
          <div className="text-xs opacity-80 mt-2">{getFilterLabel()}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🎬</span>
            <span className="text-lg opacity-90">Loyihalar</span>
          </div>
          <div className="text-5xl font-bold">{stats.projects}</div>
          <div className="text-xs opacity-80 mt-2">{getFilterLabel()}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🎥</span>
            <span className="text-lg opacity-90">Jami Ishlar</span>
          </div>
          <div className="text-5xl font-bold">{stats.totalVideos}</div>
          <div className="text-xs opacity-80 mt-2">{getFilterLabel()}</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">⏰</span>
            <span className="text-lg opacity-90">Bugun</span>
          </div>
          <div className="text-5xl font-bold">{stats.todayWork}</div>
          <div className="text-xs opacity-80 mt-2">Har doim bugungi</div>
        </div>
      </div>

      {/* Kim Nima Qilyapti */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          👀 Faoliyat ({getFilterLabel()})
        </h2>
        
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 hover:shadow-md transition">
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
                      {new Date(activity.created_at).toLocaleDateString('uz-UZ', { 
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
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
            <p className="text-gray-500">{getFilterLabel()} uchun faoliyat yo'q</p>
          </div>
        )}
      </div>

      {/* Loyihalar Holati */}
      <div className="card-modern">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            📊 Loyihalar ({getFilterLabel()})
          </h2>
          <Link href="/loyihalar">
            <button className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2 transition">
              Barchasini ko'rish →
            </button>
          </Link>
        </div>
        
        {projectsStatus.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectsStatus.slice(0, 6).map((project) => {
              const deadlineInfo = getDeadlineInfo(project.nearestDeadline)
              
              return (
                <div
                  key={project.id}
                  className={`card-modern border-2 ${deadlineInfo?.borderColor || 'border-gray-200'} ${deadlineInfo?.bgColor || ''} hover:shadow-lg transition`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
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
                      📄 {project.completed}/{project.target} post
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
            <p className="text-gray-500 mb-4">Loyihalar yo'q</p>
            <Link href="/loyihalar/yangi">
              <button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition">
                ➕ Loyiha Yaratish
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Tezkor Havolalar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/kiritish">
          <div className="card-modern hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-3xl">
                ➕
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Ish Kiritish</h3>
                <p className="text-sm text-gray-600">Yangi ish qo'shish</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/timeline">
          <div className="card-modern hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl">
                📅
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Timeline</h3>
                <p className="text-sm text-gray-600">Haftalik reja</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/oylik">
          <div className="card-modern hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center text-3xl">
                📊
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Oylik Hisobot</h3>
                <p className="text-sm text-gray-600">Reyting va statistika</p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
