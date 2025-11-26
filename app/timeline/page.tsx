'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TimelinePage() {
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [selectedTab, setSelectedTab] = useState<'team' | string>('team')
  const [weekData, setWeekData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (mobilographers.length > 0) {
      fetchWeekData()
    }
  }, [selectedTab, mobilographers])

  const fetchData = async () => {
    try {
      const { data: mobilographersData } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      setMobilographers(mobilographersData || [])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const fetchWeekData = async () => {
    try {
      const today = new Date()
      const currentDayOfWeek = today.getDay()
      const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek
      
      const monday = new Date(today)
      monday.setDate(today.getDate() + mondayOffset)
      monday.setHours(0, 0, 0, 0)

      const days = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        
        days.push({
          date: dateStr,
          day: date.getDate(),
          month: date.toLocaleDateString('uz-UZ', { month: 'short' }),
          weekday: date.toLocaleDateString('uz-UZ', { weekday: 'short' }),
          isToday: dateStr === today.toISOString().split('T')[0],
          isPast: date < today && dateStr !== today.toISOString().split('T')[0],
          dayOfWeek: i,
          fullDate: date
        })
      }

      // Fetch records for the week
      const startDate = days[0].date
      const endDate = days[6].date

      const { data: records } = await supabase
        .from('records')
        .select(`
          *,
          mobilographers(id, name),
          projects(id, name)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('start_time', { ascending: true })

      // Organize records by mobilographer and date
      const organizedData = days.map(day => {
        const dayRecords = records?.filter(r => r.date === day.date) || []
        
        const mobilographerData = mobilographers.map(mob => {
          const mobRecords = dayRecords.filter(r => r.mobilographer_id === mob.id)
          
          let totalPost = 0
          let totalStoris = 0
          let totalSyomka = 0
          let totalDuration = 0
          
          mobRecords.forEach(record => {
            const count = record.count || 1
            if (record.type === 'editing') {
              if (record.content_type === 'post') totalPost += count
              else if (record.content_type === 'storis') totalStoris += count
            } else if (record.type === 'filming') {
              totalSyomka += count
            }
            if (record.duration_minutes) {
              totalDuration += record.duration_minutes
            }
          })
          
          return {
            mobilographer: mob,
            records: mobRecords,
            totalPost,
            totalStoris,
            totalSyomka,
            totalDuration,
            hasWork: mobRecords.length > 0
          }
        })
        
        return {
          ...day,
          mobilographerData
        }
      })

      setWeekData(organizedData)
    } catch (error) {
      console.error('Error fetching week data:', error)
    }
  }

  const formatDuration = (minutes: number): string => {
    if (!minutes) return '0 daqiqa'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) {
      return `${hours}s ${mins}d`
    } else if (hours > 0) {
      return `${hours} soat`
    } else {
      return `${mins} daqiqa`
    }
  }

  const getWorkloadStatus = (totalDuration: number) => {
    const hours = totalDuration / 60
    if (hours === 0) return { status: 'none', label: 'Ish yo\'q', color: 'gray' }
    if (hours < 3) return { status: 'light', label: 'Engil', color: 'green' }
    if (hours <= 7) return { status: 'optimal', label: 'Optimal', color: 'blue' }
    if (hours <= 10) return { status: 'heavy', label: 'Og\'ir', color: 'orange' }
    return { status: 'overloaded', label: 'Juda og\'ir', color: 'red' }
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
        📅 Timeline (Joriy Hafta)
      </h1>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedTab('team')}
            className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
              selectedTab === 'team'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Team View
          </button>
          {mobilographers.map((mob) => (
            <button
              key={mob.id}
              onClick={() => setSelectedTab(mob.id)}
              className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedTab === mob.id
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👤 {mob.name}
            </button>
          ))}
        </div>
      </div>

      {/* Team View */}
      {selectedTab === 'team' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-2">📊 Jamoaviy Ish Jadvali</h2>
            <p className="text-gray-600">
              {weekData[0]?.day} {weekData[0]?.month} - {weekData[6]?.day} {weekData[6]?.month}
            </p>
          </div>

          {/* Weekly Overview Table */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-gray-700">Mobilograf</th>
                    {weekData.map((day, idx) => (
                      <th key={idx} className={`px-4 py-4 text-center font-bold ${
                        day.isToday ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                      }`}>
                        <div className="text-xs">{day.weekday}</div>
                        <div className="text-lg">{day.day}</div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-center font-bold text-gray-700">Jami</th>
                  </tr>
                </thead>
                <tbody>
                  {mobilographers.map((mob, mobIdx) => {
                    const weekTotal = weekData.reduce((sum, day) => {
                      const mobData = day.mobilographerData.find((m: any) => m.mobilographer.id === mob.id)
                      return sum + (mobData?.totalDuration || 0)
                    }, 0)

                    return (
                      <tr key={mob.id} className={mobIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 font-semibold text-gray-800">
                          {mob.name}
                        </td>
                        {weekData.map((day, dayIdx) => {
                          const mobData = day.mobilographerData.find((m: any) => m.mobilographer.id === mob.id)
                          const workload = getWorkloadStatus(mobData?.totalDuration || 0)
                          
                          return (
                            <td key={dayIdx} className={`px-4 py-4 text-center ${
                              day.isToday ? 'bg-blue-50' : ''
                            }`}>
                              {mobData?.hasWork ? (
                                <div className="space-y-1">
                                  <div className={`text-xs font-bold px-2 py-1 rounded-lg inline-block ${
                                    workload.color === 'green' ? 'bg-green-100 text-green-700' :
                                    workload.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                                    workload.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                    workload.color === 'red' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {formatDuration(mobData.totalDuration)}
                                  </div>
                                  <div className="flex items-center justify-center gap-1 text-xs">
                                    {mobData.totalPost > 0 && (
                                      <span className="bg-green-100 text-green-700 px-1 rounded">
                                        📄{mobData.totalPost}
                                      </span>
                                    )}
                                    {mobData.totalStoris > 0 && (
                                      <span className="bg-pink-100 text-pink-700 px-1 rounded">
                                        📱{mobData.totalStoris}
                                      </span>
                                    )}
                                    {mobData.totalSyomka > 0 && (
                                      <span className="bg-blue-100 text-blue-700 px-1 rounded">
                                        📹{mobData.totalSyomka}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-300 text-2xl">—</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-6 py-4 text-center font-bold">
                          <div className="text-lg text-blue-600">
                            {formatDuration(weekTotal)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Weekly Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">✅</span>
                <div>
                  <h3 className="font-bold text-lg">Jami Ishlar</h3>
                  <p className="text-sm text-gray-600">Bu hafta</p>
                </div>
              </div>
              <div className="text-4xl font-bold text-green-600">
                {weekData.reduce((sum, day) => 
                  sum + day.mobilographerData.reduce((daySum: number, mob: any) => 
                    daySum + mob.totalPost + mob.totalStoris + mob.totalSyomka, 0
                  ), 0
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">⏰</span>
                <div>
                  <h3 className="font-bold text-lg">Jami Vaqt</h3>
                  <p className="text-sm text-gray-600">Bu hafta</p>
                </div>
              </div>
              <div className="text-4xl font-bold text-blue-600">
                {Math.round(weekData.reduce((sum, day) => 
                  sum + day.mobilographerData.reduce((daySum: number, mob: any) => 
                    daySum + mob.totalDuration, 0
                  ), 0) / 60)}s
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">👥</span>
                <div>
                  <h3 className="font-bold text-lg">Aktiv Mobilograflar</h3>
                  <p className="text-sm text-gray-600">Bu hafta</p>
                </div>
              </div>
              <div className="text-4xl font-bold text-purple-600">
                {mobilographers.filter(mob => 
                  weekData.some(day => 
                    day.mobilographerData.find((m: any) => m.mobilographer.id === mob.id)?.hasWork
                  )
                ).length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual View */}
      {selectedTab !== 'team' && (
        <div className="space-y-6">
          {(() => {
            const selectedMob = mobilographers.find(m => m.id === selectedTab)
            if (!selectedMob) return null

            return (
              <>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold mb-2">👤 {selectedMob.name}</h2>
                  <p className="text-gray-600">
                    {weekData[0]?.day} {weekData[0]?.month} - {weekData[6]?.day} {weekData[6]?.month}
                  </p>
                </div>

                {/* Weekly Calendar */}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {weekData.map((day, idx) => {
                    const mobData = day.mobilographerData.find((m: any) => m.mobilographer.id === selectedMob.id)
                    const workload = getWorkloadStatus(mobData?.totalDuration || 0)

                    return (
                      <div
                        key={idx}
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
                          <div className={`text-3xl font-bold ${
                            day.isToday ? 'text-blue-600' : 'text-gray-800'
                          }`}>
                            {day.day}
                          </div>
                          <div className="text-xs text-gray-500">{day.month}</div>
                        </div>

                        {mobData?.hasWork ? (
                          <div className="space-y-2">
                            <div className={`text-xs font-bold text-center px-2 py-1 rounded-lg ${
                              workload.color === 'green' ? 'bg-green-100 text-green-700' :
                              workload.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                              workload.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                              workload.color === 'red' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {workload.label}
                            </div>

                            <div className="text-sm font-bold text-center text-gray-700">
                              {formatDuration(mobData.totalDuration)}
                            </div>

                            {mobData.records.map((record: any, rIdx: number) => (
                              <div key={rIdx} className="text-xs bg-white border border-gray-200 rounded-lg p-2">
                                <div className="font-semibold text-gray-800">{record.projects?.name}</div>
                                <div className="text-gray-600 mt-1">
                                  {record.type === 'editing' ? (
                                    record.content_type === 'post' ? '📄 Post' : '📱 Storis'
                                  ) : '📹 Syomka'}
                                  {record.count > 1 && ` x${record.count}`}
                                </div>
                                {record.start_time && record.end_time && (
                                  <div className="text-blue-600 mt-1">
                                    ⏱️ {record.start_time} - {record.end_time}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 text-sm py-4">
                            {day.isPast || day.isToday ? 'Ish yo\'q' : '—'}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Today's Timeline (if today) */}
                {(() => {
                  const today = weekData.find(d => d.isToday)
                  if (!today) return null

                  const todayData = today.mobilographerData.find((m: any) => m.mobilographer.id === selectedMob.id)
                  if (!todayData?.hasWork) return null

                  return (
                    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6">
                      <h3 className="text-2xl font-bold mb-4">📋 Bugungi Timeline</h3>
                      
                      <div className="space-y-4">
                        {todayData.records
                          .sort((a: any, b: any) => {
                            if (!a.start_time) return 1
                            if (!b.start_time) return -1
                            return a.start_time.localeCompare(b.start_time)
                          })
                          .map((record: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-4 bg-gray-50 rounded-xl p-4">
                              <div className="text-4xl">
                                {record.type === 'editing' ? 
                                  record.content_type === 'post' ? '📄' : '📱'
                                : '📹'}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-bold text-lg text-gray-800">{record.projects?.name}</h4>
                                  {record.start_time && record.end_time && (
                                    <div className="text-blue-600 font-semibold">
                                      {record.start_time} - {record.end_time}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                  <span>
                                    {record.type === 'editing' ? 
                                      `🎬 Montaj ${record.content_type === 'post' ? 'Post' : 'Storis'}`
                                    : '📹 Syomka'}
                                  </span>
                                  {record.count > 1 && (
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                                      x{record.count}
                                    </span>
                                  )}
                                  {record.duration_minutes && (
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                                      ⏱️ {formatDuration(record.duration_minutes)}
                                    </span>
                                  )}
                                </div>
                                {record.notes && (
                                  <div className="mt-2 text-sm text-gray-600 italic">
                                    📝 {record.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Workload Summary */}
                      <div className="mt-6 grid grid-cols-3 gap-4">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                          <div className="text-3xl font-bold text-green-600">{todayData.totalPost}</div>
                          <div className="text-sm text-green-700">📄 Post</div>
                        </div>
                        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-center">
                          <div className="text-3xl font-bold text-pink-600">{todayData.totalStoris}</div>
                          <div className="text-sm text-pink-700">📱 Storis</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                          <div className="text-3xl font-bold text-blue-600">{todayData.totalSyomka}</div>
                          <div className="text-sm text-blue-700">📹 Syomka</div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Weekly Summary for Selected Person */}
                <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6">
                  <h3 className="text-2xl font-bold mb-4">📊 Haftalik Xulosa</h3>
                  
                  {(() => {
                    const weekTotal = weekData.reduce((sum, day) => {
                      const mobData = day.mobilographerData.find((m: any) => m.mobilographer.id === selectedMob.id)
                      return {
                        post: sum.post + (mobData?.totalPost || 0),
                        storis: sum.storis + (mobData?.totalStoris || 0),
                        syomka: sum.syomka + (mobData?.totalSyomka || 0),
                        duration: sum.duration + (mobData?.totalDuration || 0)
                      }
                    }, { post: 0, storis: 0, syomka: 0, duration: 0 })

                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                          <div className="text-4xl font-bold text-green-600">{weekTotal.post}</div>
                          <div className="text-sm text-green-700 mt-1">📄 Post</div>
                        </div>
                        <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4 text-center">
                          <div className="text-4xl font-bold text-pink-600">{weekTotal.storis}</div>
                          <div className="text-sm text-pink-700 mt-1">📱 Storis</div>
                        </div>
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
                          <div className="text-4xl font-bold text-blue-600">{weekTotal.syomka}</div>
                          <div className="text-sm text-blue-700 mt-1">📹 Syomka</div>
                        </div>
                        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 text-center">
                          <div className="text-4xl font-bold text-purple-600">
                            {Math.round(weekTotal.duration / 60)}s
                          </div>
                          <div className="text-sm text-purple-700 mt-1">⏰ Jami</div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
