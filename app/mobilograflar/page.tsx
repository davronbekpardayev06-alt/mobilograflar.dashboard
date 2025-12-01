'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function MobilograflarPage() {
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingMobilographer, setEditingMobilographer] = useState<any>(null)
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

          for (const project of mobProjects) {
            const { data: videos } = await supabase
              .from('videos')
              .select('*')
              .eq('project_id', project.id)
              .gte('created_at', firstDay.toISOString())
              .lte('created_at', lastDay.toISOString())

            const completed = videos?.filter(
              v => v.record_id !== null && 
                   v.editing_status === 'completed' && 
                   v.content_type === 'post' && 
                   v.task_type === 'montaj'
            ).length || 0

            totalCompleted += completed
            totalTarget += project.monthly_target || 0
          }

          const progress = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0

          return {
            ...mob,
            projects: mobProjects,
            totalCompleted,
            totalTarget,
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
      // Get all projects
      const { data: projectsToDelete } = await supabase
        .from('projects')
        .select('id')
        .eq('mobilographer_id', id)

      if (projectsToDelete && projectsToDelete.length > 0) {
        const projectIds = projectsToDelete.map(p => p.id)

        // Delete videos
        await supabase
          .from('videos')
          .delete()
          .in('project_id', projectIds)

        // Delete projects
        await supabase
          .from('projects')
          .delete()
          .in('id', projectIds)
      }

      // Delete records
      await supabase
        .from('records')
        .delete()
        .eq('mobilographer_id', id)

      // Delete mobilographer
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
            👥 Mobilograflar
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Faqat MONTAJ POST hisoblanadi
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg"
        >
          ➕ Yangi Mobilograf
        </button>
      </div>

      {/* New Mobilographer Form */}
      {showNewForm && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-200 p-6">
          <h2 className="text-xl font-bold mb-4">📝 Yangi Mobilograf Qo'shish</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Ism</label>
              <input
                type="text"
                value={newMobilographer.name}
                onChange={(e) => setNewMobilographer({ ...newMobilographer, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                placeholder="Masalan: Og'abek"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Oylik maqsad (jami postlar)</label>
              <input
                type="number"
                min="1"
                value={newMobilographer.monthly_target}
                onChange={(e) => setNewMobilographer({ ...newMobilographer, monthly_target: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
              >
                ✅ Saqlash
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Mobilographer Form */}
      {editingMobilographer && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-6">
          <h2 className="text-xl font-bold mb-4">✏️ Tahrirlash: {editingMobilographer.name}</h2>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Ism</label>
              <input
                type="text"
                value={editingMobilographer.name}
                onChange={(e) => setEditingMobilographer({ ...editingMobilographer, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Oylik maqsad (jami postlar)</label>
              <input
                type="number"
                min="1"
                value={editingMobilographer.monthly_target}
                onChange={(e) => setEditingMobilographer({ ...editingMobilographer, monthly_target: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
              >
                ✅ Saqlash
              </button>
              <button
                type="button"
                onClick={() => setEditingMobilographer(null)}
                className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobilographers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mobilographers.map((mob) => (
          <div key={mob.id} className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl font-bold text-purple-600">
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

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">📊 Umumiy Progress (Faqat MONTAJ POST)</p>
                  <p className="text-sm opacity-75 mt-1">
                    {mob.totalCompleted}/{mob.totalTarget} post montaj
                  </p>
                </div>
                <div className="text-4xl font-bold">
                  {mob.progress}%
                </div>
              </div>
            </div>

            <div className="p-6">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                📁 Loyihalar:
                {mob.projects.length === 0 && (
                  <span className="text-sm text-gray-500 font-normal">(Yo'q)</span>
                )}
              </h4>

              {mob.projects.length > 0 ? (
                <div className="space-y-3">
                  {mob.projects.map((project: any) => (
                    <div key={project.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-bold text-gray-800">{project.name}</h5>
                        <button
                          onClick={() => handleReassignProject(project.id, project.name, mob.id)}
                          className="text-blue-500 hover:text-blue-700 text-sm font-semibold transition-colors"
                          title="Boshqa mobilografga o'tkazish"
                        >
                          🔄 O'tkazish
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>🎯 Oylik maqsad: {project.monthly_target} post</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <p className="text-gray-400">Hali loyihalar yo'q</p>
                  <p className="text-xs text-gray-400 mt-1">Loyihalar sahifasidan qo'shing</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {mobilographers.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
          <div className="text-7xl mb-4">👥</div>
          <p className="text-gray-500 text-xl font-medium mb-2">Hali mobilograflar yo'q</p>
          <p className="text-gray-400 text-sm mb-4">Yangi mobilograf qo'shish uchun yuqoridagi tugmani bosing</p>
        </div>
      )}
    </div>
  )
}
