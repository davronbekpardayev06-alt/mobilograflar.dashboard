'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TimelinePage() {
  const [weekData, setWeekData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showRejaModal, setShowRejaModal] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [newReja, setNewReja] = useState({
    project_id: '',
    mobilographer_id: '',
    deadline_date: '',
    deadline_time: '',
    task_type: 'montaj',
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

      // Mobilograflarni olish
      const { data: mobilographersData } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      // Records olish (qilingan ishlar)
      const { data: records } = await supabase
        .from('records')
        .select(`
          *,
          mobilographers(name),
          projects(name)
        `)
        .gte('date', pastWeek.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0])

      // Videos (rejalar) olish - FAQAT REJA (record_id IS NULL)
      const { data: allVideos } = await supabase
        .from('videos')
        .select(`
          *,
          projects(name, mobilographers(name)),
          assigned_mobilographer:mobilographers!assigned_mobilographer_id(name)
        `)
        .gte('deadline', pastWeek.toISOString().split('T')[0])
        .lte('deadline', futureWeek.toISOString().split('T')[0])
        .is('record_id', null)  // FAQAT REJALAR!

      // Loyihalarni olish
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, mobilographers(name)')
        .order('name')

      setProjects(projectsData || [])
      setMobilographers(mobilographersData || [])

      // 7 kunlik calendar yaratish
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
        
        // Records'dan hisoblash - TAFSILOT BILAN
        const recordsWithDetails: any[] = []
        dayRecords.forEach(record => {
          const count = record.count || 1
          if (record.type === 'editing') {
            if (record.content_type === 'post') {
              postCount += count
              recordsWithDetails.push({
                type: 'post',
                count,
                mobilographer: record.mobilographers?.name,
                project: record.projects?.name
              })
            } else if (record.content_type === 'storis') {
              storisCount += count
              recordsWithDetails.push({
                type: 'storis',
                count,
                mobilographer: record.mobilographers?.name,
                project: record.projects?.name
              })
            }
          } else if (record.type === 'filming') {
            syomkaCount += count
            recordsWithDetails.push({
              type: 'syomka',
              count,
              mobilographer: record.mobilographers?.name,
              project: record.projects?.name
            })
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
          records: dayRecords,
          recordsWithDetails  // YANGI - TAFSILOT!
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

    if (!newReja.project_id || !newReja.mobilographer_id || !newReja.deadline_date || !newReja.deadline_time || !newReja.name) {
      alert('Barcha maydonlarni to\'ldiring!')
      return
    }

    try {
      // SANA TO'G'RIDAN-TO'G'RI SAQLANADI (deadline endi DATE tip - timezone yo'q!)
      const { error } = await supabase
        .from('videos')
        .insert([{
          project_id: newReja.project_id,
          assigned_mobilographer_id: newReja.mobilographer_id,
          name: newReja.name,
          deadline: newReja.deadline_date,  // DATE tip - aniq sana
          deadline_time: newReja.deadline_time,
          task_type: newReja.task_type,
          filming_status: newReja.task_type === 'syomka' ? 'pending' : 'completed',
          editing_status: newReja.task_type === 'montaj' ? 'pending' : 'completed',
          content_type: 'post'
        }])

      if (error) throw error

      alert('✅ Reja qo\'shildi!')
      setShowRejaModal(false)
      setNewReja({ 
        project_id: '', 
        mobilographer_id: '',
        deadline_date: '', 
        deadline_time: '',
        task_type: 'montaj',
        name: '' 
      })
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
    }
  }

  const handleDeleteReja = async (videoId: string) => {
    if (!confirm('Bu rejani o\'chirmoqchimisiz?')) return

    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId)

      if (error) throw error

      alert('✅ Reja o\'chirildi!')
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
              // OXIRGI KUNLAR - Qilindi ma'lumoti bilan TAFSILOT
              <div className="space-y-2">
                {day.hasWork && day.recordsWithDetails && day.recordsWithDetails.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-green-600 mb-2">
                      ✅ Qilindi
                    </div>
                    
                    {day.recordsWithDetails.map((detail: any, idx: number) => (
                      <div key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-2 rounded mb-1">
                        <div className="font-bold">{detail.project}</div>
                        <div className="text-xs opacity-80">
                          👤 {detail.mobilographer}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {detail.type === 'post' && (
                            <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded text-xs font-bold">
                              📄 POST
                            </span>
                          )}
                          {detail.type === 'storis' && (
                            <span className="bg-pink-200 text-pink-800 px-2 py-0.5 rounded text-xs font-bold">
                              📱 STORIS
                            </span>
                          )}
                          {detail.type === 'syomka' && (
                            <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">
                              📹 SYOMKA
                            </span>
                          )}
                          {detail.count > 1 && (
                            <span className="font-bold ml-1">x{detail.count}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {day.hasMissedDeadline && (
                  <>
                    <div className="text-xs font-semibold text-red-600 mb-2">
                      ⚠️ Qilinmagan
                    </div>
                    {day.deadlines.map((video: any, idx: number) => (
                      <div key={idx} className="text-xs bg-red-100 text-red-700 px-2 py-2 rounded">
                        <div className="font-bold">{video.projects?.name}</div>
                        <div className="text-xs opacity-80">
                          👤 {video.assigned_mobilographer?.name || 'Noma\'lum'}
                        </div>
                        <div className="text-xs opacity-80">
                          {video.task_type === 'syomka' ? '📹 Syomka' : '🎬 Montaj'}
                        </div>
                        {video.deadline_time && (
                          <div className="text-xs opacity-80">
                            ⏰ {video.deadline_time}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {!day.hasWork && !day.hasMissedDeadline && (
                  <div className="text-xs text-gray-400 text-center py-2">
                    {day.isToday ? 'Hozircha yo\'q' : '—'}
                  </div>
                )}
              </div>
            ) : (
              // KELGUSI KUNLAR - Rejalar
              <div className="space-y-2">
                <div className="text-xs font-semibold text-green-600 mb-2">
                  🎯 Reja
                </div>
                
                {day.deadlines.length > 0 ? (
                  day.deadlines.map((video: any, idx: number) => (
                    <div key={idx} className="text-xs bg-orange-100 text-orange-700 px-2 py-2 rounded relative">
                      <button
                        onClick={() => handleDeleteReja(video.id)}
                        className="absolute top-1 right-1 text-red-600 hover:text-red-800 text-lg transition"
                        title="Rejani o'chirish"
                      >
                        ✕
                      </button>
                      <div className="font-bold pr-6">{video.projects?.name}</div>
                      <div className="text-xs opacity-80">
                        👤 {video.assigned_mobilographer?.name || 'Noma\'lum'}
                      </div>
                      <div className="text-xs opacity-80">
                        {video.task_type === 'syomka' ? '📹 Syomka' : '🎬 Montaj'}
                      </div>
                      {video.deadline_time && (
                        <div className="text-xs opacity-80">
                          ⏰ {video.deadline_time}
                        </div>
                      )}
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
                      <div key={idx} className="bg-orange-50 border border-orange-200 rounded-xl p-3 relative hover:shadow-md transition">
                        <button
                          onClick={() => handleDeleteReja(video.id)}
                          className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-xl transition"
                          title="Rejani o'chirish"
                        >
                          🗑️
                        </button>
                        <div className="flex items-center justify-between mb-2 pr-8">
                          <span className="font-bold">{video.projects?.name}</span>
                          <span className="text-sm text-orange-600">
                            {video.task_type === 'syomka' ? '📹 Syomka' : '🎬 Montaj'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          👤 {video.assigned_mobilographer?.name || 'Noma\'lum'}
                        </div>
                        {video.deadline_time && (
                          <div className="text-sm text-gray-600 mb-1">
                            ⏰ {video.deadline_time}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          📝 {video.name}
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
            <p>Keyingi 7 kunda reja yo'q</p>
          </div>
        )}
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-modern bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">✅</span>
            <div>
              <h3 className="font-bold text-lg">Qilingan Ishlar</h3>
              <p className="text-sm text-gray-600">Oxirgi 7 kun</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-green-600">
            {weekData.filter(d => d.isPast || d.isToday).reduce((sum, d) => 
              sum + d.postCount + d.storisCount + d.syomkaCount, 0
            )}
          </div>
        </div>

        <div className="card-modern bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🎯</span>
            <div>
              <h3 className="font-bold text-lg">Kelgusi Rejalar</h3>
              <p className="text-sm text-gray-600">Keyingi 7 kun</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-orange-600">
            {weekData.filter(d => !d.isPast && !d.isToday).reduce((sum, d) => 
              sum + d.deadlines.length, 0
            )}
          </div>
        </div>

        <div className="card-modern bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">⚠️</span>
            <div>
              <h3 className="font-bold text-lg">Qilinmagan</h3>
              <p className="text-sm text-gray-600">O'tgan rejalar</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-red-600">
            {weekData.filter(d => d.hasMissedDeadline).reduce((sum, d) => 
              sum + d.deadlines.length, 0
            )}
          </div>
        </div>
      </div>

      {/* REJA QO'SHISH MODAL */}
      {showRejaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
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
                  📁 Loyiha *
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
                  👤 Kim qiladi? (Mobilograf) *
                </label>
                <select
                  value={newReja.mobilographer_id}
                  onChange={(e) => setNewReja({ ...newReja, mobilographer_id: e.target.value })}
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
                <p className="text-xs text-gray-500 mt-2">
                  Bu ishni kim bajarishi kerakligini tanlang
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">
                  🎬 Ish turi *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setNewReja({ ...newReja, task_type: 'montaj' })}
                    className={`py-4 rounded-xl font-bold text-lg transition-all ${
                      newReja.task_type === 'montaj'
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🎬 Montaj
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewReja({ ...newReja, task_type: 'syomka' })}
                    className={`py-4 rounded-xl font-bold text-lg transition-all ${
                      newReja.task_type === 'syomka'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📹 Syomka
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ⚠️ Eslatma: Syomka progress'ga hisoblanmaydi, faqat montaj post hisoblanadi
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    📅 Sana *
                  </label>
                  <input
                    type="date"
                    value={newReja.deadline_date}
                    onChange={(e) => setNewReja({ ...newReja, deadline_date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                    required
                  />
                  <p className="text-xs text-green-600 mt-1 font-semibold">✅ Timezone tuzatildi!</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    ⏰ Vaqt *
                  </label>
                  <input
                    type="time"
                    value={newReja.deadline_time}
                    onChange={(e) => setNewReja({ ...newReja, deadline_time: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  📝 Reja nomi *
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

      {/* Eslatma */}
      <div className="card-modern bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <span className="text-3xl">ℹ️</span>
          <div>
            <h3 className="font-bold text-lg mb-2">Timeline haqida:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✅ <strong>Qilindi:</strong> Loyiha nomi, Kim qildi, Ish turi ko'rsatiladi</li>
              <li>✅ <strong>Reja:</strong> Kelgusi kunlar uchun rejalashtirilgan ishlar</li>
              <li>✅ <strong>Qilinmagan:</strong> Deadline o'tgan, bajarilmagan rejalar</li>
              <li>✅ <strong>Sana:</strong> Timezone tuzatildi - 13-noyabr = 13-noyabr</li>
              <li>⚠️ <strong>Progress:</strong> Faqat MONTAJ POST hisoblanadi</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
