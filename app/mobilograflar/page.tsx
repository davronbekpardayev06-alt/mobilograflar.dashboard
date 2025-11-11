'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function MobilograflarPage() {
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMobilographer, setNewMobilographer] = useState({
    name: '',
    phone: '',
    email: ''
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

      const { data: projects } = await supabase
        .from('projects')
        .select(`
          *,
          videos(id, editing_status, filming_status, content_type, task_type, created_at, record_id)
        `)

      const mobilographersWithStats = mobilographersData?.map(mob => {
        const mobProjects = projects?.filter(p => p.mobilographer_id === mob.id) || []
        
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        const projectsWithProgress = mobProjects.map(project => {
          // FAQAT SHU OYNING MONTAJ POST'LARINI HISOBLASH - FAQAT KIRITISHDAN!
          const thisMonthVideos = project.videos?.filter((v: any) => {
            // FAQAT MONTAJ TASK_TYPE!
            if (v.task_type !== 'montaj') return false
            
            // FAQAT POST CONTENT_TYPE!
            if (v.content_type !== 'post') return false
            
            // FAQAT COMPLETED EDITING_STATUS!
            if (v.editing_status !== 'completed') return false
            
            // FAQAT KIRITISHDAN (record_id bor)!
            if (!v.record_id) return false
            
            const videoDate = new Date(v.created_at)
            return videoDate.getMonth() === currentMonth && videoDate.getFullYear() === currentYear
          })
          
          const completed = thisMonthVideos?.length || 0
          const target = project.monthly_target || 12
          const progress = Math.round((completed / target) * 100)

          return {
            ...project,
            completed,
            target,
            progress
          }
        })

        const totalCompleted = projectsWithProgress.reduce((sum, p) => sum + p.completed, 0)
        const totalTarget = projectsWithProgress.reduce((sum, p) => sum + p.target, 0)
        const overallProgress = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0

        return {
          ...mob,
          projects: projectsWithProgress,
          totalCompleted,
          totalTarget,
          overallProgress
        }
      })

      setMobilographers(mobilographersWithStats || [])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleAddMobilographer = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMobilographer.name.trim()) {
      alert('Ism kiritish majburiy!')
      return
    }

    try {
      const { error } = await supabase
        .from('mobilographers')
        .insert([{
          name: newMobilographer.name.trim(),
          phone: newMobilographer.phone.trim() || null,
          email: newMobilographer.email.trim() || null
        }])

      if (error) throw error

      alert('✅ Mobilograf qo\'shildi!')
      setShowAddModal(false)
      setNewMobilographer({ name: '', phone: '', email: '' })
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name}ni o'chirmoqchimisiz?`)) return

    try {
      const { error } = await supabase
        .from('mobilographers')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('✅ Mobilograf o\'chirildi!')
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
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            👥 Mobilograflar
          </h1>
          <p className="text-sm text-gray-500 mt-1">Faqat MONTAJ POST hisoblanadi</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition transform hover:scale-105"
        >
          ➕ Yangi Mobilograf
        </button>
      </div>

      {mobilographers.length > 0 ? (
        <div className="space-y-6">
          {mobilographers.map((mob) => (
            <div key={mob.id} className="card-modern">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {mob.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{mob.name}</h2>
                    <p className="text-gray-600">{mob.projects.length} ta loyiha</p>
                    {mob.phone && (
                      <p className="text-sm text-gray-500">📱 {mob.phone}</p>
                    )}
                    {mob.email && (
                      <p className="text-sm text-gray-500">📧 {mob.email}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(mob.id, mob.name)}
                  className="text-red-500 hover:text-red-700 text-2xl transition"
                  title="O'chirish"
                >
                  🗑️
                </button>
              </div>

              {/* Umumiy Progress */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-gray-700">
                    📊 Umumiy Progress (Faqat MONTAJ POST)
                  </span>
                  <span className="text-3xl font-bold text-blue-600">
                    {mob.overallProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                  <div
                    className={`progress-bar h-4 rounded-full ${
                      mob.overallProgress >= 100 ? 'bg-green-500' :
                      mob.overallProgress >= 75 ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(mob.overallProgress, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  📄 {mob.totalCompleted}/{mob.totalTarget} post montaj (shu oy)
                </p>
              </div>

              {/* Loyihalar ro'yxati */}
              {mob.projects.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="font-bold text-lg mb-3">📁 Loyihalar:</h3>
                  {mob.projects.map((project: any) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                    >
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{project.name}</h4>
                        <p className="text-sm text-gray-600">
                          📄 {project.completed}/{project.target} post montaj (shu oy)
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 bg-gray-200 rounded-full h-3">
                          <div
                            className={`progress-bar h-3 rounded-full ${
                              project.progress >= 100 ? 'bg-green-500' :
                              project.progress >= 75 ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(project.progress, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xl font-bold min-w-[60px] text-right ${
                          project.progress >= 100 ? 'text-green-600' :
                          project.progress >= 75 ? 'text-yellow-600' :
                          'text-blue-600'
                        }`}>
                          {project.progress}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <div className="text-4xl mb-3">📁</div>
                  <p className="text-gray-500">Hozircha loyihalar yo'q</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="text-6xl mb-4">👥</div>
          <p className="text-gray-500 text-lg mb-4">Hozircha mobilograflar yo'q</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold"
          >
            ➕ Birinchi Mobilograf Qo'shish
          </button>
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">➕ Yangi Mobilograf</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMobilographer} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  👤 Ism (Familiya) *
                </label>
                <input
                  type="text"
                  value={newMobilographer.name}
                  onChange={(e) => setNewMobilographer({ ...newMobilographer, name: e.target.value })}
                  placeholder="Masalan: Abdulaziz"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  📱 Telefon (ixtiyoriy)
                </label>
                <input
                  type="tel"
                  value={newMobilographer.phone}
                  onChange={(e) => setNewMobilographer({ ...newMobilographer, phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  📧 Email (ixtiyoriy)
                </label>
                <input
                  type="email"
                  value={newMobilographer.email}
                  onChange={(e) => setNewMobilographer({ ...newMobilographer, email: e.target.value })}
                  placeholder="example@gmail.com"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-lg"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 rounded-2xl font-bold text-xl transition-all duration-200 transform hover:scale-105 shadow-2xl"
              >
                ✅ Qo'shish
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
