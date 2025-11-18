'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Mobilographer {
  id: string
  name: string
  postCount: number
  storisCount: number
  syomkaCount: number
  totalPoints: number
}

interface Record {
  id: string
  mobilographer_id: string
  type: 'editing' | 'filming'
  content_type?: 'post' | 'storis'
  count: number
  date: string
}

export default function ReytingPage() {
  const [rankings, setRankings] = useState<Mobilographer[]>([])
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
      const rankingsWithScores = mobilographers?.map(mobilographer => {
        const mobilographerRecords = records?.filter(
          record => record.mobilographer_id === mobilographer.id
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
          id: mobilographer.id,
          name: mobilographer.name,
          postCount,
          storisCount,
          syomkaCount,
          totalPoints: postCount + storisCount + syomkaCount
        }
      }).sort((a, b) => b.totalPoints - a.totalPoints) || []

      setRankings(rankingsWithScores)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
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

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return (index + 1).toString()
  }

  const getMedalColor = (index: number) => {
    if (index === 0) return 'from-yellow-400 to-yellow-600'
    if (index === 1) return 'from-gray-400 to-gray-600'
    if (index === 2) return 'from-orange-400 to-orange-600'
    return 'from-blue-400 to-blue-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header with Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
          🏆 Reyting Jadvali
        </h1>

        {/* Oy tanlash dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">Davr:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-700 font-medium focus:outline-none focus:border-blue-500 hover:border-gray-400 transition-colors cursor-pointer shadow-sm"
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
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📊</span>
          <div>
            <p className="text-sm text-gray-600 font-medium">Ko'rsatilgan davr:</p>
            <p className="text-xl font-bold text-gray-800">{getMonthName(selectedMonth)}</p>
          </div>
          {rankings.length > 0 && (
            <div className="ml-auto text-right">
              <p className="text-sm text-gray-600">Jami ishtirokchilar:</p>
              <p className="text-2xl font-bold text-blue-600">{rankings.length}</p>
            </div>
          )}
        </div>
      </div>

      {/* Rankings List */}
      <div className="space-y-4">
        {rankings.map((mobilographer, index) => (
          <div
            key={mobilographer.id}
            className={`card-modern border-2 transition-all duration-300 hover:shadow-xl ${
              index === 0
                ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50'
                : index === 1
                ? 'border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100'
                : index === 2
                ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
              {/* Medal/Rank */}
              <div
                className={`w-16 h-16 bg-gradient-to-br ${getMedalColor(
                  index
                )} rounded-full flex items-center justify-center text-white shadow-lg flex-shrink-0`}
              >
                <span className="text-3xl font-bold">{getMedalEmoji(index)}</span>
              </div>

              {/* Mobilograf info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold mb-2 truncate">
                  {mobilographer.name}
                </h3>
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-md">
                    <span className="text-lg">📄</span>
                    <span className="font-semibold text-gray-700">Post:</span>
                    <span className="text-green-600 font-bold">
                      {mobilographer.postCount}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 bg-pink-50 px-2 py-1 rounded-md">
                    <span className="text-lg">📱</span>
                    <span className="font-semibold text-gray-700">Storis:</span>
                    <span className="text-pink-600 font-bold">
                      {mobilographer.storisCount}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
                    <span className="text-lg">📹</span>
                    <span className="font-semibold text-gray-700">Syomka:</span>
                    <span className="text-blue-600 font-bold">
                      {mobilographer.syomkaCount}
                    </span>
                  </span>
                </div>
              </div>

              {/* Total score */}
              <div className="text-right flex-shrink-0">
                <div className="text-sm text-gray-600 mb-1 font-medium">JAMI</div>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {mobilographer.totalPoints}
                </div>
                <div className="text-xs text-gray-500">ball</div>
              </div>

              {/* Progress indicator */}
              {mobilographer.totalPoints > 0 && rankings[0]?.totalPoints > 0 && (
                <div className="w-20 hidden lg:block">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="progress-bar h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (mobilographer.totalPoints / rankings[0].totalPoints) * 100,
                          100
                        )}%`
                      }}
                    />
                  </div>
                  <div className="text-xs text-center text-gray-500 mt-1">
                    {Math.round(
                      (mobilographer.totalPoints / rankings[0].totalPoints) * 100
                    )}
                    %
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {rankings.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-7xl mb-4">🏆</div>
          <p className="text-gray-500 text-xl font-medium mb-2">
            {selectedMonth === 'all'
              ? "Hozircha reyting ma'lumotlari yo'q"
              : `${getMonthName(selectedMonth)} uchun ma'lumot yo'q`}
          </p>
          <p className="text-gray-400 text-sm">
            Ma'lumotlar kiritilgandan so'ng bu yerda ko'rinadi
          </p>
        </div>
      )}

      {/* Top 3 Podium (agar kamida 3 ta odam bo'lsa) */}
      {rankings.length >= 3 && (
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            🎯 Top 3 Yetakchilar
          </h2>
          <div className="flex justify-center items-end gap-4">
            {/* 2-o'rin */}
            <div className="text-center flex-1 max-w-[150px]">
              <div className="bg-gradient-to-br from-gray-300 to-gray-500 rounded-lg p-4 mb-2 transform hover:scale-105 transition-transform">
                <div className="text-4xl mb-2">🥈</div>
                <div className="text-white font-bold text-lg truncate">
                  {rankings[1].name}
                </div>
                <div className="text-white text-2xl font-bold mt-2">
                  {rankings[1].totalPoints}
                </div>
              </div>
              <div className="bg-gray-400 h-24 rounded-t-lg flex items-center justify-center text-white font-bold text-3xl">
                2
              </div>
            </div>

            {/* 1-o'rin */}
            <div className="text-center flex-1 max-w-[150px]">
              <div className="bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-lg p-4 mb-2 transform hover:scale-105 transition-transform shadow-lg">
                <div className="text-5xl mb-2">🥇</div>
                <div className="text-white font-bold text-lg truncate">
                  {rankings[0].name}
                </div>
                <div className="text-white text-3xl font-bold mt-2">
                  {rankings[0].totalPoints}
                </div>
              </div>
              <div className="bg-yellow-500 h-32 rounded-t-lg flex items-center justify-center text-white font-bold text-4xl">
                1
              </div>
            </div>

            {/* 3-o'rin */}
            <div className="text-center flex-1 max-w-[150px]">
              <div className="bg-gradient-to-br from-orange-300 to-orange-600 rounded-lg p-4 mb-2 transform hover:scale-105 transition-transform">
                <div className="text-4xl mb-2">🥉</div>
                <div className="text-white font-bold text-lg truncate">
                  {rankings[2].name}
                </div>
                <div className="text-white text-2xl font-bold mt-2">
                  {rankings[2].totalPoints}
                </div>
              </div>
              <div className="bg-orange-500 h-20 rounded-t-lg flex items-center justify-center text-white font-bold text-3xl">
                3
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
