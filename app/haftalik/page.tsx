'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function HaftalikPage() {
  const [weeklyData, setWeeklyData] = useState<any>({
    totalMontaj: 0,
    totalSyomka: 0,
    totalVideos: 0,
    mobilographers: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - 6) // Oxirgi 6 kun + bugun = 7 kun
      
      const startDate = weekStart.toISOString().split('T')[0]
      const endDate = today.toISOString().split('T')[0]

      const { data: records } = await supabase
        .from('records')
        .select('*, mobilographers(id, name)')
        .gte('date', startDate)
        .lte('date', endDate)

      const montajRecords = records?.filter(r => r.type === 'editing') || []
      const syomkaRecords = records?.filter(r => r.type === 'filming') || []

      // Mobilograflar bo'yicha guruhlash
      const mobilographersMap = new Map()
      records?.forEach(record => {
        const mobId = record.mobilographers?.id
        if (!mobId) return

        if (!mobilographersMap.has(mobId)) {
          mobilographersMap.set(mobId, {
            id: mobId,
            name: record.mobilographers.name,
            montaj: 0,
            syomka: 0,
            total: 0
          })
        }

        const mob = mobilographersMap.get(mobId)
        if (record.type === 'editing') mob.montaj++
        if (record.type === 'filming') mob.syomka++
        mob.total++
      })

      setWeeklyData({
        totalMontaj: montajRecords.length,
        totalSyomka: syomkaRecords.length,
        totalVideos: records?.length || 0,
        mobilographers: Array.from(mobilographersMap.values()).sort((a, b) => b.total - a.total),
        dateRange: `${weekStart.toLocaleDateString('uz-UZ')} - ${today.toLocaleDateString('uz-UZ')}`
      })

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
          <div className="inline-block w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          📆 Haftalik Hisobot
        </h1>
        <p className="text-gray-600 mt-2">{weeklyData.dateRange}</p>
      </div>

      {/* Umumiy statistika */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📊</span>
            <span className="text-lg opacity-90">Jami Video</span>
          </div>
          <div className="text-5xl font-bold">{weeklyData.totalVideos}</div>
          <p className="text-sm opacity-90 mt-2">Oxirgi 7 kun</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🎬</span>
            <span className="text-lg opacity-90">Montaj</span>
          </div>
          <div className="text-5xl font-bold">{weeklyData.totalMontaj}</div>
          <p className="text-sm opacity-90 mt-2">Tugallangan</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📹</span>
            <span className="text-lg opacity-90">Syomka</span>
          </div>
          <div className="text-5xl font-bold">{weeklyData.totalSyomka}</div>
          <p className="text-sm opacity-90 mt-2">Suratga olingan</p>
        </div>
      </div>

      {/* Haftalik reyting */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-6">🏆 Haftalik Reyting</h2>
        
        <div className="space-y-4">
          {weeklyData.mobilographers.map((mob: any, index: number) => (
            <div key={mob.id} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{mob.name}</h3>
                    <div className="flex items-center gap-3 text-sm mt-1">
                      <span className="flex items-center gap-1">
                        <span>🎬</span>
                        <span className="font-semibold">{mob.montaj}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span>📹</span>
                        <span className="font-semibold">{mob.syomka}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">{mob.total}</div>
                  <div className="text-xs text-gray-500">jami</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {weeklyData.mobilographers.length === 0 && (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">📊</div>
            <p className="text-gray-500">Bu haftada faoliyat yo'q</p>
          </div>
        )}
      </div>
    </div>
  )
}
