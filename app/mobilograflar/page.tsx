'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function ProjectCard({ project, mobId, onReassign }: any) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjectStats()
  }, [])

  const fetchProjectStats = async () => {
    try {
      const currentMonth = new Date()
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999)

      const { data: videos } = await supabase
        .from('videos')
        .select('*')
        .eq('project_id', project.id)
        .gte('created_at', firstDay.toISOString())
        .lte('created_at', lastDay.toISOString())

      const syomka = videos?.filter(v => v.filming_status === 'completed').length || 0
      const montaj = videos?.filter(
        v => v.record_id !== null && 
             v.editing_status === 'completed' && 
             v.content_type === 'post' && 
             v.task_type === 'montaj'
      ).length || 0
      const pending = videos?.filter(
        v => v.editing_status === 'pending' && 
             v.content_type === 'post'
      ).length || 0

      const montajProgress = project.monthly_target > 0 ? Math.round((montaj / project.monthly_target) * 100) : 0
      const syomkaProgress = project.monthly_target > 0 ? Math.round((syomka / project.monthly_target) * 100) : 0

      setStats({ syomka, montaj, pending, montajProgress, syomkaProgress })
      setLoading(false)
    } catch (error) {
      console.error('Error fetching project stats:', error)
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'from-green-400 to-emerald-500'
    if (progress >= 70) return 'from-blue-400 to-cyan-500'
    if (progress >= 40) return 'from-yellow-400 to-orange-500'
    return 'from-red-400 to-pink-500'
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-base mb-1">{project.name}</h4>
          <p className="text-xs text-gray-500">🎯 Maqsad: {project.monthly_target} post</p>
        </div>
        <button
          onClick={() => onReassign(project.id, project.name, mobId)}
          className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border border-blue-200"
          title="Boshqa mobilografga o'tkazish"
        >
          🔄 O'tkazish
        </button>
      </div>

      {/* Stats */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎬</span>
            <div>
              <p className="font-semibold text-gray-900">Post Montaj</p>
              <p className="text-xs text-gray-600">Montaj qilingan postlar</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">{stats.montaj}<span className="text-sm text-gray-500">/{project.monthly_target}</span></p>
            <p className="text-xs text-gray-600">{stats.montajProgress}%</p>
          </div>
        </div>
        <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(stats.montajProgress, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Progress</span>
          <span className="text-sm font-bold text-gray-900">{stats.montajProgress}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${getProgressColor(stats.montajProgress)} rounded-full transition-all duration-1000 shadow-sm`}
            style={{ width: `${Math.min(stats.montajProgress, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}

export default function MobilograflarPage() {
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingMobilographer, setEditingMobilographer] = useState<any>(null)
  const [expandedMobilographer, setExpandedMobilographer] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [newMobilographer, setNewMobilographer] = useState({
    name: '',
    monthly_target: 24
  })

  useEffect(() => {
    loadAvailableYears()
  }, [])

  useEffect(() => {
    fetchData()
  }, [selectedYear, selectedMonth])

  const loadAvailableYears = async () => {
    try {
      const { data: videos } = await supabase
        .from('videos')
        .select('created_at')
        .order('created_at', { ascending: false })

      if (!videos || videos.length === 0) {
        setAvailableYears([new Date().getFullYear()])
        return
      }

      const years = new Set<number>()
      videos.forEach(video => {
        if (video.created_at) {
          const year = new Date(video.created_at).getFullYear()
          years.add(year)
        }
      })

      setAvailableYears(Array.from(years).sort((a, b) => b - a))
    } catch (error) {
      console.error('Error loading years:', error)
      setAvailableYears([new Date().getFullYear()])
    }
  }

  const fetchData = async () => {
    try {
      const { data: mobilographersData } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('name')

      const firstDay = new Date(selectedYear, selectedMonth - 1, 1)
      const lastDay = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)

      const mobilographersWithStats = await Promise.all(
        (mobilographersData || []).map(async (mob) => {
          const mobProjects = projectsData?.filter(p => p.mobilographer_id === mob.id) || []

          let totalCompleted = 0
          let totalTarget = 0
          let totalSyomka = 0
          let totalPending = 0

          for (const project of mobProjects) {
            const { data: videos } = await supabase
              .from('videos')
              .select('*')
              .eq('project_id', project.id)
              .gte('created_at', firstDay.toISOString())
              .lte('created_at', lastDay.toISOString())

            const syomka = videos?.filter(v => v.filming_status === 'completed').length || 0
            const completed = videos?.filter(
              v => v.record_id !== null && 
                   v.editing_status === 'completed' && 
                   v.content_type === 'post' && 
                   v.task_type === 'montaj'
            ).length || 0
            const pending = videos?.filter(
              v => v.editing_status === 'pending' && 
                   v.content_type === 'post'
            ).length || 0

            totalSyomka += syomka
            totalCompleted += completed
            totalPending += pending
            totalTarget += project.monthly_target || 0
          }

          const progress = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0
          const syomkaProgress = totalTarget > 0 ? Math.round((totalSyomka / totalTarget) * 100) : 0

          return {
            ...mob,
            projects: mobProjects,
            totalCompleted,
            totalTarget,
            totalSyomka,
            totalPending,
            syomkaProgress,
            progress
          }
        })
      )

      setMobilographers(mobilographersWithStats)
      setProjects(projectsData || [])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMobilographer.name) {
      alert('Ism majburiy!')
      return
    }

    try {
      await supabase
        .from('mobilographers')
        .insert([{
          name: newMobilographer.name,
          monthly_target: newMobilographer.monthly_target
        }])

      alert('✅ Mobilograf qo\'shildi!')
      setNewMobilographer({ name: '', monthly_target: 24 })
      setShowNewForm(false)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingMobilographer.name) {
      alert('Ism majburiy!')
      return
    }

    try {
      await supabase
        .from('mobilographers')
        .update({
          name: editingMobilographer.name,
          monthly_target: editingMobilographer.monthly_target
        })
        .eq('id', editingMobilographer.id)

      alert('✅ Yangilandi!')
      setEditingMobilographer(null)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" mobilografni o'chirmoqchimisiz?\n\nDIQQAT: Uning barcha loyihalari va yozuvlari ham o'chiriladi!`)) {
      return
    }

    try {
      const { data: projectsToDelete } = await supabase
        .from('projects')
        .select('id')
        .eq('mobilographer_id', id)

      if (projectsToDelete && projectsToDelete.length > 0) {
        const projectIds = projectsToDelete.map(p => p.id)

        await supabase
          .from('videos')
          .delete()
          .in('project_id', projectIds)

        await supabase
          .from('projects')
          .delete()
          .in('id', projectIds)
      }

      await supabase
        .from('records')
        .delete()
        .eq('mobilographer_id', id)

      await supabase
        .from('mobilographers')
        .delete()
        .eq('id', id)

      alert('✅ O\'chirildi!')
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
    }
  }

  const handleReassignProject = async (projectId: string, projectName: string, currentMobId: string) => {
    const otherMobilographers = mobilographers.filter(m => m.id !== currentMobId)
    
    if (otherMobilographers.length === 0) {
      alert('Boshqa mobilograf yo\'q!')
      return
    }

    const mobilographersList = otherMobilographers
      .map((m, idx) => `${idx + 1}. ${m.name}`)
      .join('\n')

    const choice = prompt(
      `"${projectName}" loyihasini qaysi mobilografga o'tkazmoqchisiz?\n\n${mobilographersList}\n\nRaqam kiriting:`
    )

    if (!choice) return

    const index = parseInt(choice) - 1
    if (index < 0 || index >= otherMobilographers.length) {
      alert('Noto\'g\'ri raqam!')
      return
    }

    const newMobilographer = otherMobilographers[index]

    if (!confirm(`"${projectName}" loyihasini ${newMobilographer.name}ga o'tkazmoqchimisiz?`)) {
      return
    }

    try {
      await supabase
        .from('projects')
        .update({ mobilographer_id: newMobilographer.id })
        .eq('id', projectId)

      alert(`✅ "${projectName}" loyihasi ${newMobilographer.name}ga o'tkazildi!`)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
    }
  }

  const getMonthName = (monthNum: number) => {
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ]
    return months[monthNum - 1]
  }

  const getStatusBadge = (progress: number) => {
    if (progress >= 100) {
      return { emoji: '🎉', label: 'Bajarildi', color: 'from-green-400 to-emerald-500', bg: 'bg-gradient-to-br from-green-50 to-emerald-50', border: 'border-green-300', text: 'text-green-700' }
    } else if (progress >= 70) {
      return { emoji: '🚀', label: 'Yaxshi', color: 'from-blue-400 to-cyan-500', bg: 'bg-gradient-to-br from-blue-50 to-cyan-50', border: 'border-blue-300', text: 'text-blue-700' }
    } else if (progress >= 40) {
      return { emoji: '⚠️', label: 'O\'rtacha', color: 'from-yellow-400 to-orange-500', bg: 'bg-gradient-to-br from-yellow-50 to-orange-50', border: 'border-yellow-300', text: 'text-yellow-700' }
    } else {
      return { emoji: '🔴', label: 'Past', color: 'from-red-400 to-pink-500', bg: 'bg-gradient-to-br from-red-50 to-pink-50', border: 'border-red-300', text: 'text-red-700' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-8 shadow-xl shadow-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">👥 Mobilograflar</h1>
            <p className="text-purple-100">
              {getMonthName(selectedMonth)} {selectedYear} • Faqat MONTAJ POST hisoblanadi
            </p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="bg-white hover:bg-purple-50 text-purple-600 px-6 py-3 rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:scale-105"
          >
            ➕ Yangi Mobilograf
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="text-xl">📅</span>
              Yil
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 text-gray-900 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all outline-none font-semibold"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year} yil</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="text-xl">📊</span>
              Oy
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-semibold"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* New Form */}
      {showNewForm && (
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl">
          <h2 className="text-xl font-bold text-gray-900 mb-6">📝 Yangi Mobilograf Qo'shish</h2>
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ism</label>
              <input
                type="text"
                value={newMobilographer.name}
                onChange={(e) => setNewMobilographer({ ...newMobilographer, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                placeholder="Masalan: Og'abek"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Oylik maqsad (jami postlar)</label>
              <input
                type="number"
                min="1"
                value={newMobilographer.monthly_target}
                onChange={(e) => setNewMobilographer({ ...newMobilographer, monthly_target: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:scale-105"
              >
                ✅ Saqlash
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Form */}
      {editingMobilographer && (
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl">
          <h2 className="text-xl font-bold text-gray-900 mb-6">✏️ Tahrirlash: {editingMobilographer.name}</h2>
          <form onSubmit={handleUpdate} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ism</label>
              <input
                type="text"
                value={editingMobilographer.name}
                onChange={(e) => setEditingMobilographer({ ...editingMobilographer, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Oylik maqsad (jami postlar)</label>
              <input
                type="number"
                min="1"
                value={editingMobilographer.monthly_target}
                onChange={(e) => setEditingMobilographer({ ...editingMobilographer, monthly_target: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:scale-105"
              >
                ✅ Saqlash
              </button>
              <button
                type="button"
                onClick={() => setEditingMobilographer(null)}
                className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobilographers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mobilographers.map((mob) => {
          const status = getStatusBadge(mob.progress)
          const isExpanded = expandedMobilographer === mob.id

          return (
            <div 
              key={mob.id} 
              className="bg-white rounded-3xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02]"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold ${status.bg} border-2 ${status.border} shadow-md`}>
                      {mob.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{mob.name}</h3>
                      <p className="text-sm text-gray-600">{mob.projects.length} ta loyiha</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingMobilographer(mob)}
                      className="text-gray-400 hover:text-gray-700 transition-colors p-2"
                      title="Tahrirlash"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(mob.id, mob.name)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-2"
                      title="O'chirish"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className={`inline-flex items-center gap-2 ${status.bg} ${status.text} px-4 py-2 rounded-xl text-sm font-semibold border-2 ${status.border}`}>
                  <span className="text-lg">{status.emoji}</span>
                  {status.label}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Umumiy Progress</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{mob.progress}%</div>
                      <div className="text-xs text-gray-500">{mob.totalCompleted}/{mob.totalTarget} post</div>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${status.color} rounded-full transition-all duration-1000 shadow-md`}
                      style={{ width: `${Math.min(mob.progress, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">🎬</div>
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">Post Montaj</p>
                        <p className="text-xs text-gray-600">Montaj qilingan postlar</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-gray-900">{mob.totalCompleted}</p>
                      <p className="text-sm text-gray-600">/ {mob.totalTarget} post</p>
                    </div>
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                    📁 Loyihalar {mob.projects.length === 0 && <span className="text-gray-400">(Yo'q)</span>}
                  </h4>

                  {mob.projects.length > 0 ? (
                    <div className="space-y-3">
                      {mob.projects.slice(0, isExpanded ? undefined : 2).map((project: any) => (
                        <ProjectCard 
                          key={project.id} 
                          project={project} 
                          mobId={mob.id}
                          onReassign={handleReassignProject}
                        />
                      ))}
                      {mob.projects.length > 2 && (
                        <button
                          onClick={() => setExpandedMobilographer(isExpanded ? null : mob.id)}
                          className="w-full text-gray-600 hover:text-gray-900 text-sm font-medium py-2 transition-colors"
                        >
                          {isExpanded ? '▲ Kamroq ko\'rish' : `▼ Yana ${mob.projects.length - 2} ta ko'rish`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm">Loyihalar yo'q</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {mobilographers.length === 0 && (
        <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border-2 border-dashed border-gray-300">
          <div className="text-7xl mb-6">👥</div>
          <p className="text-gray-700 text-xl font-semibold mb-2">Mobilograflar yo'q</p>
          <p className="text-gray-500 text-sm mb-6">
            Yangi mobilograf qo'shish uchun yuqoridagi tugmani bosing
          </p>
        </div>
      )}
    </div>
  )
}
