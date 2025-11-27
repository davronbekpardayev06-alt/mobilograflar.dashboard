'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function CheckInPage() {
  const [mobilographers, setMobilographers] = useState<any[]>([])
  const [todaySessions, setTodaySessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [checkInForm, setCheckInForm] = useState({
    mobilographer_id: '',
    type: 'check_in', // check_in, check_out, lunch_start, lunch_end
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  })

  useEffect(() => {
    fetchData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchTodaySessions()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchMobilographers(),
        fetchTodaySessions()
      ])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const fetchMobilographers = async () => {
    const { data } = await supabase
      .from('mobilographers')
      .select('*')
      .order('name')
    
    setMobilographers(data || [])
  }

  const fetchTodaySessions = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    const { data: sessions } = await supabase
      .from('work_sessions')
      .select(`
        *,
        mobilographers(id, name)
      `)
      .eq('date', today)
    
    // Get current work for each mobilographer
    const { data: records } = await supabase
      .from('records')
      .select(`
        *,
        projects(id, name)
      `)
      .eq('date', today)
      .order('created_at', { ascending: false })
    
    const sessionsWithWork = (sessions || []).map(session => {
      const mobRecords = records?.filter(r => r.mobilographer_id === session.mobilographer_id) || []
      const currentWork = mobRecords[0] // Latest work
      
      return {
        ...session,
        currentWork,
        totalRecords: mobRecords.length
      }
    })
    
    setTodaySessions(sessionsWithWork)
  }

  const calculateDuration = (start: string, end?: string): string => {
    if (!start) return '0s'
    
    const startTime = new Date(`2000-01-01T${start}`)
    const endTime = end ? new Date(`2000-01-01T${end}`) : new Date()
    
    const diff = endTime.getTime() - startTime.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}s ${minutes}d`
    }
    return `${minutes}d`
  }

  const getStatus = (session: any) => {
    if (!session.actual_start) return 'not_started'
    if (session.actual_end) return 'completed'
    if (session.lunch_start && !session.lunch_end) return 'lunch'
    return 'working'
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'not_started': return 'Kelmagan'
      case 'working': return 'Ishlamoqda'
      case 'lunch': return 'Tushlikda'
      case 'completed': return 'Ketdi'
      default: return 'Noma\'lum'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'gray'
      case 'working': return 'green'
      case 'lunch': return 'orange'
      case 'completed': return 'blue'
      default: return 'gray'
    }
  }

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!checkInForm.mobilographer_id) {
      alert('Mobilografni tanlang!')
      return
    }
    
    setSubmitting(true)
    
    try {
      const today = new Date().toISOString().split('T')[0]
      const currentTime = checkInForm.time
      
      // Check if session exists
      const { data: existingSession } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('mobilographer_id', checkInForm.mobilographer_id)
        .eq('date', today)
        .single()
      
      if (checkInForm.type === 'check_in') {
        if (existingSession) {
          alert('Bu mobilograf bugun allaqachon check-in qilgan!')
          setSubmitting(false)
          return
        }
        
        // Create new session
        await supabase
          .from('work_sessions')
          .insert([{
            mobilographer_id: checkInForm.mobilographer_id,
            date: today,
            actual_start: currentTime,
            status: 'in_progress'
          }])
        
        alert('✅ Check-in muvaffaqiyatli!')
      } else if (checkInForm.type === 'check_out') {
        if (!existingSession) {
          alert('Bu mobilograf bugun check-in qilmagan!')
          setSubmitting(false)
          return
        }
        
        // Calculate duration
        const startTime = new Date(`2000-01-01T${existingSession.actual_start}`)
        const endTime = new Date(`2000-01-01T${currentTime}`)
        const diffMs = endTime.getTime() - startTime.getTime()
        const hours = diffMs / (1000 * 60 * 60)
        
        await supabase
          .from('work_sessions')
          .update({
            actual_end: currentTime,
            actual_hours: hours,
            status: 'completed'
          })
          .eq('id', existingSession.id)
        
        alert('✅ Check-out muvaffaqiyatli!')
      } else if (checkInForm.type === 'lunch_start') {
        if (!existingSession) {
          alert('Bu mobilograf bugun check-in qilmagan!')
          setSubmitting(false)
          return
        }
        
        await supabase
          .from('work_sessions')
          .update({
            lunch_start: currentTime
          })
          .eq('id', existingSession.id)
        
        alert('🍽️ Tushlik boshlandi!')
      } else if (checkInForm.type === 'lunch_end') {
        if (!existingSession || !existingSession.lunch_start) {
          alert('Tushlik boshlanmagan!')
          setSubmitting(false)
          return
        }
        
        // Calculate lunch duration
        const lunchStart = new Date(`2000-01-01T${existingSession.lunch_start}`)
        const lunchEnd = new Date(`2000-01-01T${currentTime}`)
        const diffMs = lunchEnd.getTime() - lunchStart.getTime()
        const minutes = Math.floor(diffMs / (1000 * 60))
        
        await supabase
          .from('work_sessions')
          .update({
            lunch_end: currentTime,
            lunch_duration_minutes: minutes
          })
          .eq('id', existingSession.id)
        
        alert('✅ Tushlik tugadi!')
      }
      
      setCheckInForm({
        mobilographer_id: '',
        type: 'check_in',
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      })
      
      fetchTodaySessions()
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
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  const workingNow = todaySessions.filter(s => getStatus(s) === 'working').length
  const onLunch = todaySessions.filter(s => getStatus(s) === 'lunch').length
  const notArrived = mobilographers.length - todaySessions.length
  const finished = todaySessions.filter(s => getStatus(s) === 'completed').length

  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        ⏰ Check-in / Check-out
      </h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">✅</span>
            <div>
              <h3 className="font-bold text-lg">Ishlamoqda</h3>
              <p className="text-xs text-gray-600">Hozir</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-green-600">
            {workingNow}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🍽️</span>
            <div>
              <h3 className="font-bold text-lg">Tushlikda</h3>
              <p className="text-xs text-gray-600">Hozir</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-orange-600">
            {onLunch}
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">❌</span>
            <div>
              <h3 className="font-bold text-lg">Kelmagan</h3>
              <p className="text-xs text-gray-600">Bugun</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-600">
            {notArrived}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🏁</span>
            <div>
              <h3 className="font-bold text-lg">Ketdi</h3>
              <p className="text-xs text-gray-600">Bugun</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-blue-600">
            {finished}
          </div>
        </div>
      </div>

      {/* Check-in Form */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
          <h2 className="text-2xl font-bold">➕ Yangi Check-in/Check-out</h2>
          <p className="text-sm opacity-90 mt-1">{new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <form onSubmit={handleCheckIn} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              👤 Mobilograf
            </label>
            <select
              value={checkInForm.mobilographer_id}
              onChange={(e) => setCheckInForm({ ...checkInForm, mobilographer_id: e.target.value })}
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
              ⏰ Vaqt
            </label>
            <input
              type="time"
              value={checkInForm.time}
              onChange={(e) => setCheckInForm({ ...checkInForm, time: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-700">
              🎯 Harakat turi
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => setCheckInForm({ ...checkInForm, type: 'check_in' })}
                className={`py-4 rounded-xl font-bold transition-all ${
                  checkInForm.type === 'check_in'
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="text-3xl mb-1">✅</div>
                Check-in
              </button>

              <button
                type="button"
                onClick={() => setCheckInForm({ ...checkInForm, type: 'check_out' })}
                className={`py-4 rounded-xl font-bold transition-all ${
                  checkInForm.type === 'check_out'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="text-3xl mb-1">🏁</div>
                Check-out
              </button>

              <button
                type="button"
                onClick={() => setCheckInForm({ ...checkInForm, type: 'lunch_start' })}
                className={`py-4 rounded-xl font-bold transition-all ${
                  checkInForm.type === 'lunch_start'
                    ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="text-3xl mb-1">🍽️</div>
                Tushlik
              </button>

              <button
                type="button"
                onClick={() => setCheckInForm({ ...checkInForm, type: 'lunch_end' })}
                className={`py-4 rounded-xl font-bold transition-all ${
                  checkInForm.type === 'lunch_end'
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="text-3xl mb-1">💼</div>
                Qaytish
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-5 rounded-2xl font-bold text-xl transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-3">
                <span className="animate-spin text-2xl">⏳</span>
                Saqlanmoqda...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                ✅ Saqlash
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Today's Sessions */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <h2 className="text-2xl font-bold">📋 Bugungi Status</h2>
          <p className="text-sm opacity-90 mt-1">Real-time monitoring</p>
        </div>

        <div className="p-6 space-y-4">
          {mobilographers.map((mob) => {
            const session = todaySessions.find(s => s.mobilographer_id === mob.id)
            const status = session ? getStatus(session) : 'not_started'
            const statusLabel = getStatusLabel(status)
            const statusColor = getStatusColor(status)
            
            return (
              <div key={mob.id} className={`border-2 rounded-xl p-4 ${
                statusColor === 'green' ? 'border-green-200 bg-green-50' :
                statusColor === 'orange' ? 'border-orange-200 bg-orange-50' :
                statusColor === 'blue' ? 'border-blue-200 bg-blue-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">👤</div>
                    <div>
                      <h3 className="font-bold text-lg">{mob.name}</h3>
                      <p className={`text-sm font-semibold ${
                        statusColor === 'green' ? 'text-green-600' :
                        statusColor === 'orange' ? 'text-orange-600' :
                        statusColor === 'blue' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {statusLabel}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {session && session.actual_start && (
                      <>
                        <div className="text-sm text-gray-600">
                          ✅ {session.actual_start}
                          {session.actual_end && ` → 🏁 ${session.actual_end}`}
                        </div>
                        {!session.actual_end && (
                          <div className="text-lg font-bold text-gray-700 mt-1">
                            {calculateDuration(session.actual_start)}
                          </div>
                        )}
                        {session.lunch_start && (
                          <div className="text-xs text-orange-600 mt-1">
                            🍽️ {session.lunch_start}
                            {session.lunch_end && ` - ${session.lunch_end} (${session.lunch_duration_minutes}d)`}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {session && session.currentWork && status === 'working' && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-gray-700">Hozir:</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                        {session.currentWork.projects?.name}
                      </span>
                      <span className="text-gray-500">
                        {session.currentWork.type === 'editing' ? '🎬 Montaj' : '📹 Syomka'}
                      </span>
                      {session.currentWork.content_type && (
                        <span className="text-gray-500">
                          ({session.currentWork.content_type === 'post' ? '📄 Post' : '📱 Storis'})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
