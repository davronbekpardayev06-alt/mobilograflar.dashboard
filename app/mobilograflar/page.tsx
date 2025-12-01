'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
      return { icon: '🎉', label: 'A\'lo', color: 'from-green-500 to-emerald-600', ringColor: 'ring-green-200', bgColor: 'bg-green-50', textColor: 'text-green-700' }
    } else if (progress >= 70) {
      return { icon: '🚀', label: 'Yaxshi', color: 'from-blue-500 to-blue-600', ringColor: 'ring-blue-200', bgColor: 'bg-blue-50', textColor: 'text-blue-700' }
    } else if (progress >= 40) {
      return { icon: '⚠️', label: 'O\'rtacha', color: 'from-yellow-500 to-orange-500', ringColor: 'ring-yellow-200', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' }
    } else {
      return { icon: '🔴', label: 'Zaif', color: 'from-red-500 to-pink-600', ringColor: 'ring-red-200', bgColor: 'bg-red-50', textColor: 'text-red-700' }
    }
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
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">👥 Mobilograflar</h1>
            <p className="text-lg opacity-90">
              Faqat MONTAJ POST hisoblanadi
            </p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="bg-white text-purple-600 px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform shadow-xl"
          >
            ➕ Yangi Mobilograf
          </button>
        </div>
      </div>

      {/* New Mobilographer Form */}
      {showNewForm && (
        <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-200 p-8 animate-slide-in">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-4xl">📝</span>
            Yangi Mobilograf Qo'shish
          </h2>
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-3 text-gray-700">Ism</label>
              <input
                type="text"
                value={newMobilographer.name}
                onChange={(e) => setNewMobilographer({ ...newMobilographer, name: e.target.value })}
                className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-lg"
                placeholder="Masalan: Og'abek"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-3 text-gray-700">Oylik maqsad (jami postlar)</label>
              <input
                type="number"
                min="1"
                value={newMobilographer.monthly_target}
                onChange={(e) => setNewMobilographer({ ...newMobilographer, monthly_target: parseInt(e.target.value) })}
                className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-lg"
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-lg"
              >
                ✅ Saqlash
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-8 bg-gray-200 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-300 transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Mobilographer Form */}
      {editingMobilographer && (
        <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-200 p-8 animate-slide-in">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-4xl">✏️</span>
            Tahrirlash: {editingMobilographer.name}
          </h2>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-3 text-gray-700">Ism</label>
              <input
                type="text"
                value={editingMobilographer.name}
                onChange={(e) => setEditingMobilographer({ ...editingMobilographer, name: e.target.value })}
                className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-3 text-gray-700">Oylik maqsad (jami postlar)</label>
              <input
                type="number"
                min="1"
                value={editingMobilographer.monthly_target}
                onChange={(e) => setEditingMobilographer({ ...editingMobilographer, monthly_target: parseInt(e.target.value) })}
                className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-lg"
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-lg"
              >
                ✅ Saqlash
              </button>
              <button
                type="button"
                onClick={() => setEditingMobilographer(null)}
                className="px-8 bg-gray-200 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-300 transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobilographers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {mobilographers.map((mob) => {
          const status = getStatusBadge(mob.progress)
          const isExpanded = expandedMobilographer === mob.id

          return (
            <div 
              key={mob.id} 
              className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
            >
              {/* Header with Avatar */}
              <div className={`bg-gradient-to-r ${status.color} p-8 text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 text-9xl opacity-10">
                  {status.icon}
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl font-bold bg-gradient-to-br ${status.color} text-white shadow-2xl ring-4 ${status.ringColor}`}>
                        {mob.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{mob.name}</h3>
                        <p className="text-sm opacity-90">{mob.projects.length} ta loyiha</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingMobilographer(mob)}
                        className="text-white hover:text-yellow-200 text-2xl transition-colors"
                        title="Tahrirlash"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(mob.id, mob.name)}
                        className="text-white hover:text-red-200 text-2xl transition-colors"
                        title="O'chirish"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className={`${status.bgColor} ${status.textColor} px-6 py-3 rounded-2xl inline-block font-bold text-lg`}>
                    {status.icon} {status.label}
                  </div>
                </div>
              </div>

              {/* Progress Overview */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Umumiy Progress</p>
                    <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {mob.progress}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-800">{mob.totalCompleted}</p>
                    <p className="text-sm text-gray-600">/ {mob.totalTarget} post</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative mb-6">
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${status.color}`}
                      style={{ width: `${Math.min(mob.progress, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Fazalar (Stages) */}
                <div className="space-y-4 mb-6">
                  <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    🎬 Ish Fazalari
                  </h4>

                  {/* Syomka Stage */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-4 border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📹</span>
                        <div>
                          <p className="font-bold text-gray-800">Syomka</p>
                          <p className="text-xs text-gray-600">Video suratga olish</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-600">{mob.totalSyomka}</p>
                        <p className="text-xs text-gray-600">{mob.syomkaProgress}%</p>
                      </div>
                    </div>
                    <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                        style={{ width: `${Math.min(mob.syomkaProgress, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Montaj Stage */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border-2 border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🎬</span>
                        <div>
                          <p className="font-bold text-gray-800">Montaj</p>
                          <p className="text-xs text-gray-600">Video tahrirlash</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-purple-600">{mob.totalCompleted}</p>
                        <p className="text-xs text-gray-600">{mob.progress}%</p>
                      </div>
                    </div>
                    <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                        style={{ width: `${Math.min(mob.progress, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Pending */}
                  {mob.totalPending > 0 && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-4 border-2 border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">⏳</span>
                          <div>
                            <p className="font-bold text-gray-800">Kutilmoqda</p>
                            <p className="text-xs text-gray-600">Montaj navbatda</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-yellow-600">{mob.totalPending}</p>
                          <p className="text-xs text-gray-600">video</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Loyihalar */}
                <div className="mb-4">
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                    📁 Loyihalar:
                    {mob.projects.length === 0 && (
                      <span className="text-sm text-gray-500 font-normal">(Yo'q)</span>
                    )}
                  </h4>

                  {mob.projects.length > 0 ? (
                    <div className="space-y-2">
                      {mob.projects.slice(0, isExpanded ? undefined : 3).map((project: any) => (
                        <div key={project.id} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 border-2 border-gray-200 hover:border-purple-300 transition-all">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-gray-800">{project.name}</p>
                              <p className="text-xs text-gray-600">🎯 {project.monthly_target} post/oy</p>
                            </div>
                            <button
                              onClick={() => handleReassignProject(project.id, project.name, mob.id)}
                              className="text-blue-500 hover:text-blue-700 text-sm font-semibold transition-colors"
                              title="Boshqa mobilografga o'tkazish"
                            >
                              🔄
                            </button>
                          </div>
                        </div>
                      ))}
                      {mob.projects.length > 3 && (
                        <button
                          onClick={() => setExpandedMobilographer(isExpanded ? null : mob.id)}
                          className="w-full text-purple-600 hover:text-purple-800 text-sm font-semibold py-2"
                        >
                          {isExpanded ? '▲ Kamroq ko\'rish' : `▼ Yana ${mob.projects.length - 3} ta loyiha`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <p className="text-gray-400 text-sm">Hali loyihalar yo'q</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {mobilographers.length === 0 && (
        <div className="text-center py-20 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl border-2 border-dashed border-purple-300">
          <div className="text-9xl mb-6">👥</div>
          <p className="text-gray-600 text-2xl font-bold mb-3">Hali mobilograflar yo'q</p>
          <p className="text-gray-500 text-lg mb-6">
            Yangi mobilograf qo'shish uchun yuqoridagi tugmani bosing
          </p>
          <button
            onClick={() => setShowNewForm(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform shadow-xl inline-block"
          >
            ➕ Birinchi Mobilografni Qo'shish
          </button>
        </div>
      )}
    </div>
  )
}
