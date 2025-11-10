'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function KiritishPage() {
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [recentRecords, setRecentRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  
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

  // Timer effect
  useEffect(() => {
    let interval: any
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

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

      // Oxirgi 10 ta yozuvni olish
      const { data: recordsData } = await supabase
        .from('records')
        .select(`
          *,
          mobilographers(name),
          projects(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      setMobilographers(mobilographersData || [])
      setProjects(projectsData || [])
      setRecentRecords(recordsData || [])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning)
  }

  const resetTimer = () => {
    setIsTimerRunning(false)
    setTimerSeconds(0)
  }

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 3000)
      return
    }

    try {
      const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('✅ Yozuv o\'chirildi!')
      setDeleteConfirm(null)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
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
      // 1. Record yaratish
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

      // 2. Video yaratish yoki yangilash
      if (newRecord.type === 'editing') {
        const { data: pendingVideos } = await supabase
          .from('videos')
          .select('id')
          .eq('project_id', newRecord.project_id)
          .eq('editing_status', 'pending')
          .limit(newRecord.count)

        if (pendingVideos && pendingVideos.length > 0) {
          const videoIds = pendingVideos.map(v => v.id)
          await supabase
            .from('videos')
            .update({ editing_status: 'completed' })
            .in('id', videoIds)
        } else {
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
      
      resetTimer()
      fetchData() // Yangi yozuvlarni yuklash
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

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Ish Haqida Ma'lumot</h2>
                <p className="text-sm opacity-90 mt-1">{new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              {newRecord.type === 'filming' && (
                <div className="text-center bg-white/20 rounded-xl p-4">
                  <div className="text-4xl font-mono font-bold">{formatTime(timerSeconds)}</div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={toggleTimer}
                      className="bg-white text-green-600 px-4 py-1 rounded-lg font-semibold text-sm hover:bg-gray-100 transition"
                    >
                      {isTimerRunning ? '⏸️ Pauza' : '▶️ Boshlash'}
                    </button>
                    <button
                      type="button"
                      onClick={resetTimer}
                      className="bg-white/80 text-red-600 px-4 py-1 rounded-lg font-semibold text-sm hover:bg-white transition"
                    >
                      🔄 Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Sana va Vaqt */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  📅 Sana
                </label>
                <input
                  type="date"
                  value={newRecord.date}
                  onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  ⏰ Vaqt
                </label>
                <input
                  type="time"
                  value={newRecord.time}
                  onChange={(e) => setNewRecord({ ...newRecord, time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                />
              </div>
            </div>

            {/* Kim */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                👤 Kim? (Mobilograf)
              </label>
              <select
                value={newRecord.mobilographer_id}
                onChange={(e) => setNewRecord({ ...newRecord, mobilographer_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
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
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                📁 Loyiha?
              </label>
              <select
                value={newRecord.project_id}
                onChange={(e) => setNewRecord({ ...newRecord, project_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
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
              <label className="block text-sm font-semibold mb-3 text-gray-700">
                🎬 Ish turi
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setNewRecord({ ...newRecord, type: 'editing' })}
                  className={`py-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                    newRecord.type === 'editing'
                      ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-2xl scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-4xl mb-2">🎬</div>
                  Montaj
                </button>
                <button
                  type="button"
                  onClick={() => setNewRecord({ ...newRecord, type: 'filming' })}
                  className={`py-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                    newRecord.type === 'filming'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-2xl scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-4xl mb-2">📹</div>
                  Syomka
                </button>
              </div>
            </div>

            {/* VIDEO SONI */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl p-6">
              <label className="block text-lg font-bold mb-3 text-gray-800">
                🔢 Nechta video {newRecord.type === 'editing' ? 'montaj qilindi' : 'suratga olindi'}?
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setNewRecord({ ...newRecord, count: Math.max(1, newRecord.count - 1) })}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-xl text-3xl font-bold transition transform hover:scale-110"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newRecord.count}
                  onChange={(e) => setNewRecord({ ...newRecord, count: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="flex-1 text-center text-6xl font-bold py-6 rounded-2xl border-4 border-yellow-400 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200 transition-all outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setNewRecord({ ...newRecord, count: newRecord.count + 1 })}
                  className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-xl text-3xl font-bold transition transform hover:scale-110"
                >
                  +
                </button>
              </div>
              <p className="text-center text-lg font-semibold text-gray-700 mt-4">
                {newRecord.count} ta video {newRecord.type === 'editing' ? '🎬 montaj qilindi' : '📹 suratga olindi'}
              </p>
            </div>

            {/* Izoh */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                📝 Izoh (ixtiyoriy)
              </label>
              <textarea
                value={newRecord.notes}
                onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                rows={3}
                placeholder="Qo'shimcha ma'lumot..."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-5 rounded-2xl font-bold text-xl transition-all duration-200 transform hover:scale-105 shadow-2xl hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-spin text-2xl">⏳</span>
                  Yuklanmoqda...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  ✅ {newRecord.count} ta Saqlash
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* SO'NGGI YOZUVLAR */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">📋 So'nggi Yozuvlar</h2>
        
        {recentRecords.length > 0 ? (
          <div className="space-y-3">
            {recentRecords.map((record) => (
              <div key={record.id} className="bg-white rounded-xl p-4 shadow border border-gray-100 flex items-center justify-between hover:shadow-lg transition">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">
                    {record.type === 'editing' ? '🎬' : '📹'}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{record.mobilographers?.name}</p>
                    <p className="text-sm text-gray-600">{record.projects?.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(record.date).toLocaleDateString('uz-UZ')} • {record.time || 'Vaqt yo\'q'}
                    </p>
                    {record.notes && (
                      <p className="text-sm text-gray-500 mt-1">{record.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-lg font-bold ${
                    record.type === 'editing' 
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {record.type === 'editing' ? 'MONTAJ' : 'SYOMKA'}
                  </span>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className={`transition-all ${
                      deleteConfirm === record.id
                        ? 'bg-red-500 text-white px-6 py-2 rounded-lg font-bold'
                        : 'text-red-500 hover:text-red-700 text-3xl'
                    }`}
                  >
                    {deleteConfirm === record.id ? 'Tasdiqlash?' : '🗑️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-gray-500">Hozircha yozuvlar yo'q</p>
          </div>
        )}
      </div>
    </div>
  )
}
