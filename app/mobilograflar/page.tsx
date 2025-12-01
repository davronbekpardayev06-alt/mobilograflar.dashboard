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
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
          <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'from-green-500 to-emerald-400'
    if (progress >= 70) return 'from-blue-500 to-cyan-400'
    if (progress >= 40) return 'from-yellow-500 to-orange-400'
    return 'from-red-500 to-pink-400'
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="font-semibold text-white text-base mb-1">{project.name}</h4>
          <p className="text-xs text-gray-400">🎯 Maqsad: {project.monthly_target} post</p>
        </div>
        <button
          onClick={() => onReassign(project.id, project.name, mobId)}
          className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 backdrop-blur-sm border border-blue-500/20"
          title="Boshqa mobilografga o'tkazish"
        >
          🔄 O'tkazish
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Syomka */}
        <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-3 border border-blue-500/20">
          <div className="text-2xl mb-1">📹</div>
          <div className="text-lg font-bold text-white">{stats.syomka}<span className="text-sm text-gray-400">/{project.monthly_target}</span></div>
          <div className="text-xs text-gray-400">Syomka</div>
        </div>

        {/* Montaj */}
        <div className="bg-purple-500/10 backdrop-blur-sm rounded-xl p-3 border border-purple-500/20">
          <div className="text-2xl mb-1">🎬</div>
          <div className="text-lg font-bold text-white">{stats.montaj}<span className="text-sm text-gray-400">/{project.monthly_target}</span></div>
          <div className="text-xs text-gray-400">Montaj</div>
        </div>

        {/* Pending */}
        <div className="bg-yellow-500/10 backdrop-blur-sm rounded-xl p-3 border border-yellow-500/20">
          <div className="text-2xl mb-1">⏳</div>
          <div className="text-lg font-bold text-white">{stats.pending}</div>
          <div className="text-xs text-gray-400">Kutish</div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Progress</span>
          <span className="text-sm font-bold text-white">{stats.montajProgress}%</span>
        </div>
        <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className={`h-full bg-gradient-to-r ${getProgressColor(stats.montajProgress)} rounded-full transition-all duration-1000 shadow-lg`}
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
  const [newMobilographer, setNewMobilographer] = useState({
    name: '',
    monthly_target: 24
  })

  useEffect(() => {
    fetchData()
  }, [])

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

      const currentMonth = new Date()
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999)

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

  const getStatusBadge = (progress: number) => {
    if (progress >= 100) {
      return { emoji: '🎉', label: 'Bajarildi', color: 'from-green-500 to-emerald-400', bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' }
    } else if (progress >= 70) {
      return { emoji: '🚀', label: 'Yaxshi', color: 'from-blue-500 to-cyan-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' }
    } else if (progress >= 40) {
      return { emoji: '⚠️', label: 'O\'rtacha', color: 'from-yellow-500 to-orange-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' }
    } else {
      return { emoji: '🔴', label: 'Past', color: 'from-red-500 to-pink-400', bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-gray-400">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">👥 Mobilograflar</h1>
            <p className="text-gray-400">
              Faqat MONTAJ POST hisoblanadi
            </p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105"
          >
            ➕ Yangi Mobilograf
          </button>
        </div>
      </div>

      {/* New Form */}
      {showNewForm && (
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6">📝 Yangi Mobilograf Qo'shish</h2>
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Ism</label>
              <input
                type="text"
                value={newMobilographer.name}
                onChange={(e) => setNewMobilographer({ ...newMobilographer, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none backdrop-blur-sm"
                placeholder="Masalan: Og'abek"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Oylik maqsad (jami postlar)</label>
              <input
                type="number"
                min="1"
                value={newMobilographer.monthly_target}
                onChange={(e) => setNewMobilographer({ ...newMobilographer, monthly_target: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none backdrop-blur-sm"
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
                className="px-6 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 py-3 rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Form */}
      {editingMobilographer && (
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6">✏️ Tahrirlash: {editingMobilographer.name}</h2>
          <form onSubmit={handleUpdate} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Ism</label>
              <input
                type="text"
                value={editingMobilographer.name}
                onChange={(e) => setEditingMobilographer({ ...editingMobilographer, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none backdrop-blur-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Oylik maqsad (jami postlar)</label>
              <input
                type="number"
                min="1"
                value={editingMobilographer.monthly_target}
                onChange={(e) => setEditingMobilographer({ ...editingMobilographer, monthly_target: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none backdrop-blur-sm"
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
                className="px-6 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 py-3 rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm"
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
              className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 overflow-hidden hover:border-gray-600/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:scale-[1.02]"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl p-6 border-b border-gray-700/50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold ${status.bg} backdrop-blur-sm border ${status.border} shadow-lg`}>
                      {mob.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{mob.name}</h3>
                      <p className="text-sm text-gray-400">{mob.projects.length} ta loyiha</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingMobilographer(mob)}
                      className="text-gray-400 hover:text-white transition-colors p-2"
                      title="Tahrirlash"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(mob.id, mob.name)}
                      className="text-gray-400 hover:text-red-400 transition-colors p-2"
                      title="O'chirish"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className={`inline-flex items-center gap-2 ${status.bg} ${status.text} px-4 py-2 rounded-xl text-sm font-semibold border ${status.border} backdrop-blur-sm`}>
                  <span className="text-lg">{status.emoji}</span>
                  {status.label}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">Umumiy Progress</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{mob.progress}%</div>
                      <div className="text-xs text-gray-400">{mob.totalCompleted}/{mob.totalTarget} post</div>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                      className={`h-full bg-gradient-to-r ${status.color} rounded-full transition-all duration-1000 shadow-lg`}
                      style={{ width: `${Math.min(mob.progress, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-3 border border-blue-500/20 text-center">
                    <div className="text-2xl mb-1">📹</div>
                    <div className="text-lg font-bold text-white">{mob.totalSyomka}</div>
                    <div className="text-xs text-gray-400">Syomka</div>
                  </div>
                  <div className="bg-purple-500/10 backdrop-blur-sm rounded-xl p-3 border border-purple-500/20 text-center">
                    <div className="text-2xl mb-1">🎬</div>
                    <div className="text-lg font-bold text-white">{mob.totalCompleted}</div>
                    <div className="text-xs text-gray-400">Montaj</div>
                  </div>
                  <div className="bg-yellow-500/10 backdrop-blur-sm rounded-xl p-3 border border-yellow-500/20 text-center">
                    <div className="text-2xl mb-1">⏳</div>
                    <div className="text-lg font-bold text-white">{mob.totalPending}</div>
                    <div className="text-xs text-gray-400">Kutish</div>
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <h4 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                    📁 Loyihalar {mob.projects.length === 0 && <span className="text-gray-500">(Yo'q)</span>}
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
                          className="w-full text-gray-400 hover:text-white text-sm font-medium py-2 transition-colors"
                        >
                          {isExpanded ? '▲ Kamroq ko\'rish' : `▼ Yana ${mob.projects.length - 2} ta ko'rish`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-700/20 rounded-xl border border-dashed border-gray-600/50">
                      <p className="text-gray-500 text-sm">Loyihalar yo'q</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {mobilographers.length === 0 && (
        <div className="text-center py-20 bg-gray-800/30 backdrop-blur-xl rounded-3xl border-2 border-dashed border-gray-700/50">
          <div className="text-7xl mb-6">👥</div>
          <p className="text-gray-300 text-xl font-semibold mb-2">Mobilograflar yo'q</p>
          <p className="text-gray-500 text-sm mb-6">
            Yangi mobilograf qo'shish uchun yuqoridagi tugmani bosing
          </p>
        </div>
      )}
    </div>
  )
}
