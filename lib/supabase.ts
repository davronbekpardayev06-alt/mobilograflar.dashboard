import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TypeScript types
export type Mobilographer = {
  id: string
  name: string
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
}

export type Video = {
  id: string
  project_id: string
  name: string
  deadline: string | null
  filming_status: 'pending' | 'in_progress' | 'completed'
  editing_status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  projects?: Project
}

export type Record = {
  id: string
  mobilographer_id: string
  project_id: string
  video_id: string | null
  type: 'filming' | 'editing'
  date: string
  time: string | null
  notes: string | null
  created_at: string
  mobilographers?: Mobilographer
  projects?: Project
  videos?: Video
}
