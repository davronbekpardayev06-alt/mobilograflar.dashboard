'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ReytingPage() {
  const [rankings, setRankings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: mobilographers } = await supabase
        .from('mobilographers')
        .select(`
          *,
          projects (
            id,
            videos (
              id,
              editing_status,
              filming_status
            )
          )
        `)

      const rankingsWithScores = mobilographers?.map(m => {
        let montajCount = 0
        let syomkaCount = 0
        
        m.projects?.forEach((project: any) => {
          montajCount += project.videos?.filter((v: any) => 
            v.editing_status === 'completed'
          ).length || 0
          
          syomkaCount += project.videos?.filter((v: any) => 
            v.filming_status === 'completed'
          ).length || 0
        })
        
        return {
          ...m,
          montajCount,
          syomkaCount,
          totalPoints: montajCount + syomkaCount
        }
      }).sort((a, b) => b.totalPoints - a.totalPoints)

      setRankings(rankingsWithScores || [])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}`
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
      <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
        🏆 Reyting Jadvali
      </h1>

      <div className="space-y-4">
        {rankings.map((mobilographer, index) => (
          <div
            key={mobilographer.id}
            className={`card-modern border-2 ${
              index === 0 ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50' :
              index === 1 ? 'border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100' :
              index === 2 ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-red-50' :
              'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Medal/Rank */}
              <div className={`w-16 h-16 bg-gradient-to-br ${getMedalColor(index)} rounded-full flex items-center justify-center text-white shadow-lg`}>
                <span className="text-3xl font-bold">
                  {index < 3 ? getMedalEmoji(index) : index + 1}
                </span>
              </div>

              {/* Mobilograf info */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-1">{mobilographer.name}</h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="text-lg">🎬</span>
                    <span className="font-semibold">Montaj:</span>
                    <span className="text-purple-600 font-bold">{mobilographer.montajCount}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-lg">📹</span>
                    <span className="font-semibold">Syomka:</span>
                    <span className="text-blue-600 font-bold">{mobilographer.syomkaCount}</span>
                  </span>
                </div>
              </div>

              {/* Total score */}
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">JAMI</div>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {mobilographer.totalPoints}
                </div>
                <div className="text-xs text-gray-500">ball</div>
              </div>

              {/* Progress indicator */}
              {mobilographer.totalPoints > 0 && (
                <div className="w-20">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="progress-bar h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                      style={{
                        width: `${Math.min((mobilographer.totalPoints / (rankings[0]?.totalPoints || 1)) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {rankings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-gray-500 text-lg">Hozircha reyting ma'lumotlari yo'q</p>
        </div>
      )}
    </div>
  )
}
