'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoyihalarPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    mobilographer_id: '',
    monthly_target: 6
  })
  const [mobilographers, setMobilographers] = useState<any[]>([])

  useEffect(() => {
    fetchMobilographers()
    loadAvailableYears()
  }, [])

  useEffect(() => {
    fetchProjects()
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

  const fetchMobilographers = async () => {
    try {
      const { data } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      setMobilographers(data || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchProjects = async () => {
    try {
      setLoading(true)

      // Calculate first and last day of selected month
      const firstDay = new Date(selectedYear, selectedMonth - 1, 1)
      const lastDay = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)

      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, mobilographers(name)')
        .order('name')

      const projectsWithProgress = await Promise.all(
        (projectsData || []).map(async (project) => {
          // Get completed videos for this month
          const { data: videos } = await supabase
            .from('videos')
            .select('*')
            .eq('project_id', project.id)
            .gte('created_at', firstDay.toISOString())
            .lte('created_at', lastDay.toISOString())

          const completedPosts = videos?.filter(
            v => v.record_id !== null && 
                 v.editing_status === 'completed' && 
                 v.content_type === 'post' && 
                 v.task_type === 'montaj'
          ).length || 0

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

      setProjects(projectsWithProgress)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newProject.name || !newProject.mobilographer_id) {
      alert('Loyiha nomi va mobilograf majburiy!')
      return
    }

    try {
      await supabase
        .from('projects')
        .insert([{
          name: newProject.name,
          mobilographer_id: newProject.mobilographer_id,
          monthly_target: newProject.monthly_target
        }])

      alert('✅ Loyiha qo\'shildi!')
      setNewProject({
        name: '',
        mobilographer_id: '',
        monthly_target: 6
      })
      setShowNewProjectForm(false)
      fetchProjects()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
    }
  }

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`"${name}" loyihasini o'chirmoqchimisiz?\n\nDIQQAT: Bu loyihaga tegishli barcha videolar ham o'chiriladi!`)) {
      return
    }

    try {
      await supabase
        .from('videos')
        .delete()
        .eq('project_id', id)

      await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      alert('✅ Loyiha o\'chirildi!')
      fetchProjects()
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
            📁 Loyihalar
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {getMonthName(selectedMonth)}, {selectedYear} - Oylik Progress (Faqat MONTAJ POST)
          </p>
        </div>
        <button
          onClick={() => setShowNewProjectForm(!showNewProjectForm)}
          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg"
        >
          ➕ Yangi Loyiha
        </button>
      </div>

      {/* Year and Month Filter */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              📅 Yil
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-lg font-semibold"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year} yil</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              📊 Oy
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all outline-none text-lg font-semibold"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <p className="text-sm text-gray-600 font-medium">Ko'rsatilgan davr:</p>
              <p className="text-xl font-bold text-gray-800">
                {getMonthName(selectedMonth)} {selectedYear}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* New Project Form */}
      {showNewProjectForm && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-200 p-6">
          <h2 className="text-xl font-bold mb-4">📝 Yangi Loyiha Qo'shish</h2>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Loyiha nomi</label>
              <input
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                placeholder="Masalan: Mars IT"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Mobilograf</label>
              <select
                value={newProject.mobilographer_id}
                onChange={(e) => setNewProject({ ...newProject, mobilographer_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                required
              >
                <option value="">Tanlang...</option>
                {mobilographers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Oylik maqsad (post soni)</label>
              <input
                type="number"
                min="1"
                value={newProject.monthly_target}
                onChange={(e) => setNewProject({ ...newProject, monthly_target: parseInt(e.target.value) })}
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
                onClick={() => setShowNewProjectForm(false)}
                className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-2xl transition-shadow">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xl">{project.name}</h3>
                <button
                  onClick={() => handleDeleteProject(project.id, project.name)}
                  className="text-white hover:text-red-200 text-2xl transition-colors"
                  title="Loyihani o'chirish"
                >
                  🗑️
                </button>
              </div>
              <p className="text-sm opacity-90 mt-1">👤 {project.mobilographers?.name}</p>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  📄 {project.completed}/{project.monthly_target} post
                </div>
                <div className={`text-2xl font-bold ${
                  project.progress >= 100 ? 'text-green-600' :
                  project.progress >= 70 ? 'text-blue-600' :
                  project.progress >= 40 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {project.progress}%
                </div>
              </div>

              <div className="relative">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
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

              <div className="mt-4 text-center">
                {project.progress >= 100 ? (
                  <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-bold">
                    ✅ Bajarildi
                  </span>
                ) : project.progress >= 70 ? (
                  <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold">
                    🎯 Yaxshi ketmoqda
                  </span>
                ) : project.progress >= 40 ? (
                  <span className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg text-sm font-bold">
                    ⚠️ Orqada qolmoqda
                  </span>
                ) : (
                  <span className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-bold">
                    🚨 Jiddiy orqada
                  </span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  📊 Yangi post montaj qilganingizda yangilanadi
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
          <div className="text-7xl mb-4">📁</div>
          <p className="text-gray-500 text-xl font-medium mb-2">
            {getMonthName(selectedMonth)} {selectedYear} uchun loyihalar yo'q
          </p>
          <p className="text-gray-400 text-sm mb-4">
            Yangi loyiha qo'shish uchun yuqoridagi tugmani bosing
          </p>
        </div>
      )}
    </div>
  )
}
