'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TimelinePage() {
  const [weekData, setWeekData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showRejaModal, setShowRejaModal] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [newReja, setNewReja] = useState({
    project_id: '',
    deadline: '',
    name: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const today = new Date()
      const pastWeek = new Date(today)
      pastWeek.setDate(today.getDate() - 6)
      const futureWeek = new Date(today)
      futureWeek.setDate(today.getDate() + 6)

      const { data: records } = await supabase
        .from('records')
        .select(`
          *,
          mobilographers(name),
          projects(name)
        `)
        .gte('date', pastWeek.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0])

      const { data: allVideos } = await supabase
        .from('videos')
        .select(`
          *,
          projects(name, mobilographers(name))
        `)
        .gte('deadline', pastWeek.toISOString().split('T')[0])
        .lte('deadline', futureWeek.toISOString().split('T')[0])
        .neq('editing_status', 'completed')

      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, mobilographers(name)')
        .order('name')

      setProjects(projectsData || [])

      const days = []
      for (let i = -6; i <= 6; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dayRecords = records?.filter(r => r.date === dateStr) || []
        const dayDeadlines = allVideos?.filter(v => v.deadline === dateStr) || []
        
        let postCount = 0
        let storisCount = 0
        let syomkaCount = 0
        
        dayRecords.forEach(record => {
          const count = record.count || 1
          if (record.type === 'editing') {
            if (record.content_type === 'post') postCount += count
            else if (record.content_type === 'storis') storisCount += count
          } else if (record.type === 'filming') {
            syomkaCount += count
          }
        })

        const hasWork = postCount > 0 || storisCount > 0 || syomkaCount > 0
        const hasMissedDeadline = (i < 0 || i === 0) && dayDeadlines.length > 0 && !hasWork

        days.push({
          date: dateStr,
          day: date.getDate(),
          month: date.toLocaleDateString('uz-UZ', { month: 'short' }),
          weekday: date.toLocaleDateString('uz-UZ', { weekday: 'short' }),
          isToday: i === 0,
          isPast: i < 0,
          hasWork,
          hasMissedDeadline,
          postCount,
          storisCount,
          syomkaCount,
          deadlines: dayDeadlines,
          records: dayRecords
        })
      }

      setWeekData(days)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleAddReja = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newReja.project_id || !newReja.deadline || !newReja.name) {
      alert('Barcha maydonlarni to\'ldiring!')
      return
    }

    try {
      const { error } = await supabase
        .from('videos')
        .insert([{
          project_id: newReja.project_id,
          name: newReja.name,
          deadline: newReja.deadline,
          filming_status: 'pending',
          editing_status: 'pending',
          content_type: 'post'
        }])

      if (error) throw error

      alert('✅ Reja qo\'shildi!')
      setShowRejaModal(false)
      setNewReja({ project_id: '', deadline: '', name: '' })
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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          📅 Timeline (Oxirgi va Kelgusi 7 Kun)
        </h1>
        <button
          onClick={() => setShowRejaModal(true)}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition transform hover:scale-105"
        >
          ➕ Reja Qo'shish
        </button>
      </div>

      {/* Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekData.map((day, index) => (
          <div
            key={day.date}
            className={`card-modern border-2 ${
              day.isToday 
                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50' 
                : day.isPast
                  ? day.hasMissedDeadline
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300 bg-gray-50'
                  : 'border-green-300 bg-green-50'
            }`}
          >
            <div className="text-center mb-3">
              <div className="text-xs text-gray-500 uppercase">{day.weekday}</div>
              <div className={`text-3xl font-bold ${
                day.isToday ? 'text-blue-600' : 
                day.hasMissedDeadline ? 'text-red-600' :
                'text-gray-800'
              }`}>
                {day.day}
              </div>
              <div className="text-xs text-gray-500">{day.month}</div>
            </div>

            {day.isPast || day.isToday ? (
              // OXIRGI KUNLAR
              <div className="space-y-2">
                {/* ISH QILINDI */}
                {day.hasWork && (
                  <>
                    <div className="text-xs font-semibold text-green-600 mb-2">
                      ✅ Qilindi
                    </div>
                    
                    {day.postCount > 0 && (
                      <div className="flex items-center gap-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        <span>📄</span>
                        <span className="font-bold">{day.postCount}</span>
                      </div>
                    )}
                    
                    {day.storisCount > 0 && (
                      <div className="flex items-center gap-2 text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded">
                        <span>📱</span>
                        <span className="font-bold">{day.storisCount}</span>
                      </div>
                    )}
                    
                    {day.syomkaCount > 0 && (
                      <div className="flex items-center gap-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        <span>📹</span>
                        <span className="font-bold">{day.syomkaCount}</span>
                      </div>
                    )}
                  </>
                )}

                {/* DEADLINE O'TGAN LEKIN ISH QILINMAGAN */}
                {day.hasMissedDeadline && (
                  <>
                    <div className="text-xs font-semibold text-red-600 mb-2">
                      ⚠️ Qilinmagan
                    </div>
                    {day.deadlines.map((video: any, idx: number) => (
                      <div key={idx} className="text-xs bg-red-100 text-red-700 px-2 py-2 rounded">
                        <div className="font-bold">{video.projects?.name}</div>
                        <div className="text-xs opacity-80">
                          Deadline o'tdi
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* HECH NARSA YO'Q */}
                {!day.hasWork && !day.hasMissedDeadline && (
                  <div className="text-xs text-gray-400 text-center py-2">
                    {day.isToday ? 'Hozircha yo\'q' : '—'}
                  </div>
                )}
              </div>
            ) : (
              // KELGUSI KUNLAR
              <div className="space-y-2">
                <div className="text-xs font-semibold text-green-600 mb-2">
                  🎯 Reja
                </div>
                
                {day.deadlines.length > 0 ? (
                  day.deadlines.map((video: any, idx: number) => (
                    <div key={idx} className="text-xs bg-orange-100 text-orange-700 px-2 py-2 rounded">
                      <div className="font-bold">{video.projects?.name}</div>
                      <div className="text-xs opacity-80">
                        ⏰ Deadline
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-400 text-center py-2">
                    —
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Keyingi 7 Kun Rejasi */}
      <div className="card-modern border-2 border-green-300">
        <h2 className="text-2xl font-bold mb-4 text-green-600">
          📋 Keyingi 7 Kun Rejasi
        </h2>
        
        {weekData.filter(d => !d.isPast && !d.isToday && d.deadlines.length > 0).length > 0 ? (
          <div className="space-y-3">
            {weekData
              .filter(d => !d.isPast && !d.isToday && d.deadlines.length > 0)
              .map(day => (
                <div key={day.date}>
                  <h3 className="font-bold text-lg mb-2">
                    {day.day} {day.month} - {day.weekday}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {day.deadlines.map((video: any, idx: number) => (
                      <div key={idx} className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold">{video.projects?.name}</span>
                          <span className="text-sm text-orange-600">⏰ Deadline</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          👤 {video.projects?.mobilographers?.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {video.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-5xl mb-3">📅</div>
            <p>Keyingi 7 kunda deadline yo'q</p>
          </div>
        )}
      </div>

      {/* REJA QO'SHISH MODAL */}
      {showRejaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">➕ Yangi Reja Qo'shish</h2>
              <button
                onClick={() => setShowRejaModal(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddReja} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  📁 Loyiha
                </label>
                <select
                  value={newReja.project_id}
                  onChange={(e) => setNewReja({ ...newReja, project_id: e.target.value })}
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
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  ⏰ Deadline (Tugash sanasi)
                </label>
                <input
                  type="date"
                  value={newReja.deadline}
                  onChange={(e) => setNewReja({ ...newReja, deadline: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  📝 Reja nomi
                </label>
                <input
                  type="text"
                  value={newReja.name}
                  onChange={(e) => setNewReja({ ...newReja, name: e.target.value })}
                  placeholder="Masalan: Yangi video montaj"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-2xl font-bold text-xl transition-all duration-200 transform hover:scale-105 shadow-2xl"
              >
                ✅ Reja Qo'shish
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
