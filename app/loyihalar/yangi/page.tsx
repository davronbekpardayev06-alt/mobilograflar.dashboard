'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function YangiLoyihaPage() {
  const router = useRouter()
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    mobilographer_id: '',
    monthly_target: 12,
    description: ''
  })

  useEffect(() => {
    fetchMobilographers()
  }, [])

  const fetchMobilographers = async () => {
    try {
      const { data } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      setMobilographers(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newProject.name || !newProject.mobilographer_id) {
      alert('Loyiha nomi va mobilografni tanlang!')
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('projects')
        .insert([{
          name: newProject.name,
          mobilographer_id: newProject.mobilographer_id,
          monthly_target: parseInt(newProject.monthly_target.toString()) || 12,
          description: newProject.description || null
        }])
        .select()

      if (error) throw error

      alert('✅ Loyiha yaratildi!')
      router.push('/loyihalar')
    } catch (error: any) {
      console.error('Error:', error)
      alert('❌ Xatolik: ' + (error?.message || 'Noma\'lum xatolik'))
      setSubmitting(false)
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
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/loyihalar')}
          className="text-gray-600 hover:text-gray-800 text-2xl"
        >
          ← Orqaga
        </button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          ➕ Yangi Loyiha Yaratish
        </h1>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                📁 Loyiha nomi *
              </label>
              <input
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="Masalan: Mars IT"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                👤 Mas'ul mobilograf *
              </label>
              <select
                value={newProject.mobilographer_id}
                onChange={(e) => setNewProject({ ...newProject, mobilographer_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-lg"
                required
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
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                🎯 Oylik maqsad (nechta post) *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={newProject.monthly_target}
                onChange={(e) => setNewProject({ ...newProject, monthly_target: parseInt(e.target.value) || 12 })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-lg"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                Har oyda {newProject.monthly_target} ta post tayyorlanishi kerak
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                📝 Tavsif (ixtiyoriy)
              </label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Loyiha haqida qisqacha..."
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-4 rounded-2xl font-bold text-xl transition-all duration-200 transform hover:scale-105 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-spin text-2xl">⏳</span>
                  Yuklanmoqda...
                </span>
              ) : (
                '✅ Loyiha Yaratish'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
