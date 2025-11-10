'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoyihalarPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    mobilographer_id: '',
    monthly_target: 12
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
        .select(`
          *,
          mobilographers (id, name),
          videos (id, editing_status, deadline)
        `)
        .order('created_at', { ascending: false })

      setMobilographers(mobilographersData || [])
      setProjects(projectsData || [])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newProject.name || !newProject.mobilographer_id) {
      alert('Iltimos, barcha maydonlarni to\'ldiring!')
      return
    }

    try {
      const { error } = await supabase
        .from('projects')
        .insert([{
          name: newProject.name,
          mobilographer_id: newProject.mobilographer_id,
          monthly_target: newProject.monthly_target
        }])

      if (error) throw error

      alert('✅ Loyiha muvaffaqiyatli qo\'shildi!')
      setNewProject({ name: '', mobilographer_id: '', monthly_target: 12 })
      setShowForm(false)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" loyihasini o'chirmoqchimisiz?`)) return

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

  const getDeadlineColor = (deadline: string | null) => {
    if (!deadline) return 'border-gray-200'
    
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'border-red-400 bg-red-50'
    if (diffDays <= 3) return 'border-red-400 bg-red-50'
    if (diffDays <= 7) return 'border-yellow-400 bg-yellow-50'
    return 'border-green-400 bg-green-50'
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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          📁 Loyihalar
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          ➕ Yangi Loyiha
        </button>
      </div>

      {showForm && (
        <div className="card-modern border-2 border-purple-200 animate-slide-in">
          <h2 className="text-xl font-bold mb-4">Yangi Loyiha Qo'shish</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Loyiha Nomi
              </label>
              <input
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="input-modern"
                placeholder="Masalan: Mars IT"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Mas'ul Mobilograf
              </label>
              <select
                value={newProject.mobilographer_id}
                onChange={(e) => setNewProject({ ...newProject, mobilographer_id: e.target.value })}
                className="input-modern"
              >
                <option value="">Tanlang...</option>
                {mobilographers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                🎯 Oylik Maqsad (videolar soni)
              </label>
              <input
                type="number"
                min="1"
                value={newProject.monthly_target}
                onChange={(e) => setNewProject({ 
                  ...newProject, 
                  monthly_target: parseInt(e.target.value) || 12 
                })}
                className="input-modern"
                placeholder="12"
              />
              <p className="text-xs text-gray-500 mt-1">
                Bu loyiha uchun 1 oyda nechta video tugallash kerak
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
              >
                ✅ Qo'shish
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-xl font-semibold transition"
              >
                ❌ Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => {
          const completed = project.videos?.filter((v: any) => 
            v.editing_status === 'completed'
          ).length || 0
          const target = project.monthly_target || 12
          const progress = Math.round((completed / target) * 100)
          
          const nearestDeadline = project.videos
            ?.filter((v: any) => v.deadline && v.editing_status !== 'completed')
            .sort((a: any, b: any) => 
              new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
            )[0]

          return (
            <div
              key={project.id}
              className={`card-modern border-2 ${getDeadlineColor(nearestDeadline?.deadline)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">{project.name}</h3>
                  <p className="text-sm text-gray-600">
                    👤 {project.mobilographers?.name}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(project.id, project.name)}
                  className="text-red-500 hover:text-red-700 transition text-2xl"
                >
                  🗑️
                </button>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold">
                    🎯 Maqsad: {target} video/oy
                  </span>
                  <span className={`text-xl font-bold ${
                    progress >= 100 ? 'text-green-600' :
                    progress >= 75 ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>
                    {progress}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`progress-bar h-4 rounded-full ${
                      progress >= 100 ? 'bg-green-500' :
                      progress >= 75 ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                
                <p className="text-xs text-gray-600 mt-1">
                  {completed}/{target} video tugallandi
                </p>
              </div>

              {nearestDeadline && (
                <div className="text-sm">
                  <p className="font-semibold">⏰ Eng yaqin deadline:</p>
                  <p className="text-gray-700">
                    {new Date(nearestDeadline.deadline).toLocaleDateString('uz-UZ')}
                  </p>
                </div>
              )}

              {progress >= 100 && (
                <div className="mt-4 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg text-center font-semibold">
                  ✅ 100% BAJARILDI!
                </div>
              )}
            </div>
          )
        })}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📁</div>
          <p className="text-gray-500 text-lg">Hozircha loyihalar yo'q</p>
          <p className="text-gray-400 text-sm mt-2">Yuqoridagi tugma orqali yangi loyiha qo'shing</p>
        </div>
      )}
    </div>
  )
}
