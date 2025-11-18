'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MobilographerStats {
  id: string
  name: string
  postCount: number
  storisCount: number
  montajCount: number
  syomkaCount: number
  totalPoints: number
}

export default function StatistikaPage() {
  const [stats, setStats] = useState<MobilographerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>('current')
  const [availableMonths, setAvailableMonths] = useState<string[]>([])

  useEffect(() => {
    loadAvailableMonths()
  }, [])

  useEffect(() => {
    if (availableMonths.length > 0 || selectedMonth === 'all') {
      fetchData()
    }
  }, [selectedMonth, availableMonths])

  const loadAvailableMonths = async () => {
    try {
      const { data: allRecords } = await supabase
        .from('records')
        .select('date')
        .order('date', { ascending: false })

      if (!allRecords || allRecords.length === 0) {
        setAvailableMonths([])
        return
      }

      const months = new Set<string>()
      allRecords.forEach(record => {
        if (record.date) {
          const date = new Date(record.date)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          months.add(monthKey)
        }
      })

      const sortedMonths = Array.from(months).sort().reverse()
      setAvailableMonths(sortedMonths)

      // Agar "current" tanlangan bo'lsa, eng oxirgi oyni o'rnatamiz
      if (selectedMonth === 'current' && sortedMonths.length > 0) {
        setSelectedMonth(sortedMonths[0])
      }
    } catch (error) {
      console.error('Error loading months:', error)
      setAvailableMonths([])
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      // Barcha mobilograflarni olish
      const { data: mobilographers, error: mobError } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      if (mobError) throw mobError

      // Records uchun query yaratish
      let query = supabase.from('records').select('*')

      // Agar ma'lum oy tanlangan bo'lsa, filter qo'shamiz
      if (selectedMonth !== 'all') {
        const [year, month] = selectedMonth.split('-')
        const startDate = `${year}-${month}-01`
        
        // Keyingi oyning birinchi kunini hisoblaymiz
        let nextMonth = parseInt(month) + 1
        let nextYear = parseInt(year)
        
        if (nextMonth > 12) {
          nextMonth = 1
          nextYear += 1
        }
        
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
        
        query = query
          .gte('date', startDate)
          .lt('date', endDate)
      }

      const { data: records, error: recError } = await query

      if (recError) throw recError

      // Har bir mobilograf uchun statistikani hisoblash
      const statsWithTotals = mobilographers?.map(m => {
        const mobilographerRecords = records?.filter(r => 
          r.mobilographer_id === m.id
        ) || []
        
        let postCount = 0
        let storisCount = 0
        let syomkaCount = 0
        
        mobilographerRecords.forEach(record => {
          const count = record.count || 1
          if (record.type === 'editing') {
            if (record.content_type === 'post') {
              postCount += count
            } else if (record.content_type === 'storis') {
              storisCount += count
            }
          } else if (record.type === 'filming') {
            syomkaCount += count
          }
        })
        
        return {
          id: m.id,
          name: m.name,
          postCount,
          storisCount,
          montajCount: postCount + storisCount,
          syomkaCount,
          totalPoints: postCount + storisCount + syomkaCount
        }
      })

      setStats(statsWithTotals || [])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const getMonthName = (monthKey: string) => {
    if (monthKey === 'all') return 'Barcha vaqt'
    if (monthKey === 'current') return 'Joriy oy'

    const [year, month] = monthKey.split('-')
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ]
    return `${months[parseInt(month) - 1]} ${year}`
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

  const totalPost = stats.reduce((sum, s) => sum + s.postCount, 0)
  const totalStoris = stats.reduce((sum, s) => sum + s.storisCount, 0)
  const totalSyomka = stats.reduce((sum, s) => sum + s.syomkaCount, 0)
  const totalWork = totalPost + totalStoris + totalSyomka

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header with Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          📊 Statistika
        </h1>

        {/* Oy tanlash dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">Davr:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-700 font-medium focus:outline-none focus:border-purple-500 hover:border-gray-400 transition-colors cursor-pointer shadow-sm"
          >
            <option value="all">📊 Barcha vaqt</option>
            {availableMonths.map(month => (
              <option key={month} value={month}>
                📅 {getMonthName(month)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tanlangan davr info */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📊</span>
          <div>
            <p className="text-sm text-gray-600 font-medium">Ko'rsatilgan davr:</p>
            <p className="text-xl font-bold text-gray-800">{getMonthName(selectedMonth)}</p>
          </div>
          {totalWork > 0 && (
            <div className="ml-auto text-right">
              <p className="text-sm text-gray-600">Jami ish:</p>
              <p className="text-2xl font-bold text-purple-600">{totalWork}</p>
            </div>
          )}
        </div>
      </div>

      {/* Umumiy statistika */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg card-hover transform transition-transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📄</span>
            <span className="text-lg opacity-90">Post</span>
          </div>
          <div className="text-5xl font-bold mb-2">{totalPost}</div>
          <p className="text-sm opacity-90">
            {selectedMonth === 'all' ? 'Jami' : getMonthName(selectedMonth)}
          </p>
          <p className="text-xs opacity-75 mt-1">Loyihalarga hisoblanadi</p>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-2xl p-6 shadow-lg card-hover transform transition-transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📱</span>
            <span className="text-lg opacity-90">Storis</span>
          </div>
          <div className="text-5xl font-bold mb-2">{totalStoris}</div>
          <p className="text-sm opacity-90">
            {selectedMonth === 'all' ? 'Jami' : getMonthName(selectedMonth)}
          </p>
          <p className="text-xs opacity-75 mt-1">Faqat statistikada</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg card-hover transform transition-transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📹</span>
            <span className="text-lg opacity-90">Syomka</span>
          </div>
          <div className="text-5xl font-bold mb-2">{totalSyomka}</div>
          <p className="text-sm opacity-90">
            {selectedMonth === 'all' ? 'Jami' : getMonthName(selectedMonth)}
          </p>
          <p className="text-xs opacity-75 mt-1">Suratga olingan</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg card-hover transform transition-transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🎯</span>
            <span className="text-lg opacity-90">Jami Ish</span>
          </div>
          <div className="text-5xl font-bold mb-2">{totalWork}</div>
          <p className="text-sm opacity-90">
            {selectedMonth === 'all' ? 'Jami' : getMonthName(selectedMonth)}
          </p>
          <p className="text-xs opacity-75 mt-1">Barcha ishlar</p>
        </div>
      </div>

      {/* Mobilograflar statistikasi */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span>👥</span>
          <span>Mobilograflar Statistikasi</span>
        </h2>
        
        <div className="space-y-4">
          {stats
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .map((mobilographer, index) => (
            <div 
              key={mobilographer.id} 
              className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 hover:shadow-lg transition-all duration-300 border-2 border-gray-200 hover:border-purple-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Reyting raqami */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                    'bg-gradient-to-br from-blue-400 to-blue-600'
                  }`}>
                    {index + 1}
                  </div>
                  
                  {/* Avatar */}
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
                    {mobilographer.name.charAt(0)}
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{mobilographer.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedMonth === 'all' ? 'Umumiy natija' : getMonthName(selectedMonth)}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Jami ball</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {mobilographer.totalPoints}
                  </div>
                </div>
              </div>

              {/* Statistika kartochkalari */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-4 border-2 border-green-300">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📄</span>
                    <span className="text-sm text-gray-700 font-medium">Post</span>
                  </div>
                  <div className="text-3xl font-bold text-green-700">
                    {mobilographer.postCount}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {totalPost > 0 ? `${Math.round((mobilographer.postCount / totalPost) * 100)}% dan` : ''}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg p-4 border-2 border-pink-300">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📱</span>
                    <span className="text-sm text-gray-700 font-medium">Storis</span>
                  </div>
                  <div className="text-3xl font-bold text-pink-700">
                    {mobilographer.storisCount}
                  </div>
                  <div className="text-xs text-pink-600 mt-1">
                    {totalStoris > 0 ? `${Math.round((mobilographer.storisCount / totalStoris) * 100)}% dan` : ''}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-4 border-2 border-blue-300">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📹</span>
                    <span className="text-sm text-gray-700 font-medium">Syomka</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-700">
                    {mobilographer.syomkaCount}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {totalSyomka > 0 ? `${Math.round((mobilographer.syomkaCount / totalSyomka) * 100)}% dan` : ''}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {mobilographer.totalPoints > 0 && stats[0]?.totalPoints > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Umumiy ko'rsatkich</span>
                    <span className="font-bold">
                      {Math.round((mobilographer.totalPoints / stats[0].totalPoints) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                      style={{
                        width: `${Math.min((mobilographer.totalPoints / stats[0].totalPoints) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {stats.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-7xl mb-4">📊</div>
          <p className="text-gray-500 text-xl font-medium mb-2">
            {selectedMonth === 'all'
              ? "Hozircha ma'lumotlar yo'q"
              : `${getMonthName(selectedMonth)} uchun ma'lumot yo'q`}
          </p>
          <p className="text-gray-400 text-sm">
            Ma'lumotlar kiritilgandan so'ng bu yerda ko'rinadi
          </p>
        </div>
      )}
    </div>
  )
}
