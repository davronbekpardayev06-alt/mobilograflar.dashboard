'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function StatistikaPage() {
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Barcha mobilograflarni olish
      const { data: mobilographers } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      // Barcha records'ni olish
      const { data: records } = await supabase
        .from('records')
        .select('*')

      const statsWithTotals = mobilographers?.map(m => {
        // SHU MOBILOGRAFNING records'lari (KIM QILGANI!)
        const mobilographerRecords = records?.filter(r => 
          r.mobilographer_id === m.id
        ) || []
        
        // Count'ni hisobga olish
        let montajCount = 0
        let syomkaCount = 0
        
        mobilographerRecords.forEach(record => {
          const count = record.count || 1
          if (record.type === 'editing') {
            montajCount += count
          } else if (record.type === 'filming') {
            syomkaCount += count
          }
        })
        
        return {
          ...m,
          montajCount,
          syomkaCount,
          totalPoints: montajCount + syomkaCount
        }
      })

      setStats(statsWithTotals || [])
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
          <div className="inline-block w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  const totalMontaj = stats.reduce((sum, s) => sum + s.montajCount, 0)
  const totalSyomka = stats.reduce((sum, s) => sum + s.syomkaCount, 0)

  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        📊 Statistika
      </h1>

      {/* Umumiy statistika */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🎬</span>
            <span className="text-lg opacity-90">Jami Montaj</span>
          </div>
          <div className="text-5xl font-bold">{totalMontaj}</div>
          <p className="text-sm opacity-90 mt-2">Tugallangan videolar</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📹</span>
            <span className="text-lg opacity-90">Jami Syomka</span>
          </div>
          <div className="text-5xl font-bold">{totalSyomka}</div>
          <p className="text-sm opacity-90 mt-2">Suratga olingan</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg card-hover">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">📊</span>
            <span className="text-lg opacity-90">Jami Ish</span>
          </div>
          <div className="text-5xl font-bold">{totalMontaj + totalSyomka}</div>
          <p className="text-sm opacity-90 mt-2">Barcha ishlar</p>
        </div>
      </div>

      {/* Mobilograflar statistikasi */}
      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-6">Mobilograflar Statistikasi</h2>
        
        <div className="space-y-4">
          {stats.map((mobilographer) => (
            <div key={mobilographer.id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                    {mobilographer.name.charAt(0)}
                  </div>
                  <h3 className="text-xl font-bold">{mobilographer.name}</h3>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {mobilographer.totalPoints} ball
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🎬</span>
                    <span className="text-sm text-gray-600">Montaj</span>
                  </div>
                  <div className="text-3xl font-bold text-purple-600">
                    {mobilographer.montajCount}
                  </div>
                </div>

                <div className="bg-blue-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">📹</span>
                    <span className="text-sm text-gray-600">Syomka</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {mobilographer.syomkaCount}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {stats.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-500 text-lg">Hozircha ma'lumotlar yo'q</p>
        </div>
      )}
    </div>
  )
}
