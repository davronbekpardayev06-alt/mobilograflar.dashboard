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
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  const getStatusColor = (progress: number) => {
    if (progress >= 100) return 'text-green-600'
    if (progress >= 70) return 'text-blue-600'
    if (progress >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-300 hover:border-gray-400 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-base mb-1">{project.name}</h4>
          <p className="text-xs text-gray-500">Oylik maqsad: {project.monthly_target} post</p>
        </div>
        <button
          onClick={() => onReassign(project.id, project.name, mobId)}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded font-medium transition-colors"
          title="Boshqa mobilografga o'tkazish"
        >
          O'tkazish
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Syomka */}
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Syomka</div>
          <div className="text-lg font-bold text-gray-900">{stats.syomka}/{project.monthly_target}</div>
          <div className="text-xs text-gray-600">{stats.syomkaProgress}%</div>
        </div>

        {/* Montaj */}
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Montaj</div>
          <div className="text-lg font-bold text-gray-900">{stats.montaj}/{project.monthly_target}</div>
          <div className="text-xs text-gray-600">{stats.montajProgress}%</div>
        </div>

        {/* Pending */}
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Kutilmoqda</div>
          <div className="text-lg font-bold text-gray-900">{stats.pending}</div>
          <div className="text-xs text-gray-600">video</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Progress</span>
          <span className={`font-semibold ${getStatusColor(stats.montajProgress)}`}>
            {stats.montajProgress}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              stats.montajProgress >= 100 ? 'bg-green-600' :
              stats.montajProgress >= 70 ? 'bg-blue-600' :
              stats.montajProgress >= 40 ? 'bg-yellow-500' :
              'bg-red-600'
            }`}
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

  const getStatusLabel = (progress: number) => {
    if (progress >= 100) return { label: 'Bajarildi', color: 'bg-green-100 text-green-800 border-green-300' }
    if (progress >= 70) return { label: 'Yaxshi', color: 'bg-blue-100 text-blue-800 border-blue-300' }
    if (progress >= 40) return { label: 'O\'rtacha', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
    return { label: 'Past', color: 'bg-red-100 text-red-800 border-red-300' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 -mx-6 -mt-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Mobilograflar</h1>
            <p className="text-sm text-gray-600">
              Faqat MONTAJ POST hisoblanadi
            </p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            + Yangi Mobilograf
          </button>
        </div>
      </div>

      {/* New Form */}
      {showNewForm && (
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Yangi Mobilograf Qo'shish</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ism</label>
              <input
                type="text"
                value={newMobilographer.name}
                onChange={(e) => setNewMobilographer({ ...newMobilographer, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all outline-none"
                placeholder="Masalan: Og'abek"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Oylik maqsad (jami postlar)</label>
              <input
                type="number"
                min="1"
                value={newMobilographer.monthly_target}
                onChange={(e) => setNewMobilographer({ ...newMobilographer, monthly_target: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all outline-none"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-lg font-medium transition-colors"
              >
                Saqlash
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Form */}
      {editingMobilographer && (
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tahrirlash: {editingMobilographer.name}</h2>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ism</label>
              <input
                type="text"
                value={editingMobilographer.name}
                onChange={(e) => setEditingMobilographer({ ...editingMobilographer, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Oylik maqsad (jami postlar)</label>
              <input
                type="number"
                min="1"
                value={editingMobilographer.monthly_target}
                onChange={(e) => setEditingMobilographer({ ...editingMobilographer, monthly_target: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all outline-none"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-lg font-medium transition-colors"
              >
                Saqlash
              </button>
              <button
                type="button"
                onClick={() => setEditingMobilographer(null)}
                className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobilographers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mobilographers.map((mob) => {
          const status = getStatusLabel(mob.progress)
          const isExpanded = expandedMobilographer === mob.id

          return (
            <div 
              key={mob.id} 
              className="bg-white rounded-lg border border-gray-300 overflow-hidden hover:border-gray-400 transition-colors"
            >
              {/* Header */}
              <div className="bg-gray-50 border-b border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{mob.name}</h3>
                    <p className="text-sm text-gray-600">{mob.projects.length} ta loyiha</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingMobilographer(mob)}
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                      title="Tahrirlash"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(mob.id, mob.name)}
                      className="text-gray-600 hover:text-red-600 transition-colors"
                      title="O'chirish"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className={`inline-block px-3 py-1 rounded-md text-xs font-medium border ${status.color}`}>
                  {status.label}
                </div>
              </div>

              {/* Stats */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Umumiy Progress</div>
                    <div className="text-3xl font-bold text-gray-900">{mob.progress}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{mob.totalCompleted}</div>
                    <div className="text-sm text-gray-600">/ {mob.totalTarget} post</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-5">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      mob.progress >= 100 ? 'bg-green-600' :
                      mob.progress >= 70 ? 'bg-blue-600' :
                      mob.progress >= 40 ? 'bg-yellow-500' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${Math.min(mob.progress, 100)}%` }}
                  ></div>
                </div>

                {/* Overall Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5 pb-5 border-b border-gray-200">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Syomka</div>
                    <div className="text-lg font-bold text-gray-900">{mob.totalSyomka}</div>
                    <div className="text-xs text-gray-500">{mob.syomkaProgress}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Montaj</div>
                    <div className="text-lg font-bold text-gray-900">{mob.totalCompleted}</div>
                    <div className="text-xs text-gray-500">{mob.progress}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Kutilmoqda</div>
                    <div className="text-lg font-bold text-gray-900">{mob.totalPending}</div>
                    <div className="text-xs text-gray-500">video</div>
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-3">
                    Loyihalar {mob.projects.length === 0 && '(Yo\'q)'}
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
                          {isExpanded ? '▲ Kamroq ko\'rish' : `▼ Yana ${mob.projects.length - 2} ta loyiha`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
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
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 text-lg font-medium mb-2">Mobilograflar yo'q</p>
          <p className="text-gray-500 text-sm mb-6">
            Yangi mobilograf qo'shish uchun yuqoridagi tugmani bosing
          </p>
        </div>
      )}
    </div>
  )
}
