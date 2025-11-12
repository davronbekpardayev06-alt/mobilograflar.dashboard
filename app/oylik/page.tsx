'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function OylikPage() {
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  const fetchData = async () => {
    setLoading(true)
    
    const month = selectedMonth.getMonth() + 1 // 1-12
    const year = selectedMonth.getFullYear()

    // Mobilograflar
    const { data: mobilographers } = await supabase
      .from('mobilographers')
      .select('*')
      .order('name')

    // Loyihalar
    const { data: projects } = await supabase
      .from('projects')
      .select('*')

    // Videolar - SQL EXTRACT ishlatamiz!
    const { data: videos } = await supabase
      .from('videos')
      .select('*')
      .not('record_id', 'is', null)

    // JavaScript'da filter qilamiz (SQL EXTRACT ishlamasa)
    const filteredVideos = (videos || []).filter((v: any) => {
      const vDate = new Date(v.created_at)
      return vDate.getMonth() + 1 === month && vDate.getFullYear() === year
    })

    console.log(`📅 Tanlangan: ${month}/${year}`)
    console.log(`📹 Jami videolar:`, videos?.length)
    console.log(`📹 Bu oydagi videolar:`, filteredVideos.length)

    // Statistika
    const result = (mobilographers || []).map(mob => {
      const mobVids = filteredVideos.filter((v: any) => v.assigned_mobilographer_id === mob.id)
      
      const post = mobVids.filter((v: any) => 
        v.task_type === 'montaj' && v.content_type === 'post' && v.editing_status === 'completed'
      ).length
      
      const storis = mobVids.filter((v: any) => 
        v.task_type === 'montaj' && v.content_type === 'storis' && v.editing_status === 'completed'
      ).length
      
      const syomka = mobVids.filter((v: any) => 
        v.task_type === 'syomka' && v.filming_status === 'completed'
      ).length

      console.log(`👤 ${mob.name}: Post=${post}, Storis=${storis}, Syomka=${syomka}`)

      const mobProjects = (projects || []).filter((p: any) => p.mobilographer_id === mob.id)
      const target = mobProjects.reduce((sum: number, p: any) => sum + (p.monthly_target || 0), 0)
      const progress = target > 0 ? Math.round((post / target) * 100) : 0

      return {
        id: mob.id,
        name: mob.name,
        post,
        storis,
        syomka,
        total: post + storis + syomka,
        target,
        progress
      }
    }).sort((a, b) => b.total - a.total)

    setStats(result)
    setLoading(false)
  }

  const changeMonth = (dir: number) => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + dir)
    setSelectedMonth(newDate)
  }

  const getMonthName = () => {
    return selectedMonth.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })
  }

  const getEmoji = (i: number) => {
    if (i === 0) return '🥇'
    if (i === 1) return '🥈'
    if (i === 2) return '🥉'
    return `${i + 1}`
  }

  const getColor = (i: number) => {
    if (i === 0) return 'from-yellow-400 to-yellow-600'
    if (i === 1) return 'from-gray-400 to-gray-600'
    if (i === 2) return 'from-orange-400 to-orange-600'
    return 'from-blue-400 to-blue-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  const total = {
    post: stats.reduce((s, x) => s + x.post, 0),
    storis: stats.reduce((s, x) => s + x.storis, 0),
    syomka: stats.reduce((s, x) => s + x.syomka, 0),
    ball: stats.reduce((s, x) => s + x.total, 0),
    completed: stats.reduce((s, x) => s + x.post, 0),
    target: stats.reduce((s, x) => s + x.target, 0)
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
        📊 Oylik Hisobot
      </h1>

      <div className="card-modern">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeMonth(-1)}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold"
          >
            ← Oldingi
          </button>
          <h2 className="text-3xl font-bold">{getMonthName()}</h2>
          <button
            onClick={() => changeMonth(1)}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold"
          >
            Keyingi →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-green-500 text-white rounded-2xl p-6">
          <div className="text-4xl mb-2">📄</div>
          <div className="text-lg mb-2">Post Montaj</div>
          <div className="text-5xl font-bold">{total.post}</div>
        </div>
        <div className="bg-pink-500 text-white rounded-2xl p-6">
          <div className="text-4xl mb-2">📱</div>
          <div className="text-lg mb-2">Storis</div>
          <div className="text-5xl font-bold">{total.storis}</div>
        </div>
        <div className="bg-blue-500 text-white rounded-2xl p-6">
          <div className="text-4xl mb-2">📹</div>
          <div className="text-lg mb-2">Syomka</div>
          <div className="text-5xl font-bold">{total.syomka}</div>
        </div>
        <div className="bg-orange-500 text-white rounded-2xl p-6">
          <div className="text-4xl mb-2">⭐</div>
          <div className="text-lg mb-2">Jami Ball</div>
          <div className="text-5xl font-bold">{total.ball}</div>
        </div>
      </div>

      {total.target > 0 && (
        <div className="card-modern">
          <h3 className="text-xl font-bold mb-4">📊 Umumiy Progress</h3>
          <div className="flex items-center justify-between mb-3">
            <span>{total.completed}/{total.target} post</span>
            <span className="text-3xl font-bold">{Math.round((total.completed / total.target) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6">
            <div
              className="h-6 rounded-full bg-blue-500"
              style={{ width: `${Math.min((total.completed / total.target) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="card-modern">
        <h2 className="text-2xl font-bold mb-6">🏆 Reyting</h2>
        <div className="space-y-4">
          {stats.map((m, i) => (
            <div key={m.id} className={`p-6 rounded-2xl bg-gradient-to-r ${getColor(i)} text-white`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-3xl font-bold">
                    {getEmoji(i)}
                  </div>
                  <h3 className="text-2xl font-bold">{m.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold">{m.total}</div>
                  <div className="text-sm">jami ball</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
                  <div className="text-3xl font-bold">{m.post}</div>
                  <div className="text-xs">📄 Post</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
                  <div className="text-3xl font-bold">{m.storis}</div>
                  <div className="text-xs">📱 Storis</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-3 text-center">
                  <div className="text-3xl font-bold">{m.syomka}</div>
                  <div className="text-xs">📹 Syomka</div>
                </div>
              </div>

              {m.target > 0 && (
                <div className="bg-white bg-opacity-20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">📊 Progress</span>
                    <span className="text-2xl font-bold">{m.progress}%</span>
                  </div>
                  <div className="w-full bg-white bg-opacity-30 rounded-full h-3 mb-2">
                    <div className="h-3 rounded-full bg-white" style={{ width: `${Math.min(m.progress, 100)}%` }} />
                  </div>
                  <div className="text-xs">{m.post}/{m.target} post</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
