'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface GroupedRecord {
  project: any
  mobilographer: any
  records: any[]
  totalPost: number
  totalStoris: number
  totalSyomka: number
}

export default function KiritishPage() {
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [recentRecords, setRecentRecords] = useState<any[]>([])
  const [groupedRecords, setGroupedRecords] = useState<GroupedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<'today' | 'yesterday' | 'week' | 'month'>('today')
  
  const [newRecord, setNewRecord] = useState({
    mobilographer_id: '',
    project_id: '',
    type: 'editing',
    content_type: 'post',
    count: 1,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchRecordsByFilter()
  }, [selectedTab])

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

      setMobilographers(mobilographersData || [])
      setProjects(projectsData || [])
      setLoading(false)
      
      // Bugun uchun avtomatik yuklash
      fetchRecordsByFilter()
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const fetchRecordsByFilter = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      let startDate: Date
      let endDate: Date = new Date()
      endDate.setHours(23, 59, 59, 999)

      switch (selectedTab) {
        case 'today':
          startDate = new Date(today)
          break
        case 'yesterday':
          startDate = new Date(today)
          startDate.setDate(today.getDate() - 1)
          endDate = new Date(today)
          endDate.setSeconds(endDate.getSeconds() - 1)
          break
        case 'week':
          startDate = new Date(today)
          const dayOfWeek = today.getDay()
          const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          startDate.setDate(today.getDate() - daysFromMonday)
          break
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1)
          break
        default:
          startDate = new Date(today)
      }

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      const { data: recordsData } = await supabase
        .from('records')
        .select(`
          *,
          mobilographers(id, name),
          projects(id, name)
        `)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('created_at', { ascending: false })

      setRecentRecords(recordsData || [])
      
      // Guruhlash
      groupRecords(recordsData || [])
    } catch (error) {
      console.error('Error fetching records:', error)
    }
  }

  const groupRecords = (records: any[]) => {
    const grouped = new Map<string, GroupedRecord>()

    records.forEach(record => {
      const key = `${record.project_id}-${record.mobilographer_id}`
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          project: record.projects,
          mobilographer: record.mobilographers,
          records: [],
          totalPost: 0,
          totalStoris: 0,
          totalSyomka: 0
        })
      }

      const group = grouped.get(key)!
      group.records.push(record)

      const count = record.count || 1
      if (record.type === 'editing') {
        if (record.content_type === 'post') {
          group.totalPost += count
        } else if (record.content_type === 'storis') {
          group.totalStoris += count
        }
      } else if (record.type === 'filming') {
        group.totalSyomka += count
      }
    })

    setGroupedRecords(Array.from(grouped.values()))
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

  const getTabLabel = () => {
    switch (selectedTab) {
      case 'today': return 'Bugun'
      case 'yesterday': return 'Kecha'
      case 'week': return 'Bu hafta'
      case 'month': return 'Bu oy'
    }
  }

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 3000)
      return
    }

    try {
      const { data: videos } = await supabase
        .from('videos')
        .select('*')
        .eq('record_id', id)

      if (videos && videos.length > 0) {
        for (const video of videos) {
          if (video.editing_status === 'completed') {
            await supabase
              .from('videos')
              .update({ 
                editing_status: 'pending', 
                record_id: null 
              })
              .eq('id', video.id)
          } else {
            await supabase
              .from('videos')
              .delete()
              .eq('id', video.id)
          }
        }
      }

      await supabase
        .from('records')
        .delete()
        .eq('id', id)

      alert('✅ Yozuv o\'chirildi!')
      setDeleteConfirm(null)
      fetchRecordsByFilter()
    } catch (error) {
      console.error('Delete error:', error)
      alert('❌ Xatolik: ' + (error as Error).message)
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
      const { data: createdRecord, error: recordError } = await supabase
        .from('records')
        .insert([{
          mobilographer_id: newRecord.mobilographer_id,
          project_id: newRecord.project_id,
          type: newRecord.type,
          content_type: newRecord.content_type,
          date: newRecord.date,
          time: newRecord.time || null,
          notes: newRecord.notes || null,
          count: newRecord.count
        }])
        .select()
        .single()

      if (recordError) throw recordError

      const recordId = createdRecord.id

      if (newRecord.type === 'editing') {
        const { data: pendingVideos } = await supabase
          .from('videos')
          .select('id')
          .eq('project_id', newRecord.project_id)
          .eq('editing_status', 'pending')
          .is('record_id', null)
          .limit(newRecord.count)

        if (pendingVideos && pendingVideos.length > 0) {
          const videoIds = pendingVideos.map(v => v.id)
          await supabase
            .from('videos')
            .update({ 
              editing_status: 'completed',
              content_type: newRecord.content_type,
              record_id: recordId
            })
            .in('id', videoIds)
        } else {
          const videosToInsert = []
          for (let i = 0; i < newRecord.count; i++) {
            videosToInsert.push({
              project_id: newRecord.project_id,
              name: `Video ${Date.now()}-${i + 1}`,
              filming_status: 'completed',
              editing_status: 'completed',
              content_type: newRecord.content_type,
              record_id: recordId
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
            editing_status: 'pending',
            content_type: 'post',
            record_id: recordId
          })
        }
        await supabase.from('videos').insert(videosToInsert)
      }

      alert(`✅ ${newRecord.count} ta ${newRecord.type === 'editing' ? newRecord.content_type === 'post' ? 'post' : 'storis' : 'syomka'} muvaffaqiyatli qo'shildi!`)
      
      setNewRecord({
        mobilographer_id: '',
        project_id: '',
        type: 'editing',
        content_type: 'post',
        count: 1,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        notes: ''
      })
      
      resetTimer()
      fetchRecordsByFilter()
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

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Form fields - same as before */}
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

            {newRecord.type === 'editing' && (
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">
                  📱 Kontent turi
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setNewRecord({ ...newRecord, content_type: 'post' })}
                    className={`py-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                      newRecord.content_type === 'post'
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-2xl scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-4xl mb-2">📄</div>
                    Post
                    <div className="text-xs mt-1 opacity-90">Loyiha maqsadiga hisoblanadi</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRecord({ ...newRecord, content_type: 'storis' })}
                    className={`py-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                      newRecord.content_type === 'storis'
                        ? 'bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-2xl scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-4xl mb-2">📱</div>
                    Storis
                    <div className="text-xs mt-1 opacity-90">Faqat statistikada</div>
                  </button>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl p-6">
              <label className="block text-lg font-bold mb-3 text-gray-800">
                🔢 Nechta {newRecord.type === 'editing' ? newRecord.content_type === 'post' ? 'post' : 'storis' : 'video'} {newRecord.type === 'editing' ? 'montaj qilindi' : 'suratga olindi'}?
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
                {newRecord.count} ta {newRecord.type === 'editing' ? newRecord.content_type === 'post' ? '📄 post' : '📱 storis' : '📹 video'}
              </p>
            </div>

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

      {/* NEW: Filtered and Grouped Records */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">📋 Kiritilgan Ishlar</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {[
            { key: 'today', label: '📅 Bugun', color: 'blue' },
            { key: 'yesterday', label: '📅 Kecha', color: 'purple' },
            { key: 'week', label: '📆 Bu hafta', color: 'green' },
            { key: 'month', label: '📊 Bu oy', color: 'orange' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedTab === tab.key
                  ? `bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 text-white shadow-lg scale-105`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grouped Records */}
        {groupedRecords.length > 0 ? (
          <div className="space-y-4">
            {groupedRecords.map((group, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{group.project?.name}</h3>
                    <p className="text-sm text-gray-600">{group.mobilographer?.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-700">
                      {group.records.length} marta
                    </div>
                    <div className="text-xs text-gray-500">jami yozuv</div>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {group.totalPost > 0 && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-center">
                      <div className="text-3xl font-bold text-green-600">{group.totalPost}</div>
                      <div className="text-xs text-green-700">📄 Post</div>
                    </div>
                  )}
                  {group.totalStoris > 0 && (
                    <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-3 text-center">
                      <div className="text-3xl font-bold text-pink-600">{group.totalStoris}</div>
                      <div className="text-xs text-pink-700">📱 Storis</div>
                    </div>
                  )}
                  {group.totalSyomka > 0 && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 text-center">
                      <div className="text-3xl font-bold text-blue-600">{group.totalSyomka}</div>
                      <div className="text-xs text-blue-700">📹 Syomka</div>
                    </div>
                  )}
                </div>

                {/* Individual Records */}
                <div className="space-y-2">
                  {group.records.map(record => (
                    <div key={record.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {record.type === 'editing' 
                            ? record.content_type === 'post' ? '📄' : '📱'
                            : '📹'}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {record.count || 1}x {record.type === 'editing' 
                              ? record.content_type === 'post' ? 'Post' : 'Storis'
                              : 'Syomka'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(record.date).toLocaleDateString('uz-UZ')} • {record.time || '---'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className={`transition-all ${
                          deleteConfirm === record.id
                            ? 'bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm'
                            : 'text-red-500 hover:text-red-700 text-2xl'
                        }`}
                      >
                        {deleteConfirm === record.id ? 'Tasdiqlash?' : '🗑️'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-7xl mb-4">📋</div>
            <p className="text-gray-500 text-xl font-medium mb-2">{getTabLabel()} uchun ma'lumot yo'q</p>
            <p className="text-gray-400 text-sm">Yangi ish kiritganingizda bu yerda ko'rinadi</p>
          </div>
        )}
      </div>
    </div>
  )
}
