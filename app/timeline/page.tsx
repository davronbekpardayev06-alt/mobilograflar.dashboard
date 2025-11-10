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
      const today = new Date()
      const days = []
      
      // Oxirgi 7 kun va keyingi 7 kun
      for (let i = -7; i <= 7; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        
        const { data: records } = await supabase
          .from('records')
          .select('*, mobilographers(name), projects(name)')
          .eq('date', dateStr)
        
        const dayName = date.toLocaleDateString('uz-UZ', { weekday: 'long' })
        const isToday = i === 0
        const isPast = i < 0
        
        days.push({
          date: dateStr,
          dayName,
          dayNumber: date.getDate(),
          month: date.toLocaleDateString('uz-UZ', { month: 'short' }),
          isToday,
          isPast,
          records: records || [],
          montajCount: records?.filter(r => r.type === 'editing').length || 0,
          syomkaCount: records?.filter(r => r.type === 'filming').length || 0,
          totalCount: records?.length || 0
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
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
        📅 Timeline (Oxirgi 7 Kun)
      </h1>

      {/* Kunlik kartalar */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekData.slice(0, 7).map((day) => (
          <div
            key={day.date}
            className={`card-modern text-center ${
              day.isToday ? 'border-2 border-blue-500 bg-blue-50' :
              day.isPast ? 'opacity-70' : ''
            }`}
          >
            <div className="text-sm text-gray-500">{day.dayName}</div>
            <div className="text-2xl font-bold">{day.dayNumber}</div>
            <div className="text-xs text-gray-400">{day.month}</div>
            
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-center gap-1 text-sm">
                <span>🎬</span>
                <span className="font-bold text-purple-600">{day.montajCount}</span>
              </div>
              <div className="flex items-center justify-center gap-1 text-sm">
                <span>📹</span>
                <span className="font-bold text-blue-600">{day.syomkaCount}</span>
              </div>
            </div>
            
            <div className="mt-2 text-2xl font-bold text-green-600">
              {day.totalCount}
            </div>
          </div>
        ))}
      </div>

      {/* Keyingi 7 kun */}
      <h2 className="text-2xl font-bold mt-8">📍 Keyingi 7 Kun Rejasi</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekData.slice(8).map((day) => (
          <div
            key={day.date}
            className="card-modern text-center bg-gradient-to-br from-gray-50 to-blue-50"
          >
            <div className="text-sm text-gray-500">{day.dayName}</div>
            <div className="text-2xl font-bold">{day.dayNumber}</div>
            <div className="text-xs text-gray-400">{day.month}</div>
            
            <div className="mt-3">
              <div className="text-4xl">📅</div>
              <p className="text-xs text-gray-500 mt-2">Reja bo'sh</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bugungi faoliyat detali */}
      {weekData.find(d => d.isToday)?.records?.length > 0 && (
        <div className="card-modern border-2 border-blue-200">
          <h3 className="text-xl font-bold mb-4">🔥 Bugungi Faoliyat</h3>
          <div className="space-y-2">
            {weekData.find(d => d.isToday)?.records.map((record: any) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {record.type === 'editing' ? '🎬' : '📹'}
                  </span>
                  <div>
                    <p className="font-semibold">{record.mobilographers?.name}</p>
                    <p className="text-sm text-gray-600">{record.projects?.name}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  record.type === 'editing' 
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {record.type === 'editing' ? 'Montaj' : 'Syomka'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
