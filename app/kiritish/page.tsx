'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function KiritishPage() {
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newRecord, setNewRecord] = useState({
    mobilographer_id: '',
    project_id: '',
    type: 'editing',
    count: 1,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    notes: ''
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
        .select('*, mobilographers(name)')
        .order('name')

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
    
    if (!newRecord.mobilographer_id || !newRecord.project_id || newRecord.count < 1) {
      alert('Iltimos, barcha majburiy maydonlarni to\'ldiring!')
      return
    }

    setSubmitting(true)

    try {
      // 1. Record yaratish (har bir ish uchun)
      const recordsToInsert = []
      for (let i = 0; i < newRecord.count; i++) {
        recordsToInsert.push({
          mobilographer_id: newRecord.mobilographer_id,
          project_id: newRecord.project_id,
          type: newRecord.type,
          date: newRecord.date,
          time: newRecord.time || null,
          notes: newRecord.notes || null
        })
      }

      const { error: recordError } = await supabase
        .from('records')
        .insert(recordsToInsert)

      if (recordError) throw recordError

      // 2. Agar MONTAJ bo'lsa, videolarni tugallangan deb belgilash
      if (newRecord.type === 'editing') {
        // Loyihaning pending videolarini topish
        const { data: pendingVideos } = await supabase
          .from('videos')
          .select('id')
          .eq('project_id', newRecord.project_id)
          .eq('editing_status', 'pending')
          .limit(newRecord.count)

        if (pendingVideos && pendingVideos.length > 0) {
          // Mavjud videolarni completed qilish
          const videoIds = pendingVideos.map(v => v.id)
          await supabase
            .from('videos')
            .update({ editing_status: 'completed' })
            .in('id', videoIds)
        } else {
          // Agar pending video yo'q bo'lsa, yangi videolar yaratish
          const videosToInsert = []
          for (let i = 0; i < newRecord.count; i++) {
            videosToInsert.push({
              project_id: newRecord.project_id,
              name: `Video ${Date.now()}-${i + 1}`,
              filming_status: 'completed',
              editing_status: 'completed'
            })
          }
          await supabase.from('videos').insert(videosToInsert)
        }
      }

      // 3. Agar SYOMKA bo'lsa, yangi videolar yaratish
      if (newRecord.type === 'filming') {
        const videosToInsert = []
        for (let i = 0; i < newRecord.count; i++) {
          videosToInsert.push({
            project_id: newRecord.project_id,
            name: `Video ${Date.now()}-${i + 1}`,
            filming_status: 'completed',
            editing_status: 'pending'
          })
        }
        await supabase.from('videos').insert(videosToInsert)
      }

      alert(`✅ ${newRecord.count} ta ${newRecord.type === 'editing' ? 'montaj' : 'syomka'} muvaffaqiyatli qo'shildi!`)
      
      setNewRecord({
        mobilographer_id: '',
        project_id: '',
        type: 'editing',
        count: 1,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        notes: ''
      })
      
      setSubmitting(false)
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
        ➕ Yangi Yozuv
      </h1>

      <div className="card-modern max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sana va Vaqt */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                📅 Sana
              </label>
              <input
                type="date"
                value={newRecord.date}
                onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                className="input-modern"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                ⏰ Vaqt
              </label>
              <input
                type="time"
                value={newRecord.time}
                onChange={(e) => setNewRecord({ ...newRecord, time: e.target.value })}
                className="input-modern"
              />
            </div>
          </div>

          {/* Mobilograf */}
          <div>
            <label className="block text-sm font-medium mb-2">
              👤 Kim? (Mobilograf)
            </label>
            <select
              value={newRecord.mobilographer_id}
              onChange={(e) => setNewRecord({ ...newRecord, mobilographer_id: e.target.value })}
              className="input-modern"
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

          {/* Loyiha */}
          <div>
            <label className="block text-sm font-medium mb-2">
              📁 Loyiha?
            </label>
            <select
              value={newRecord.project_id}
              onChange={(e) => setNewRecord({ ...newRecord, project_id: e.target.value })}
              className="input-modern"
              required
            >
              <option value="">Tanlang...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.mobilographers?.name})
                </option>
              ))}
            </select>
          </div>

          {/* Ish turi */}
          <div>
            <label className="block text-sm font-medium mb-2">
              🎬 Ish turi
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setNewRecord({ ...newRecord, type: 'editing' })}
                className={`py-4 rounded-xl font-semibold transition-all duration-200 ${
                  newRecord.type === 'editing'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🎬 Montaj
              </button>
              <button
                type="button"
                onClick={() => setNewRecord({ ...newRecord, type: 'filming' })}
                className={`py-4 rounded-xl font-semibold transition-all duration-200 ${
                  newRecord.type === 'filming'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📹 Syomka
              </button>
            </div>
          </div>

          {/* SON KIRITISH - YANGI! */}
          <div>
            <label className="block text-sm font-medium mb-2">
              🔢 Nechta {newRecord.type === 'editing' ? 'montaj' : 'syomka'} qilindi?
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={newRecord.count}
              onChange={(e) => setNewRecord({ ...newRecord, count: parseInt(e.target.value) || 1 })}
              className="input-modern text-2xl font-bold text-center"
              required
            />
            <p className="text-sm text-gray-500 mt-2">
              {newRecord.count} ta video {newRecord.type === 'editing' ? 'montaj qilindi' : 'suratga olindi'}
            </p>
          </div>

          {/* Izoh */}
          <div>
            <label className="block text-sm font-medium mb-2">
              📝 Izoh (ixtiyoriy)
            </label>
            <textarea
              value={newRecord.notes}
              onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
              className="input-modern"
              rows={3}
              placeholder="Qo'shimcha ma'lumot..."
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Yuklanmoqda...
              </span>
            ) : (
              `✅ ${newRecord.count} ta Saqlash`
            )}
          </button>
        </form>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-6">
          <div className="text-4xl mb-3">🎬</div>
          <h3 className="font-bold text-lg mb-1">Montaj</h3>
          <p className="text-sm text-gray-700">Video tahrirlash tugallandi</p>
        </div>

        <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-6">
          <div className="text-4xl mb-3">📹</div>
          <h3 className="font-bold text-lg mb-1">Syomka</h3>
          <p className="text-sm text-gray-700">Video suratga olindi</p>
        </div>
      </div>
    </div>
  )
}
