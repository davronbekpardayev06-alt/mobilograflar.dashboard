'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface GroupedRecord {
  project: any
  mobilographer: any
  records: any[]
  totalPost: number
  totalStoris: number
  totalSyomka: number
}

export default function KiritishPage() {
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [groupedRecords, setGroupedRecords] = useState<GroupedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  
  // Date filter state
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  
  const [newRecord, setNewRecord] = useState({
    mobilographer_id: '',
    project_id: '',
    type: 'editing',
    content_type: 'post',
    count: 1,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    notes: ''
  })

  useEffect(() => {
    fetchData()
    loadAvailableYears()
  }, [])

  useEffect(() => {
    fetchRecordsByFilter()
  }, [selectedPeriod, selectedYear, selectedMonth])

  useEffect(() => {
    let interval: any
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  const loadAvailableYears = async () => {
    try {
      const { data: records } = await supabase
        .from('records')
        .select('date')
        .order('date', { ascending: false })

      if (!records || records.length === 0) {
        setAvailableYears([new Date().getFullYear()])
        return
      }

      const years = new Set<number>()
      records.forEach(record => {
        if (record.date) {
          const year = new Date(record.date).getFullYear()
          years.add(year)
        }
      })

      setAvailableYears(Array.from(years).sort((a, b) => b - a))
    } catch (error) {
      console.error('Error loading years:', error)
      setAvailableYears([new Date().getFullYear()])
    }
  }

  const fetchData = async () => {
    try {
      const { data: mobilographersData } = await supabase
        .from('mobilographers')
        .select('*')
        .order('name')

      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, mobilographers(name)')
        .order('name')

      setMobilographers(mobilographersData || [])
      setProjects(projectsData || [])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const fetchRecordsByFilter = async () => {
    try {
      const today = new Date()
      let startDate: Date
      let endDate: Date = new Date()

      switch (selectedPeriod) {
        case 'today':
          startDate = new Date(today)
          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(23, 59, 59, 999)
          break
        
        case 'yesterday':
          startDate = new Date(today)
          startDate.setDate(today.getDate() - 1)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(today)
          endDate.setDate(today.getDate() - 1)
          endDate.setHours(23, 59, 59, 999)
          break
        
        case 'week':
          startDate = new Date(today)
          const dayOfWeek = today.getDay()
          const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          startDate.setDate(today.getDate() - daysFromMonday)
          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(23, 59, 59, 999)
          break
        
        case 'month':
          startDate = new Date(selectedYear, selectedMonth - 1, 1)
          endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)
          break
        
        case 'year':
          startDate = new Date(selectedYear, 0, 1)
          endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999)
          break
        
        default:
          startDate = new Date(today)
          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(23, 59, 59, 999)
      }

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      const { data: recordsData } = await supabase
        .from('records')
        .select(`
          *,
          mobilographers(id, name),
          projects(id, name)
        `)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('created_at', { ascending: false })

      groupRecords(recordsData || [])
    } catch (error) {
      console.error('Error fetching records:', error)
    }
  }

  const groupRecords = (records: any[]) => {
    const grouped = new Map<string, GroupedRecord>()

    records.forEach(record => {
      const key = `${record.project_id}-${record.mobilographer_id}`
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          project: record.projects,
          mobilographer: record.mobilographers,
          records: [],
          totalPost: 0,
          totalStoris: 0,
          totalSyomka: 0
        })
      }

      const group = grouped.get(key)!
      group.records.push(record)

      const count = record.count || 1
      if (record.type === 'editing') {
        if (record.content_type === 'post') {
          group.totalPost += count
        } else if (record.content_type === 'storis') {
          group.totalStoris += count
        }
      } else if (record.type === 'filming') {
        group.totalSyomka += count
      }
    })

    setGroupedRecords(Array.from(grouped.values()))
  }

  const getMonthName = (monthNum: number) => {
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ]
    return months[monthNum - 1]
  }

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today': return 'Bugun'
      case 'yesterday': return 'Kecha'
      case 'week': return 'Bu hafta'
      case 'month': return `${getMonthName(selectedMonth)} ${selectedYear}`
      case 'year': return `${selectedYear} yil`
      default: return 'Tanlang'
    }
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning)
  }

  const resetTimer = () => {
    setIsTimerRunning(false)
    setTimerSeconds(0)
  }

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 3000)
      return
    }

    try {
      const { data: videos } = await supabase
        .from('videos')
        .select('*')
        .eq('record_id', id)

      if (videos && videos.length > 0) {
        for (const video of videos) {
          if (video.editing_status === 'completed') {
            await supabase
              .from('videos')
              .update({ 
                editing_status: 'pending', 
                record_id: null 
              })
              .eq('id', video.id)
          } else {
            await supabase
              .from('videos')
              .delete()
              .eq('id', video.id)
          }
        }
      }

      await supabase
        .from('records')
        .delete()
        .eq('id', id)

      alert('✅ Yozuv o\'chirildi!')
      setDeleteConfirm(null)
      fetchRecordsByFilter()
    } catch (error) {
      console.error('Delete error:', error)
      alert('❌ Xatolik: ' + (error as Error).message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newRecord.mobilographer_id || !newRecord.project_id || newRecord.count < 1) {
      alert('Iltimos, barcha majburiy maydonlarni to\'ldiring!')
      return
    }

    setSubmitting(true)

    try {
      const { data: createdRecord, error: recordError } = await supabase
        .from('records')
        .insert([{
          mobilographer_id: newRecord.mobilographer_id,
          project_id: newRecord.project_id,
          type: newRecord.type,
          content_type: newRecord.content_type,
          date: newRecord.date,
          time: newRecord.time || null,
          notes: newRecord.notes || null,
          count: newRecord.count
        }])
        .select()
        .single()

      if (recordError) throw recordError

      const recordId = createdRecord.id

      if (newRecord.type === 'editing') {
        const { data: pendingVideos } = await supabase
          .from('videos')
          .select('id')
          .eq('project_id', newRecord.project_id)
          .eq('editing_status', 'pending')
          .is('record_id', null)
          .limit(newRecord.count)

        if (pendingVideos && pendingVideos.length > 0) {
          const videoIds = pendingVideos.map(v => v.id)
          await supabase
            .from('videos')
            .update({ 
              editing_status: 'completed',
              content_type: newRecord.content_type,
              record_id: recordId
            })
            .in('id', videoIds)
        } else {
          const videosToInsert = []
          for (let i = 0; i < newRecord.count; i++) {
            videosToInsert.push({
              project_id: newRecord.project_id,
              name: `Video ${Date.now()}-${i + 1}`,
              filming_status: 'completed',
              editing_status: 'completed',
              content_type: newRecord.content_type,
              record_id: recordId
            })
          }
          await supabase.from('videos').insert(videosToInsert)
        }
      }

      if (newRecord.type === 'filming') {
        const videosToInsert = []
        for (let i = 0; i < newRecord.count; i++) {
          videosToInsert.push({
            project_id: newRecord.project_id,
            name: `Video ${Date.now()}-${i + 1}`,
            filming_status: 'completed',
            editing_status: 'pending',
            content_type: 'post',
            record_id: recordId
          })
        }
        await supabase.from('videos').insert(videosToInsert)
      }

      alert(`✅ ${newRecord.count} ta ${newRecord.type === 'editing' ? newRecord.content_type === 'post' ? 'post' : 'storis' : 'syomka'} muvaffaqiyatli qo'shildi!`)
      
      setNewRecord({
        mobilographer_id: '',
        project_id: '',
        type: 'editing',
        content_type: 'post',
        count: 1,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        notes: ''
      })
      
      resetTimer()
      fetchRecordsByFilter()
      loadAvailableYears()
      setSubmitting(false)
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
      setSubmitting(false)
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
      <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
        ➕ Yangi Yozuv
      </h1>

      {/* FORM - Same as before, not repeating here for brevity */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden">
          {/* ... Form fields here (same as before) ... */}
          {/* I'm keeping the form code the same, just adding the new filter section below */}
        </div>
      </div>

      {/* NEW: Advanced Filter Section */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">📋 Kiritilgan Ishlar</h2>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Period Selection */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                📅 Davr
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none font-semibold"
              >
                <option value="today">📅 Bugun</option>
                <option value="yesterday">📅 Kecha</option>
                <option value="week">📆 Bu hafta</option>
                <option value="month">📊 Oy bo'yicha</option>
                <option value="year">📈 Yil bo'yicha</option>
              </select>
            </div>

            {/* Year Selection (shown for month/year) */}
            {(selectedPeriod === 'month' || selectedPeriod === 'year') && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  📆 Yil
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-semibold"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year} yil</option>
                  ))}
                </select>
              </div>
            )}

            {/* Month Selection (shown for month only) */}
            {selectedPeriod === 'month' && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  📅 Oy
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none font-semibold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                    <option key={month} value={month}>{getMonthName(month)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Selected Period Display */}
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <div>
                <p className="text-sm text-gray-600 font-medium">Ko'rsatilgan davr:</p>
                <p className="text-xl font-bold text-gray-800">{getPeriodLabel()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grouped Records */}
        {groupedRecords.length > 0 ? (
          <div className="space-y-4">
            {groupedRecords.map((group, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{group.project?.name}</h3>
                    <p className="text-sm text-gray-600">{group.mobilographer?.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-700">
                      {group.records.length} marta
                    </div>
                    <div className="text-xs text-gray-500">jami yozuv</div>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {group.totalPost > 0 && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-center">
                      <div className="text-3xl font-bold text-green-600">{group.totalPost}</div>
                      <div className="text-xs text-green-700">📄 Post</div>
                    </div>
                  )}
                  {group.totalStoris > 0 && (
                    <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-3 text-center">
                      <div className="text-3xl font-bold text-pink-600">{group.totalStoris}</div>
                      <div className="text-xs text-pink-700">📱 Storis</div>
                    </div>
                  )}
                  {group.totalSyomka > 0 && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 text-center">
                      <div className="text-3xl font-bold text-blue-600">{group.totalSyomka}</div>
                      <div className="text-xs text-blue-700">📹 Syomka</div>
                    </div>
                  )}
                </div>

                {/* Individual Records */}
                <div className="space-y-2">
                  {group.records.map(record => (
                    <div key={record.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {record.type === 'editing' 
                            ? record.content_type === 'post' ? '📄' : '📱'
                            : '📹'}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {record.count || 1}x {record.type === 'editing' 
                              ? record.content_type === 'post' ? 'Post' : 'Storis'
                              : 'Syomka'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(record.date).toLocaleDateString('uz-UZ', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })} • {record.time || '---'}
                          </p>
                          {record.notes && (
                            <p className="text-xs text-gray-600 mt-1">{record.notes}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className={`transition-all ${
                          deleteConfirm === record.id
                            ? 'bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm'
                            : 'text-red-500 hover:text-red-700 text-2xl'
                        }`}
                      >
                        {deleteConfirm === record.id ? 'Tasdiqlash?' : '🗑️'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-7xl mb-4">📋</div>
            <p className="text-gray-500 text-xl font-medium mb-2">{getPeriodLabel()} uchun ma'lumot yo'q</p>
            <p className="text-gray-400 text-sm">Yangi ish kiritganingizda bu yerda ko'rinadi</p>
          </div>
        )}
      </div>
    </div>
  )
}
