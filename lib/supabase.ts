import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ==========================================
// TYPESCRIPT TYPES - UPDATED FOR NEW SCHEMA
// ==========================================

export type Mobilographer = {
  id: string
  name: string
  is_active?: boolean
  created_at: string
}

export type Project = {
  id: string
  name: string
  mobilographer_id: string
  monthly_target: number
  created_at: string
  mobilographers?: Mobilographer
  videos?: Video[]
  tasks?: Task[]
}

export type Video = {
  id: string
  project_id: string
  name: string
  deadline: string | null
  filming_status: 'pending' | 'in_progress' | 'completed'
  editing_status: 'pending' | 'in_progress' | 'completed'
  content_type?: 'post' | 'storis' | null
  work_date?: string | null
  task_type?: string | null
  record_id?: string | null
  created_at: string
  projects?: Project
}

// ✅ OLD RECORD TYPE (Renamed to avoid TypeScript conflict)
export type WorkRecord = {
  id: string
  mobilographer_id: string
  project_id: string
  video_id?: string | null
  type: 'filming' | 'editing' | 'tahrirlash'
  content_type?: 'post' | 'storis' | null
  count: number
  date: string
  time?: string | null
  start_time?: string | null
  end_time?: string | null
  duration_minutes?: number | null
  notes?: string | null
  created_at: string
  mobilographers?: Mobilographer
  projects?: Project
  videos?: Video
}

// ✅ NEW TASK TYPE (Primary data model)
export type Task = {
  id: string
  session_id?: string | null
  mobilographer_id: string
  project_id: string
  date: string
  start_time?: string | null
  end_time?: string | null
  duration_minutes?: number | null
  task_type: 'editing' | 'filming' | 'tahrirlash' | 'montaj' | 'syomka' | 'break' | 'other'
  content_type?: 'post' | 'storis' | null
  count: number
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  record_id?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  mobilographers?: Mobilographer
  projects?: Project
}

export type WorkSession = {
  id: string
  mobilographer_id: string
  date: string
  planned_start: string
  planned_end: string
  planned_hours: number
  actual_start?: string | null
  actual_end?: string | null
  actual_hours?: number | null
  status: string
  notes?: string | null
  created_at: string
  updated_at: string
  mobilographers?: Mobilographer
  tasks?: Task[]
}

export type DailyWorkload = {
  id: string
  mobilographer_id: string
  date: string
  total_tasks: number
  completed_tasks: number
  total_hours: number
  workload_status: string
  created_at: string
  updated_at: string
  mobilographers?: Mobilographer
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Format duration from minutes to human-readable string
 */
export const formatDuration = (minutes: number | null | undefined): string => {
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

/**
 * Format time from HH:MM:SS to HH:MM
 */
export const formatTime = (time: string | null | undefined): string => {
  if (!time) return '-'
  return time.substring(0, 5)
}

/**
 * Get task type label in Uzbek
 */
export const getTaskTypeLabel = (taskType: string): string => {
  const labels: { [key: string]: string } = {
    'editing': 'Montaj',
    'montaj': 'Montaj',
    'filming': 'Syomka',
    'syomka': 'Syomka',
    'tahrirlash': 'Tahrirlash',
    'break': 'Tanaffus',
    'other': 'Boshqa'
  }
  return labels[taskType] || taskType
}

/**
 * Get content type label in Uzbek
 */
export const getContentTypeLabel = (contentType: string | null | undefined): string => {
  if (!contentType) return '-'
  const labels: { [key: string]: string } = {
    'post': 'Post',
    'storis': 'Storis'
  }
  return labels[contentType] || contentType
}

/**
 * Get status label in Uzbek
 */
export const getStatusLabel = (status: string): string => {
  const labels: { [key: string]: string } = {
    'pending': 'Kutilmoqda',
    'in_progress': 'Jarayonda',
    'completed': 'Tugallangan',
    'cancelled': 'Bekor qilingan'
  }
  return labels[status] || status
}

/**
 * Calculate total duration from tasks
 */
export const calculateTotalDuration = (tasks: Task[]): number => {
  return tasks.reduce((total, task) => total + (task.duration_minutes || 0), 0)
}

/**
 * Filter tasks by date
 */
export const filterTasksByDate = (tasks: Task[], date: string): Task[] => {
  return tasks.filter(task => task.date === date)
}

/**
 * Filter tasks by mobilographer
 */
export const filterTasksByMobilographer = (tasks: Task[], mobilographerId: string): Task[] => {
  return tasks.filter(task => task.mobilographer_id === mobilographerId)
}

/**
 * Get tasks count by type
 */
export const getTasksCountByType = (tasks: Task[], taskType: string): number => {
  return tasks.filter(task => task.task_type === taskType).length
}

/**
 * Get completed tasks count
 */
export const getCompletedTasksCount = (tasks: Task[]): number => {
  return tasks.filter(task => task.status === 'completed').length
}

/**
 * Format date to Uzbek locale
 */
export const formatDateUz = (dateString: string): string => {
  const date = new Date(dateString)
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ]
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}
