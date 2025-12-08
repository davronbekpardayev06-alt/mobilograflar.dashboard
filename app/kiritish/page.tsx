'use client'

import { useState, useEffect } from 'react'
import { supabase, type Task, type Mobilographer, type Project } from '@/lib/supabase'

interface GroupedTask {
  project: any
  mobilographer: any
  tasks: any[]
  totalPost: number
  totalStoris: number
  totalSyomka: number
  totalTahrirlash: number
}

export default function KiritishPage() {
  const [mobilographers, setMobilographers] = useState<Mobilographer[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [groupedTasks, setGroupedTasks] = useState<GroupedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  
  const [filterType, setFilterType] = useState<'today' | 'yesterday' | 'month'>('today')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  
  const [newTask, setNewTask] = useState({
    mobilographer_id: '',
    project_id: '',
    type: 'editing',
    content_type: 'post',
    count: 1,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    start_time: '',
    end_time: '',
    notes: '',
    work_year: new Date().getFullYear(),
    work_month: new Date().getMonth() + 1
  })

  useEffect(() => {
    fetchData()
    loadAvailableYears()
  }, [])

  useEffect(() => {
    fetchTasksByFilter()
  }, [filterType, selectedYear, selectedMonth])

  const loadAvailableYears = async () => {
    try {
      // ✅ UPDATED: Get years from tasks table
      const { data: tasks } = await supabase
        .from('tasks')
        .select('date')
        .order('date', { ascending: false })

      if (!tasks || tasks.length === 0) {
        setAvailableYears([new Date().getFullYear()])
        return
      }

      const years = new Set<number>()
      tasks.forEach(task => {
        if (task.date) {
          const year = new Date(task.date).getFullYear()
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
        .eq('is_active', true)
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

  const fetchTasksByFilter = async () => {
    try {
      const today = new Date()
      let startDate: Date
      let endDate: Date

      if (filterType === 'today') {
        startDate = new Date(today)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(today)
        endDate.setHours(23, 59, 59, 999)
      } else if (filterType === 'yesterday') {
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(today)
        endDate.setDate(today.getDate() - 1)
        endDate.setHours(23, 59, 59, 999)
      } else {
        startDate = new Date(selectedYear, selectedMonth - 1, 1)
        endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)
      }

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // ✅ UPDATED: Get tasks instead of records
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          *,
          mobilographers(id, name),
          projects(id, name)
        `)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('created_at', { ascending: false })

      groupTasks(tasksData || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const groupTasks = (tasks: any[]) => {
    const grouped = new Map<string, GroupedTask>()

    tasks.forEach(task => {
      const key = `${task.project_id}-${task.mobilographer_id}`
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          project: task.projects,
          mobilographer: task.mobilographers,
          tasks: [],
          totalPost: 0,
          totalStoris: 0,
          totalSyomka: 0,
          totalTahrirlash: 0
        })
      }

      const group = grouped.get(key)!
      group.tasks.push(task)

      const count = task.count || 1
      
      // ✅ UPDATED: Handle both 'editing'/'montaj' and 'filming'/'syomka'
      if (task.task_type === 'editing' || task.task_type === 'montaj') {
        if (task.content_type === 'post') {
          group.totalPost += count
        } else if (task.content_type === 'storis') {
          group.totalStoris += count
        }
      } else if (task.task_type === 'filming' || task.task_type === 'syomka') {
        group.totalSyomka += count
      } else if (task.task_type === 'tahrirlash') {
        group.totalTahrirlash += count
      }
    })

    setGroupedTasks(Array.from(grouped.values()))
  }

  const calculateDuration = (start: string, end: string): { minutes: number, text: string } => {
    if (!start || !end) return { minutes: 0, text: '' }
    
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)
    
    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
    
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60
    }
    
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    let text = ''
    if (hours > 0 && minutes > 0) {
      text = `${hours} soat ${minutes} daqiqa`
    } else if (hours > 0) {
      text = `${hours} soat`
    } else {
      text = `${minutes} daqiqa`
    }
    
    return { minutes: totalMinutes, text }
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

  const getMonthName = (monthNum: number) => {
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ]
    return months[monthNum - 1]
  }

  const getFilterLabel = () => {
    if (filterType === 'today') return 'Bugun'
    if (filterType === 'yesterday') return 'Kecha'
    return `${getMonthName(selectedMonth)} ${selectedYear}`
  }

  const handleDelete = async (taskId: string, recordId: string | null) => {
    if (deleteConfirm !== taskId) {
      setDeleteConfirm(taskId)
      setTimeout(() => setDeleteConfirm(null), 3000)
      return
    }

    try {
      // ✅ Delete from tasks table
      await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      // ✅ Also delete from records table if record_id exists (backward compatibility)
      if (recordId) {
        const { data: videos } = await supabase
          .from('videos')
          .select('*')
          .eq('record_id', recordId)

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
          .eq('id', recordId)
      }

      alert('✅ Yozuv o\'chirildi!')
      setDeleteConfirm(null)
      fetchTasksByFilter()
    } catch (error) {
      console.error('Delete error:', error)
      alert('❌ Xatolik: ' + (error as Error).message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newTask.mobilographer_id || !newTask.project_id || newTask.count < 1) {
      alert('Iltimos, barcha majburiy maydonlarni to\'ldiring!')
      return
    }

    if (!newTask.start_time || !newTask.end_time) {
      const typeName = newTask.type === 'editing' ? 'Montaj' : newTask.type === 'filming' ? 'Syomka' : 'Tahrirlash'
      alert(`${typeName} uchun boshlangan va tugagan vaqtni kiriting!`)
      return
    }

    setSubmitting(true)

    try {
      let durationMinutes = null
      if (newTask.start_time && newTask.end_time) {
        const duration = calculateDuration(newTask.start_time, newTask.end_time)
        durationMinutes = duration.minutes
      }

      // ✅ Map type names for tasks table
      const taskType = newTask.type === 'filming' ? 'syomka' : newTask.type === 'editing' ? 'montaj' : 'tahrirlash'

      // ✅ STEP 1: Insert into records table (backward compatibility)
      const { data: createdRecord, error: recordError } = await supabase
        .from('records')
        .insert([{
          mobilographer_id: newTask.mobilographer_id,
          project_id: newTask.project_id,
          type: newTask.type,
          content_type: newTask.type === 'editing' ? newTask.content_type : null,
          date: newTask.date,
          time: newTask.time || null,
          start_time: newTask.start_time || null,
          end_time: newTask.end_time || null,
          duration_minutes: durationMinutes,
          notes: newTask.notes || null,
          count: newTask.count
        }])
        .select()
        .single()

      if (recordError) throw recordError
      const recordId = createdRecord.id

      // ✅ STEP 2: Insert into tasks table (new system)
      const { data: createdTask, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          mobilographer_id: newTask.mobilographer_id,
          project_id: newTask.project_id,
          task_type: taskType,
          content_type: newTask.type === 'editing' ? newTask.content_type : null,
          date: newTask.date,
          start_time: newTask.start_time || null,
          end_time: newTask.end_time || null,
          duration_minutes: durationMinutes,
          notes: newTask.notes || null,
          count: newTask.count,
          status: 'completed',
          record_id: recordId
        }])
        .select()
        .single()

      if (taskError) throw taskError

      // Create work_date from selected work_year and work_month
      const workDate = new Date(newTask.work_year, newTask.work_month - 1, 15)

      if (newTask.type === 'editing') {
        const { data: pendingVideos } = await supabase
          .from('videos')
          .select('id')
          .eq('project_id', newTask.project_id)
          .eq('editing_status', 'pending')
          .is('record_id', null)
          .limit(newTask.count)

        if (pendingVideos && pendingVideos.length > 0) {
          const videoIds = pendingVideos.map(v => v.id)
          await supabase
            .from('videos')
            .update({ 
              editing_status: 'completed',
              content_type: newTask.content_type,
              task_type: 'montaj',
              record_id: recordId,
              work_date: workDate.toISOString()
            })
            .in('id', videoIds)
        } else {
          const videosToInsert = []
          for (let i = 0; i < newTask.count; i++) {
            videosToInsert.push({
              project_id: newTask.project_id,
              name: `Video ${Date.now()}-${i + 1}`,
              filming_status: 'completed',
              editing_status: 'completed',
              content_type: newTask.content_type,
              task_type: 'montaj',
              record_id: recordId,
              work_date: workDate.toISOString()
            })
          }
          await supabase.from('videos').insert(videosToInsert)
        }
      }

      if (newTask.type === 'filming') {
        const videosToInsert = []
        for (let i = 0; i < newTask.count; i++) {
          videosToInsert.push({
            project_id: newTask.project_id,
            name: `Video ${Date.now()}-${i + 1}`,
            filming_status: 'completed',
            editing_status: 'pending',
            content_type: 'post',
            task_type: 'syomka',
            record_id: recordId,
            work_date: workDate.toISOString()
          })
        }
        await supabase.from('videos').insert(videosToInsert)
      }

      if (newTask.type === 'tahrirlash') {
        const videosToInsert = []
        for (let i = 0; i < newTask.count; i++) {
          videosToInsert.push({
            project_id: newTask.project_id,
            name: `Video ${Date.now()}-${i + 1}`,
            filming_status: 'completed',
            editing_status: 'completed',
            content_type: null,
            task_type: 'tahrirlash',
            record_id: recordId,
            work_date: workDate.toISOString()
          })
        }
        await supabase.from('videos').insert(videosToInsert)
      }

      const durationText = durationMinutes ? ` (${formatDuration(durationMinutes)})` : ''
      const typeText = newTask.type === 'editing' 
        ? (newTask.content_type === 'post' ? 'post' : 'storis') 
        : newTask.type === 'tahrirlash' 
        ? 'tahrirlash (qaytarilgan)' 
        : 'syomka'
      
      alert(`✅ ${newTask.count} ta ${typeText} muvaffaqiyatli qo'shildi!${durationText}\n\n📅 ${getMonthName(newTask.work_month)} ${newTask.work_year} uchun saqlandi!`)
      
      setNewTask({
        mobilographer_id: '',
        project_id: '',
        type: 'editing',
        content_type: 'post',
        count: 1,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        start_time: '',
        end_time: '',
        notes: '',
        work_year: new Date().getFullYear(),
        work_month: new Date().getMonth() + 1
      })
      
      fetchTasksByFilter()
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

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Ish Haqida Ma'lumot</h2>
                <p className="text-sm opacity-90 mt-1">{new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* ... Rest of the form stays EXACTLY THE SAME ... */}
            {/* I'm keeping all the form fields identical to maintain user experience */}
            
            {/* The form submission logic above has been updated to use tasks table */}
            {/* All other JSX below this comment remains unchanged */}

{/* Form continues with all original fields... */}
<div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  📅 Sana
                </label>
                <input
                  type="date"
                  value={newTask.date}
                  onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  ⏰ Vaqt
                </label>
                <input
                  type="time"
                  value={newTask.time}
                  onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 rounded-2xl p-6">
              <label className="block text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                📅 Qaysi oy uchun?
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Yil
                  </label>
                  <select
                    value={newTask.work_year}
                    onChange={(e) => setNewTask({ ...newTask, work_year: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none font-semibold text-lg"
                  >
                    <option value={2024}>2024 yil</option>
                    <option value={2025}>2025 yil</option>
                    <option value={2026}>2026 yil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Oy
                  </label>
                  <select
                    value={newTask.work_month}
                    onChange={(e) => setNewTask({ ...newTask, work_month: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-semibold text-lg"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                      <option key={month} value={month}>{getMonthName(month)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 bg-white rounded-xl p-4 border-2 border-blue-200">
                <p className="text-center text-lg font-bold text-gray-800">
                  📊 Tanlandi: <span className="text-blue-600">{getMonthName(newTask.work_month)} {newTask.work_year}</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                👤 Kim? (Mobilograf)
              </label>
              <select
                value={newTask.mobilographer_id}
                onChange={(e) => setNewTask({ ...newTask, mobilographer_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                required
              >
                <option value="">Tanlang...</option>
                {mobilographers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                📁 Loyiha?
              </label>
              <select
                value={newTask.project_id}
                onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
                required
              >
                <option value="">Tanlang...</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mobilographers?.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-700">
                🎬 Ish turi
              </label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setNewTask({ ...newTask, type: 'filming' })}
                  className={`py-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                    newTask.type === 'filming'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-2xl scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-4xl mb-2">📹</div>
                  Syomka
                </button>
                <button
                  type="button"
                  onClick={() => setNewTask({ ...newTask, type: 'editing' })}
                  className={`py-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                    newTask.type === 'editing'
                      ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-2xl scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-4xl mb-2">🎬</div>
                  Montaj
                </button>
                <button
                  type="button"
                  onClick={() => setNewTask({ ...newTask, type: 'tahrirlash' })}
                  className={`py-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                    newTask.type === 'tahrirlash'
                      ? 'bg-gradient-to-br from-yellow-500 to-amber-500 text-white shadow-2xl scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-4xl mb-2">✂️</div>
                  Tahrirlash
                  <div className="text-xs mt-1 opacity-90">Mijoz qaytardi</div>
                </button>
              </div>
            </div>

            {newTask.type === 'editing' && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">
                    📱 Kontent turi
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setNewTask({ ...newTask, content_type: 'post' })}
                      className={`py-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                        newTask.content_type === 'post'
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-2xl scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="text-4xl mb-2">📄</div>
                      Post
                      <div className="text-xs mt-1 opacity-90">Loyiha maqsadiga hisoblanadi</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTask({ ...newTask, content_type: 'storis' })}
                      className={`py-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                        newTask.content_type === 'storis'
                          ? 'bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-2xl scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="text-4xl mb-2">📱</div>
                      Storis
                      <div className="text-xs mt-1 opacity-90">Faqat statistikada</div>
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-6">
                  <label className="block text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                    ⏱️ Montaj vaqti (Majburiy)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        🟢 Boshlangan vaqt
                      </label>
                      <input
                        type="time"
                        value={newTask.start_time}
                        onChange={(e) => setNewTask({ ...newTask, start_time: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-lg font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        🔴 Tugagan vaqt
                      </label>
                      <input
                        type="time"
                        value={newTask.end_time}
                        onChange={(e) => setNewTask({ ...newTask, end_time: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-lg font-semibold"
                        required
                      />
                    </div>
                  </div>
                  {newTask.start_time && newTask.end_time && (
                    <div className="mt-4 bg-white rounded-xl p-4 border-2 border-blue-200">
                      <p className="text-center text-lg font-bold text-gray-800">
                        ⏳ Jami: <span className="text-blue-600">{calculateDuration(newTask.start_time, newTask.end_time).text}</span>
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {newTask.type === 'filming' && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-6">
                <label className="block text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                  ⏱️ Syomka vaqti (Majburiy)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      🟢 Boshlangan vaqt
                    </label>
                    <input
                      type="time"
                      value={newTask.start_time}
                      onChange={(e) => setNewTask({ ...newTask, start_time: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-lg font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      🔴 Tugagan vaqt
                    </label>
                    <input
                      type="time"
                      value={newTask.end_time}
                      onChange={(e) => setNewTask({ ...newTask, end_time: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-lg font-semibold"
                      required
                    />
                  </div>
                </div>
                {newTask.start_time && newTask.end_time && (
                  <div className="mt-4 bg-white rounded-xl p-4 border-2 border-blue-200">
                    <p className="text-center text-lg font-bold text-gray-800">
                      ⏳ Jami: <span className="text-blue-600">{calculateDuration(newTask.start_time, newTask.end_time).text}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {newTask.type === 'tahrirlash' && (
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-2xl p-6">
                <label className="block text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                  ⏱️ Tahrirlash vaqti (Majburiy)
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Mijoz qaytargan video uchun o'zgartirish vaqti. <strong>Loyiha maqsadiga hisoblanmaydi,</strong> lekin vaqt/ball statistikada ko'rinadi.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      🟢 Boshlangan vaqt
                    </label>
                    <input
                      type="time"
                      value={newTask.start_time}
                      onChange={(e) => setNewTask({ ...newTask, start_time: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-yellow-200 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 transition-all outline-none text-lg font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      🔴 Tugagan vaqt
                    </label>
                    <input
                      type="time"
                      value={newTask.end_time}
                      onChange={(e) => setNewTask({ ...newTask, end_time: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-yellow-200 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 transition-all outline-none text-lg font-semibold"
                      required
                    />
                  </div>
                </div>
                {newTask.start_time && newTask.end_time && (
                  <div className="mt-4 bg-white rounded-xl p-4 border-2 border-yellow-200">
                    <p className="text-center text-lg font-bold text-gray-800">
                      ⏳ Jami: <span className="text-yellow-600">{calculateDuration(newTask.start_time, newTask.end_time).text}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl p-6">
              <label className="block text-lg font-bold mb-3 text-gray-800">
                🔢 Nechta {
                  newTask.type === 'editing' 
                    ? (newTask.content_type === 'post' ? 'post' : 'storis') 
                    : newTask.type === 'tahrirlash' 
                    ? 'video' 
                    : 'video'
                } {
                  newTask.type === 'editing' 
                    ? 'montaj qilindi' 
                    : newTask.type === 'tahrirlash' 
                    ? 'tahrirlandi (qaytarilgan)' 
                    : 'suratga olindi'
                }?
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setNewTask({ ...newTask, count: Math.max(1, newTask.count - 1) })}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-xl text-3xl font-bold transition transform hover:scale-110"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newTask.count}
                  onChange={(e) => setNewTask({ ...newTask, count: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="flex-1 text-center text-6xl font-bold py-6 rounded-2xl border-4 border-yellow-400 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200 transition-all outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setNewTask({ ...newTask, count: newTask.count + 1 })}
                  className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-xl text-3xl font-bold transition transform hover:scale-110"
                >
                  +
                </button>
              </div>
              <p className="text-center text-lg font-semibold text-gray-700 mt-4">
                {newTask.count} ta {
                  newTask.type === 'editing' 
                    ? (newTask.content_type === 'post' ? '📄 post' : '📱 storis') 
                    : newTask.type === 'tahrirlash' 
                    ? '✂️ video (qaytarilgan)' 
                    : '📹 video'
                }
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                📝 Izoh (ixtiyoriy)
              </label>
              <textarea
                value={newTask.notes}
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                rows={3}
                placeholder="Qo'shimcha ma'lumot..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-5 rounded-2xl font-bold text-xl transition-all duration-200 transform hover:scale-105 shadow-2xl hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-spin text-2xl">⏳</span>
                  Yuklanmoqda...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  ✅ {newTask.count} ta Saqlash ({getMonthName(newTask.work_month)} {newTask.work_year})
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Kiritilgan Ishlar ro'yxati */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">📋 Kiritilgan Ishlar</h2>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setFilterType('today')}
              className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                filterType === 'today'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📅 Bugun
            </button>

            <button
              onClick={() => setFilterType('yesterday')}
              className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                filterType === 'yesterday'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📅 Kecha
            </button>

            <button
              onClick={() => setFilterType('month')}
              className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                filterType === 'month'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Oy bo'yicha
            </button>
          </div>

          {filterType === 'month' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
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
            </div>
          )}

          <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <div>
                <p className="text-sm text-gray-600 font-medium">Ko'rsatilgan davr:</p>
                <p className="text-xl font-bold text-gray-800">{getFilterLabel()}</p>
              </div>
            </div>
          </div>
        </div>

        {groupedTasks.length > 0 ? (
          <div className="space-y-4">
            {groupedTasks.map((group, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{group.project?.name}</h3>
                    <p className="text-sm text-gray-600">{group.mobilographer?.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-700">
                      {group.tasks.length} marta
                    </div>
                    <div className="text-xs text-gray-500">jami yozuv</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
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
                  {group.totalTahrirlash > 0 && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 text-center">
                      <div className="text-3xl font-bold text-yellow-600">{group.totalTahrirlash}</div>
                      <div className="text-xs text-yellow-700">✂️ Tahrirlash</div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {group.tasks.map(task => (
                    <div key={task.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {(task.task_type === 'editing' || task.task_type === 'montaj')
                            ? task.content_type === 'post' ? '📄' : '📱'
                            : task.task_type === 'tahrirlash' ? '✂️' : '📹'}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {task.count || 1}x {
                              (task.task_type === 'editing' || task.task_type === 'montaj')
                                ? task.content_type === 'post' ? 'Post' : 'Storis'
                                : task.task_type === 'tahrirlash' ? 'Tahrirlash' : 'Syomka'
                            }
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(task.date).toLocaleDateString('uz-UZ', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          {task.start_time && task.end_time && (
                            <p className="text-xs text-blue-600 font-semibold mt-1">
                              ⏱️ {task.start_time} - {task.end_time} ({formatDuration(task.duration_minutes)})
                            </p>
                          )}
                          {task.notes && (
                            <p className="text-xs text-gray-600 mt-1">{task.notes}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(task.id, task.record_id)}
                        className={`transition-all ${
                          deleteConfirm === task.id
                            ? 'bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm'
                            : 'text-red-500 hover:text-red-700 text-2xl'
                        }`}
                      >
                        {deleteConfirm === task.id ? 'Tasdiqlash?' : '🗑️'}
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
            <p className="text-gray-500 text-xl font-medium mb-2">{getFilterLabel()} uchun ma'lumot yo'q</p>
            <p className="text-gray-400 text-sm">Yangi ish kiritganingizda bu yerda ko'rinadi</p>
          </div>
        )}
      </div>
    </div>
  )
}
