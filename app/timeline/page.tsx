'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TimelinePage() {
  const [weekData, setWeekData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Oxirgi 7 kun va kelgusi 7 kun
      const today = new Date()
      const pastWeek = new Date(today)
      pastWeek.setDate(today.getDate() - 6)
      const futureWeek = new Date(today)
      futureWeek.setDate(today.getDate() + 6)

      // Oxirgi 7 kunlik records
      const { data: records } = await supabase
        .from('records')
        .select(`
          *,
          mobilographers(name),
          projects(name)
        `)
        .gte('date', pastWeek.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0])

      // Kelgusi deadline'lar
      const { data: videos } = await supabase
        .from('videos')
        .select(`
          *,
          projects(name, mobilographers(name))
        `)
        .gte('deadline', today.toISOString().split('T')[0])
        .lte('deadline', futureWeek.toISOString().split('T')[0])
        .neq('editing_status', 'completed')

      // 7 kunlik calendar yaratish
      const days = []
      for (let i = -6; i <= 6; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dayRecords = records?.filter(r => r.date === dateStr) || []
        const dayDeadlines = videos?.filter(v => v.deadline === dateStr) || []
        
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

        days.push({
          date: dateStr,
          day: date.getDate(),
          month: date.toLocaleDateString('uz-UZ', { month: 'short' }),
          weekday: date.toLocaleDateString('uz-UZ', { weekday: 'short' }),
          isToday: i === 0,
          isPast: i < 0,
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
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        📅 Timeline (Oxirgi va Kelgusi 7 Kun)
      </h1>

      {/* Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekData.map((day, index) => (
          <div
            key={day.date}
            className={`card-modern border-2 ${
              day.isToday 
                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50' 
                : day.isPast
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-green-300 bg-green-50'
            }`}
          >
            <div className="text-center mb-3">
              <div className="text-xs text-gray-500 uppercase">{day.weekday}</div>
              <div className={`text-3xl font-bold ${day.isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                {day.day}
              </div>
              <div className="text-xs text-gray-500">{day.month}</div>
            </div>

            {day.isPast || day.isToday ? (
              // OXIRGI KUNLAR - Nima qilindi
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-600 mb-2">
                  {day.isToday ? '📌 Bugun' : '✅ Qilindi'}
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

                {day.postCount === 0 && day.storisCount === 0 && day.syomkaCount === 0 && (
                  <div className="text-xs text-gray-400 text-center py-2">
                    {day.isToday ? 'Hozircha yo\'q' : 'Ish bo\'lmagan'}
                  </div>
                )}
              </div>
            ) : (
              // KELGUSI KUNLAR - Reja
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
                    Reja yo'q
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
    </div>
  )
}
