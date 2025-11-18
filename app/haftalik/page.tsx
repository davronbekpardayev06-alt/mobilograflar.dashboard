'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface WeeklyData {
  totalMontaj: number
  totalSyomka: number
  totalWork: number
  mobilographers: any[]
  dateRange: string
  weekStart: string
  weekEnd: string
}

export default function HaftalikPage() {
  const [weeklyData, setWeeklyData] = useState<WeeklyData>({
    totalMontaj: 0,
    totalSyomka: 0,
    totalWork: 0,
    mobilographers: [],
    dateRange: '',
    weekStart: '',
    weekEnd: ''
  })
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<number>(0) // 0 = joriy hafta, -1 = o'tgan hafta, etc.
  const [availableWeeks, setAvailableWeeks] = useState<any[]>([])

  useEffect(() => {
    generateAvailableWeeks()
  }, [])

  useEffect(() => {
    fetchData()
  }, [selectedWeek])

  const generateAvailableWeeks = () => {
    // Oxirgi 8 haftani yaratish
    const weeks = []
    for (let i = 0; i < 8; i++) {
      const weekInfo = getWeekRange(-i)
      weeks.push({
        value: -i,
        label: i === 0 ? '📅 Joriy hafta' : `📅 ${weekInfo.label}`,
        ...weekInfo
      })
    }
    setAvailableWeeks(weeks)
  }

  const getWeekRange = (weeksAgo: number) => {
    const today = new Date()
    
    // Bugungi kunni haftaning qaysi kuniga to'g'ri kelishini aniqlash
    const dayOfWeek = today.getDay() // 0 = yakshanba, 1 = dushanba, ...
    
    // Dushanbagacha bo'lgan kunlar soni
    // Agar yakshanba bo'lsa (0), 6 kun orqaga (o'tgan haftaning dushanbasiga)
    // Aks holda dayOfWeek - 1
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    
    // Joriy haftaning dushanbasini topish
    const currentWeekMonday = new Date(today)
    currentWeekMonday.setDate(today.getDate() - daysFromMonday)
    
    // Tanlangan haftaning dushanbasini topish
    const weekStart = new Date(currentWeekMonday)
    weekStart.setDate(currentWeekMonday.getDate() + (weeksAgo * 7))
    weekStart.setHours(0, 0, 0, 0)
    
    // Yakshanbani topish (dushanbadan 6 kun keyin)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    
    // Label uchun formatlash
    const monthNames = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ]
    
    const startDay = weekStart.getDate()
    const endDay = weekEnd.getDate()
    const startMonth = monthNames[weekStart.getMonth()]
    const endMonth = monthNames[weekEnd.getMonth()]
    
    let label
    if (weeksAgo === 0) {
      label = 'Joriy hafta'
    } else if (weeksAgo === -1) {
      label = "O'tgan hafta"
    } else {
      if (startMonth === endMonth) {
        label = `${startDay}-${endDay} ${startMonth}`
      } else {
        label = `${startDay} ${startMonth} - ${endDay} ${endMonth}`
      }
    }
    
    return {
      weekStart,
      weekEnd,
      label,
      dateRange: `${startDay} ${startMonth} - ${endDay} ${endMonth}`
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const { weekStart, weekEnd, dateRange } = getWeekRange(selectedWeek)
      
      const startDate = weekStart.toISOString().split('T')[0]
      const endDate = weekEnd.toISOString().split('T')[0]

      // Haftalik records
      const { data: records, error } = await supabase
        .from('records')
        .select('*, mobilographers(id, name)')
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error

      // Count'larni hisobga olish
      let totalMontaj = 0
      let totalSyomka = 0

      const mobilographersMap = new Map()
      
      records?.forEach(record => {
        const count = record.count || 1
        
        if (record.type === 'editing') {
          totalMontaj += count
        } else if (record.type === 'filming') {
          totalSyomka += count
        }

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
        if (record.type === 'editing') mob.montaj += count
        if (record.type === 'filming') mob.syomka += count
        mob.total += count
      })

      setWeeklyData({
        totalMontaj,
        totalSyomka,
        totalWork: totalMontaj + totalSyomka,
        mobilographers: Array.from(mobilographersMap.values()).sort((a, b) => b.total - a.total),
        dateRange,
        weekStart: startDate,
        weekEnd: endDate
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
      {/* Header with Week Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            📆 Haftalik Hisobot
          </h1>
          <p className="text-gray-600 mt-2 font-medium">{weeklyData.dateRange}</p>
        </div>

        {/* Hafta tanlash dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">Hafta:</span>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-700 font-medium focus:outline-none focus:border-green-500 hover:border-gray-400 transition-colors cursor-pointer shadow-sm"
          >
            {availableWeeks.map(week => (
              <option key={week.value} value={week.value}>
                {week.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hafta kunlari ko'rsatkichi */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📅</span>
          <div className="flex-1">
            <p className="text-sm text-gray-600 font-medium">Hafta oralig'i:</p>
            <p className="text-lg font-bold text-gray-800">
              Dushanba - Yakshanba ({weeklyData.dateRange})
            </p>
          </div>
          {weeklyData.totalWork > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Jami ish:</p>
              <p className="text-2xl font-bold text-green-600">{weeklyData.totalWork}</p>
            </div>
          )}
        </div>
      </div>

      {/* Umumiy statistika */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-lg card-hover transform transition-transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📊</span>
            <span className="text-lg opacity-90">Jami Ish</span>
          </div>
          <div className="text-5xl font-bold mb-2">{weeklyData.totalWork}</div>
          <p className="text-sm opacity-90">Bu haftada</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg card-hover transform transition-transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🎬</span>
            <span className="text-lg opacity-90">Montaj</span>
          </div>
          <div className="text-5xl font-bold mb-2">{weeklyData.totalMontaj}</div>
          <p className="text-sm opacity-90">Post + Storis</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg card-hover transform transition-transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📹</span>
            <span className="text-lg opacity-90">Syomka</span>
          </div>
          <div className="text-5xl font-bold mb-2">{weeklyData.totalSyomka}</div>
          <p className="text-sm opacity-90">Suratga olingan</p>
        </div>
      </div>

      {/* Haftalik reyting */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span>🏆</span>
          <span>Haftalik Reyting</span>
        </h2>
        
        <div className="space-y-4">
          {weeklyData.mobilographers.map((mob: any, index: number) => (
            <div 
              key={mob.id} 
              className={`rounded-xl p-5 border-2 transition-all duration-300 hover:shadow-lg ${
                index === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300' :
                index === 1 ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300' :
                index === 2 ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-300' :
                'bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Reyting belgisi */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                    'bg-gradient-to-br from-green-500 to-emerald-600'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{mob.name}</h3>
                    <div className="flex items-center gap-3 text-sm mt-2">
                      <span className="flex items-center gap-1 bg-purple-100 px-2 py-1 rounded-md">
                        <span>🎬</span>
                        <span className="font-semibold text-purple-700">Montaj:</span>
                        <span className="font-bold text-purple-800">{mob.montaj}</span>
                      </span>
                      <span className="flex items-center gap-1 bg-blue-100 px-2 py-1 rounded-md">
                        <span>📹</span>
                        <span className="font-semibold text-blue-700">Syomka:</span>
                        <span className="font-bold text-blue-800">{mob.syomka}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">JAMI</div>
                  <div className="text-4xl font-bold text-green-600">{mob.total}</div>
                  <div className="text-xs text-gray-500">ball</div>
                </div>
              </div>

              {/* Progress bar */}
              {mob.total > 0 && weeklyData.mobilographers[0]?.total > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Birinchi o'ringa nisbatan</span>
                    <span className="font-bold">
                      {Math.round((mob.total / weeklyData.mobilographers[0].total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                      style={{
                        width: `${Math.min((mob.total / weeklyData.mobilographers[0].total) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {weeklyData.mobilographers.length === 0 && (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-7xl mb-4">📊</div>
            <p className="text-gray-500 text-xl font-medium mb-2">Bu haftada faoliyat yo'q</p>
            <p className="text-gray-400 text-sm">
              {weeklyData.dateRange} oralig'ida ma'lumotlar kiritilmagan
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
