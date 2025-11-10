'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function MobilograflarPage() {
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: mobilographersData } = await supabase
        .from('mobilographers')
        .select(`
          *,
          projects (
            id,
            name,
            monthly_target,
            videos (
              id,
              editing_status
            )
          )
        `)
        .order('name')

      setMobilographers(mobilographersData || [])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newName.trim()) {
      alert('Iltimos, ism kiriting!')
      return
    }

    try {
      const { error } = await supabase
        .from('mobilographers')
        .insert([{ name: newName.trim() }])

      if (error) throw error

      alert('✅ Mobilograf qo\'shildi!')
      setNewName('')
      setShowForm(false)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}"ni o'chirmoqchimisiz?`)) return

    try {
      const { error } = await supabase
        .from('mobilographers')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      alert('✅ O\'chirildi!')
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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          👥 Mobilograflar
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          ➕ Yangi Mobilograf
        </button>
      </div>

      {showForm && (
        <div className="card-modern border-2 border-blue-200 animate-slide-in">
          <h2 className="text-xl font-bold mb-4">Yangi Mobilograf</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input-modern"
              placeholder="Ism"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
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

      <div className="space-y-6">
        {mobilographers.map((mobilographer) => {
          let totalCompleted = 0
          let totalTarget = 0
          let allProjectsCompleted = true

          mobilographer.projects?.forEach((project: any) => {
            const completed = project.videos?.filter((v: any) => 
              v.editing_status === 'completed'
            ).length || 0
            const target = project.monthly_target || 12
            
            totalCompleted += completed
            totalTarget += target
            
            if (completed < target) {
              allProjectsCompleted = false
            }
          })

          const overallProgress = totalTarget > 0 
            ? Math.round((totalCompleted / totalTarget) * 100) 
            : 0

          return (
            <div
              key={mobilographer.id}
              className={`card-modern border-2 transition ${
                allProjectsCompleted && mobilographer.projects?.length > 0
                  ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {mobilographer.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{mobilographer.name}</h2>
                    <p className="text-gray-600">
                      {mobilographer.projects?.length || 0} ta loyiha
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(mobilographer.id, mobilographer.name)}
                  className="text-red-500 hover:text-red-700 text-2xl transition"
                >
                  🗑️
                </button>
              </div>

              {mobilographer.projects?.length > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Umumiy Progress</span>
                    <span className={`text-2xl font-bold ${
                      overallProgress >= 100 ? 'text-green-600' :
                      overallProgress >= 75 ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {overallProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`progress-bar h-3 rounded-full ${
                        overallProgress >= 100 ? 'bg-green-500' :
                        overallProgress >= 75 ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(overallProgress, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {totalCompleted}/{totalTarget} video tugallandi
                  </p>
                </div>
              )}

              {allProjectsCompleted && mobilographer.projects?.length > 0 && (
                <div className="mb-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl text-center shadow-lg animate-pulse-soft">
                  <div className="text-5xl mb-3">🎉</div>
                  <h3 className="text-2xl font-bold mb-1">BARCHA ISHLAR TUGALLANDI!</h3>
                  <p className="text-sm opacity-90 mt-2">
                    Ajoyib ish! Barcha loyihalar 100% bajarildi
                  </p>
                </div>
              )}

              {mobilographer.projects?.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-700">Loyihalari:</h3>
                  {mobilographer.projects.map((project: any) => {
                    const completed = project.videos?.filter((v: any) => 
                      v.editing_status === 'completed'
                    ).length || 0
                    const target = project.monthly_target || 12
                    const progress = Math.round((completed / target) * 100)

                    return (
                      <div
                        key={project.id}
                        className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-xl border border-purple-200"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold">{project.name}</h4>
                          <span className={`font-bold ${
                            progress >= 100 ? 'text-green-600' :
                            progress >= 75 ? 'text-yellow-600' :
                            'text-blue-600'
                          }`}>
                            {progress}%
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className={`progress-bar h-2 rounded-full ${
                              progress >= 100 ? 'bg-green-500' :
                              progress >= 75 ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        
                        <p className="text-xs text-gray-600">
                          🎯 Maqsad: {target} video/oy | Tugallandi: {completed}
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Hozircha loyihalar yo'q
                </p>
              )}
            </div>
          )
        })}
      </div>

      {mobilographers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <p className="text-gray-500 text-lg">Hozircha mobilograflar yo'q</p>
          <p className="text-gray-400 text-sm mt-2">Yuqoridagi tugma orqali yangi mobilograf qo'shing</p>
        </div>
      )}
    </div>
  )
}
