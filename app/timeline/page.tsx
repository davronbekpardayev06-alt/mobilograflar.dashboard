'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TimelinePage() {
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [selectedTab, setSelectedTab] = useState<'team' | string>('team')
  const [selectedView, setSelectedView] = useState<'timeline' | 'plans'>('timeline')
  const [weekData, setWeekData] = useState<any[]>([])
  const [weekPlans, setWeekPlans] = useState<any[]>([])
  const [workSessions, setWorkSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // New plan form
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [newPlan, setNewPlan] = useState({
    mobilographer_id: '',
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    deadline_time: '18:00',
    task_type: 'montaj',
    content_type: 'post',
    count: 1,
    description: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (mobilographers.length > 0) {
      fetchWeekData()
      fetchWeekPlans()
      fetchWorkSessions()
    }
  }, [selectedTab, mobilographers, selectedView])

  const fetchData = async () => {
    try {
      const { data: mobilographersData } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('name')

      setMobilographers(mobilographersData || [])
      setProjects(projectsData || [])
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
          isFuture: date > today,
          dayOfWeek: i,
          fullDate: date
        })
      }

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

  const fetchWeekPlans = async () => {
    try {
      const today = new Date()
      const currentDayOfWeek = today.getDay()
      const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek
      
      const monday = new Date(today)
      monday.setDate(today.getDate() + mondayOffset)
      const startDate = monday.toISOString().split('T')[0]
      
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const endDate = sunday.toISOString().split('T')[0]

      const { data: videos } = await supabase
        .from('videos')
        .select(`
          *,
          projects(id, name),
          mobilographers:assigned_mobilographer_id(id, name)
        `)
        .gte('deadline', startDate)
        .lte('deadline', endDate)
        .is('record_id', null)
        .order('deadline', { ascending: true })
        .order('deadline_time', { ascending: true })

      setWeekPlans(videos || [])
    } catch (error) {
      console.error('Error fetching week plans:', error)
    }
  }

  const fetchWorkSessions = async () => {
    try {
      const today = new Date()
      const currentDayOfWeek = today.getDay()
      const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek
      
      const monday = new Date(today)
      monday.setDate(today.getDate() + mondayOffset)
      const startDate = monday.toISOString().split('T')[0]
      
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const endDate = sunday.toISOString().split('T')[0]

      const { data: sessions } = await supabase
        .from('work_sessions')
        .select(`
          *,
          mobilographers(id, name)
        `)
        .gte('date', startDate)
        .lte('date', endDate)

      setWorkSessions(sessions || [])
    } catch (error) {
      console.error('Error fetching work sessions:', error)
    }
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newPlan.mobilographer_id || !newPlan.project_id) {
      alert('Barcha majburiy maydonlarni to\'ldiring!')
      return
    }

    try {
      await supabase
        .from('videos')
        .insert([{
          project_id: newPlan.project_id,
          assigned_mobilographer_id: newPlan.mobilographer_id,
          name: `${projects.find(p => p.id === newPlan.project_id)?.name} - ${newPlan.description || 'Reja'}`,
          deadline: newPlan.date,
          deadline_time: newPlan.deadline_time,
          task_type: newPlan.task_type,
          content_type: newPlan.content_type,
          filming_status: newPlan.task_type === 'syomka' ? 'pending' : 'completed',
          editing_status: 'pending'
        }])

      alert(`✅ Reja qo'shildi!`)
      setShowPlanForm(false)
      setNewPlan({
        mobilographer_id: '',
        project_id: '',
        date: new Date().toISOString().split('T')[0],
        deadline_time: '18:00',
        task_type: 'montaj',
        content_type: 'post',
        count: 1,
        description: ''
      })
      fetchWeekPlans()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
    }
  }

  const formatDuration = (minutes: number): string => {
    if (!minutes) return '0 daqiqa'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) {
      return `${hours} soat ${mins} daqiqa`
    } else if (hours > 0) {
      return `${hours} soat`
    } else {
      return `${mins} daqiqa`
    }
  }

  const getWorkloadStatus = (totalDuration: number) => {
    const hours = totalDuration / 60
    
    if (hours < 8) {
      const deficit = 480 - totalDuration // 8 soat = 480 daqiqa
      const deficitHours = Math.floor(deficit / 60)
      const deficitMins = deficit % 60
      let deficitText = ''
      if (deficitHours > 0 && deficitMins > 0) {
        deficitText = `${deficitHours} soat ${deficitMins} daqiqa`
      } else if (deficitHours > 0) {
        deficitText = `${deficitHours} soat`
      } else {
        deficitText = `${deficitMins} daqiqa`
      }
      
      return { 
        status: 'low', 
        label: 'Kam ishladi', 
        color: 'red', 
        emoji: '🔴',
        message: `8 soatdan ${deficitText} kam`
      }
    } else if (hours >= 8 && hours < 9) {
      return { 
        status: 'normal', 
        label: 'Normal', 
        color: 'yellow', 
        emoji: '🟡',
        message: 'Standart ish kuni'
      }
    } else {
      const overtime = totalDuration - 480
      const overtimeHours = Math.floor(overtime / 60)
      const overtimeMins = overtime % 60
      let overtimeText = ''
      if (overtimeHours > 0 && overtimeMins > 0) {
        overtimeText = `${overtimeHours} soat ${overtimeMins} daqiqa`
      } else if (overtimeHours > 0) {
        overtimeText = `${overtimeHours} soat`
      } else {
        overtimeText = `${overtimeMins} daqiqa`
      }
      
      return { 
        status: 'high', 
        label: 'Ko\'p ishladi', 
        color: 'green', 
        emoji: '🟢',
        message: `8 soatdan ${overtimeText} ko'p (Overtime)`
      }
    }
  }

  const getSessionForDay = (mobilographerId: string, date: string) => {
    return workSessions.find(s => s.mobilographer_id === mobilographerId && s.date === date)
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          📅 Timeline (Joriy Hafta)
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedView('timeline')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              selectedView === 'timeline'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Ishlar
          </button>
          <button
            onClick={() => setSelectedView('plans')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              selectedView === 'plans'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 Rejalar
          </button>
        </div>
      </div>

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

      {/* TIMELINE VIEW */}
      {selectedView === 'timeline' && (
        <>
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
                        <th className="px-6 py-4 text-left font-bold text-gray-700 sticky left-0 bg-gray-100">Mobilograf</th>
                        {weekData.map((day, idx) => (
                          <th key={idx} className={`px-4 py-4 text-center font-bold min-w-[120px] ${
                            day.isToday ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                          }`}>
                            <div className="text-xs uppercase">{day.weekday}</div>
                            <div className="text-lg">{day.day}</div>
                            <div className="text-xs">{day.month}</div>
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
                            <td className="px-6 py-4 font-semibold text-gray-800 sticky left-0 bg-inherit">
                              {mob.name}
                            </td>
                            {weekData.map((day, dayIdx) => {
                              const mobData = day.mobilographerData.find((m: any) => m.mobilographer.id === mob.id)
                              const workload = getWorkloadStatus(mobData?.totalDuration || 0)
                              const session = getSessionForDay(mob.id, day.date)
                              
                              return (
                                <td key={dayIdx} className={`px-4 py-4 text-center ${
                                  day.isToday ? 'bg-blue-50' : ''
                                }`}>
                                  {mobData?.hasWork || session ? (
                                    <div className="space-y-2">
                                      {/* Check-in Status */}
                                      {session && (
                                        <div className="text-xs">
                                          {session.actual_start && !session.actual_end && (
                                            <div className="bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                                              ✅ {session.actual_start}
                                            </div>
                                          )}
                                          {session.actual_end && (
                                            <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                                              🏁 {session.actual_end}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Work Duration */}
                                      {mobData?.hasWork && (
                                        <>
                                          <div className={`text-xs font-bold px-2 py-1 rounded-lg inline-block ${
                                            workload.color === 'green' ? 'bg-green-100 text-green-700' :
                                            workload.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                                            workload.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                            workload.color === 'red' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                          }`}>
                                            {workload.emoji} {formatDuration(mobData.totalDuration)}
                                          </div>

                                          {/* Work Details */}
                                          <div className="flex flex-wrap items-center justify-center gap-1 text-xs">
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

                                          {/* Projects */}
                                          <div className="text-xs text-gray-600 space-y-1">
                                            {mobData.records.slice(0, 2).map((record: any, rIdx: number) => (
                                              <div key={rIdx} className="truncate" title={record.projects?.name}>
                                                {record.type === 'editing' ? '🎬' : '📹'} {record.projects?.name}
                                              </div>
                                            ))}
                                            {mobData.records.length > 2 && (
                                              <div className="text-blue-600 font-semibold">
                                                +{mobData.records.length - 2} ta
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      )}
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
            </div>
          )}

          {/* Individual View */}
          {selectedTab !== 'team' && (() => {
            const selectedMob = mobilographers.find(m => m.id === selectedTab)
            if (!selectedMob) return null

            const today = weekData.find(d => d.isToday)
            const todayData = today?.mobilographerData.find((m: any) => m.mobilographer.id === selectedMob.id)

            return (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold mb-2">👤 {selectedMob.name}</h2>
                  <p className="text-gray-600">
                    {weekData[0]?.day} {weekData[0]?.month} - {weekData[6]?.day} {weekData[6]?.month}
                  </p>
                </div>

                {/* Weekly Calendar Cards */}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {weekData.map((day, idx) => {
                    const mobData = day.mobilographerData.find((m: any) => m.mobilographer.id === selectedMob.id)
                    const workload = getWorkloadStatus(mobData?.totalDuration || 0)
                    const session = getSessionForDay(selectedMob.id, day.date)

                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl p-4 border-2 ${
                          day.isToday 
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50' 
                            : day.isPast
                              ? 'border-gray-300 bg-gray-50'
                              : 'border-green-300 bg-green-50'
                        }`}
                      >
                        {/* Date Header */}
                        <div className="text-center mb-3">
                          <div className="text-xs text-gray-500 uppercase">{day.weekday}</div>
                          <div className={`text-3xl font-bold ${
                            day.isToday ? 'text-blue-600' : 'text-gray-800'
                          }`}>
                            {day.day}
                          </div>
                          <div className="text-xs text-gray-500">{day.month}</div>
                        </div>

                        {/* Check-in Status */}
                        {session && (
                          <div className="mb-3 space-y-1">
                            {session.actual_start && !session.actual_end && (
                              <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-semibold text-center">
                                ✅ {session.actual_start}
                              </div>
                            )}
                            {session.actual_end && (
                              <div className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-semibold text-center">
                                🏁 {session.actual_end}
                              </div>
                            )}
                            {session.lunch_start && (
                              <div className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded font-semibold text-center">
                                🍽️ {session.lunch_start}-{session.lunch_end || '...'}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Work Info */}
                        {mobData?.hasWork ? (
                          <div className="space-y-2">
                            <div className={`text-xs font-bold text-center px-2 py-1 rounded-lg ${
                              workload.color === 'green' ? 'bg-green-100 text-green-700' :
                              workload.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                              workload.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                              workload.color === 'red' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {workload.emoji} {workload.label}
                            </div>

                            <div className="text-sm font-bold text-center text-gray-700">
                              {formatDuration(mobData.totalDuration)}
                            </div>

                            {/* Records */}
                            {mobData.records.map((record: any, rIdx: number) => (
                              <div key={rIdx} className="text-xs bg-white border border-gray-200 rounded-lg p-2">
                                <div className="font-semibold text-gray-800 truncate" title={record.projects?.name}>
                                  {record.projects?.name}
                                </div>
                                <div className="text-gray-600 mt-1 flex items-center gap-1">
                                  <span>
                                    {record.type === 'editing' ? '🎬' : '📹'}
                                  </span>
                                  <span>
                                    {record.type === 'editing' ? 'Montaj' : 'Syomka'}
                                  </span>
                                  {record.content_type && (
                                    <span>
                                      {record.content_type === 'post' ? '📄' : '📱'}
                                    </span>
                                  )}
                                  {record.count > 1 && (
                                    <span className="font-semibold">x{record.count}</span>
                                  )}
                                </div>
                                {record.start_time && record.end_time && (
                                  <div className="text-blue-600 mt-1">
                                    ⏱️ {record.start_time}-{record.end_time}
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

                {/* Today's Detailed Timeline */}
                {todayData?.hasWork && (
                  <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6">
                    <h3 className="text-2xl font-bold mb-4">📋 Bugungi Timeline - Tafsilot</h3>
                    
                    <div className="space-y-4">
                      {todayData.records
                        .sort((a: any, b: any) => {
                          if (!a.start_time) return 1
                          if (!b.start_time) return -1
                          return a.start_time.localeCompare(b.start_time)
                        })
                        .map((record: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
                            <div className="text-5xl">
                              {record.type === 'editing' ? 
                                record.content_type === 'post' ? '📄' : '📱'
                              : '📹'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h4 className="font-bold text-xl text-gray-800">{record.projects?.name}</h4>
                                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
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
                                  </div>
                                </div>
                                {record.start_time && record.end_time && (
                                  <div className="text-right">
                                    <div className="text-blue-600 font-bold text-lg">
                                      {record.start_time} - {record.end_time}
                                    </div>
                                    {record.duration_minutes && (
                                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-lg font-semibold text-sm mt-1">
                                        ⏱️ {formatDuration(record.duration_minutes)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {record.notes && (
                                <div className="mt-2 text-sm text-gray-600 italic bg-white p-2 rounded border border-gray-200">
                                  📝 {record.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Daily Summary */}
                    <div className="mt-6 grid grid-cols-3 gap-4">
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                        <div className="text-4xl font-bold text-green-600">{todayData.totalPost}</div>
                        <div className="text-sm text-green-700 mt-1">📄 Post</div>
                      </div>
                      <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4 text-center">
                        <div className="text-4xl font-bold text-pink-600">{todayData.totalStoris}</div>
                        <div className="text-sm text-pink-700 mt-1">📱 Storis</div>
                      </div>
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
                        <div className="text-4xl font-bold text-blue-600">{todayData.totalSyomka}</div>
                        <div className="text-sm text-blue-700 mt-1">📹 Syomka</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Weekly Summary */}
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
                            {formatDuration(weekTotal.duration)}
                          </div>
                          <div className="text-sm text-purple-700 mt-1">⏰ Jami</div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* PLANS VIEW */}
      {selectedView === 'plans' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 flex-1">
              <h2 className="text-2xl font-bold mb-2">📋 Haftalik Rejalar</h2>
              <p className="text-gray-600">
                {weekData[0]?.day} {weekData[0]?.month} - {weekData[6]?.day} {weekData[6]?.month}
              </p>
            </div>
            <button
              onClick={() => setShowPlanForm(!showPlanForm)}
              className="ml-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-4 rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg"
            >
              ➕ Yangi Reja
            </button>
          </div>

          {/* New Plan Form */}
          {showPlanForm && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-200 p-6">
              <h3 className="text-xl font-bold mb-4">📝 Yangi Reja Qo'shish</h3>
              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">👤 Mobilograf</label>
                    <select
                      value={newPlan.mobilographer_id}
                      onChange={(e) => setNewPlan({ ...newPlan, mobilographer_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 outline-none"
                      required
                    >
                      <option value="">Tanlang...</option>
                      {mobilographers.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">📁 Loyiha</label>
                    <select
                      value={newPlan.project_id}
                      onChange={(e) => setNewPlan({ ...newPlan, project_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 outline-none"
                      required
                    >
                      <option value="">Tanlang...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">📅 Sana</label>
                    <input
                      type="date"
                      value={newPlan.date}
                      onChange={(e) => setNewPlan({ ...newPlan, date: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">⏰ Deadline</label>
                    <input
                      type="time"
                      value={newPlan.deadline_time}
                      onChange={(e) => setNewPlan({ ...newPlan, deadline_time: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">🎬 Ish turi</label>
                    <select
                      value={newPlan.task_type}
                      onChange={(e) => setNewPlan({ ...newPlan, task_type: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 outline-none"
                    >
                      <option value="montaj">🎬 Montaj</option>
                      <option value="syomka">📹 Syomka</option>
                    </select>
                  </div>

                  {newPlan.task_type === 'montaj' && (
                    <div>
                      <label className="block text-sm font-semibold mb-2">📱 Kontent</label>
                      <select
                        value={newPlan.content_type}
                        onChange={(e) => setNewPlan({ ...newPlan, content_type: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 outline-none"
                      >
                        <option value="post">📄 Post</option>
                        <option value="storis">📱 Storis</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">📝 Tavsif</label>
                  <textarea
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 outline-none"
                    rows={2}
                    placeholder="Qo'shimcha ma'lumot..."
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
                  >
                    ✅ Saqlash
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPlanForm(false)}
                    className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                  >
                    Bekor qilish
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Plans by Day */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekData.map((day, idx) => {
              const dayPlans = weekPlans.filter(p => p.deadline === day.date)
              
              return (
                <div
                  key={idx}
                  className={`rounded-2xl p-4 border-2 ${
                    day.isToday 
                      ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50' 
                      : day.isPast
                        ? 'border-gray-300 bg-gray-50'
                        : 'border-purple-300 bg-purple-50'
                  }`}
                >
                  <div className="text-center mb-3">
                    <div className="text-xs text-gray-500 uppercase">{day.weekday}</div>
                    <div className={`text-3xl font-bold ${
                      day.isToday ? 'text-purple-600' : 'text-gray-800'
                    }`}>
                      {day.day}
                    </div>
                    <div className="text-xs text-gray-500">{day.month}</div>
                  </div>

                  {dayPlans.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-center text-sm font-bold text-purple-600 mb-2">
                        {dayPlans.length} ta reja
                      </div>
                      {dayPlans.map((plan, pIdx) => (
                        <div key={pIdx} className="bg-white border border-purple-200 rounded-lg p-2 text-xs">
                          <div className="font-semibold text-gray-800 truncate" title={plan.projects?.name}>
                            {plan.projects?.name}
                          </div>
                          <div className="text-gray-600 mt-1">
                            {plan.task_type === 'montaj' ? '🎬 Montaj' : '📹 Syomka'}
                            {plan.content_type && ` ${plan.content_type === 'post' ? '📄' : '📱'}`}
                          </div>
                          <div className="text-purple-600 font-semibold mt-1">
                            ⏰ {plan.deadline_time}
                          </div>
                          <div className="text-gray-500 mt-1 truncate" title={plan.mobilographers?.name}>
                            👤 {plan.mobilographers?.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 text-sm py-4">
                      Reja yo'q
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* All Plans List */}
          {weekPlans.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6">
              <h3 className="text-2xl font-bold mb-4">📋 Barcha Rejalar (Tafsilot)</h3>
              <div className="space-y-3">
                {weekPlans.map((plan, idx) => {
                  const planDay = weekData.find(d => d.date === plan.deadline)
                  return (
                    <div key={idx} className="border-2 border-purple-200 rounded-xl p-4 hover:border-purple-400 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">
                            {plan.task_type === 'montaj' ? 
                              plan.content_type === 'post' ? '📄' : '📱'
                            : '📹'}
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">{plan.projects?.name}</h4>
                            <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                              <span>👤 {plan.mobilographers?.name}</span>
                              <span>•</span>
                              <span>
                                {plan.task_type === 'montaj' ? '🎬 Montaj' : '📹 Syomka'}
                                {plan.content_type && ` ${plan.content_type === 'post' ? 'Post' : 'Storis'}`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {planDay?.weekday}, {planDay?.day} {planDay?.month}
                          </div>
                          <div className="text-lg font-bold text-purple-600 mt-1">
                            ⏰ {plan.deadline_time}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
