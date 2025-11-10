import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET() {
  try {
    // Ma'lumotlarni olish
    const { data: records } = await supabase
      .from('records')
      .select(`
        *,
        mobilographers(name),
        projects(name)
      `)
      .order('date', { ascending: false })

    const { data: projects } = await supabase
      .from('projects')
      .select(`
        *,
        mobilographers(name),
        videos(id, editing_status)
      `)

    // CSV yaratish
    let csv = 'MOBILOGRAFLAR HISOBOTI\n\n'
    
    // Loyihalar bo'yicha
    csv += 'LOYIHALAR PROGRESSI\n'
    csv += 'Loyiha,Mobilograf,Tugallandi,Maqsad,Progress\n'
    
    projects?.forEach((project: any) => {
      const completed = project.videos?.filter((v: any) => 
        v.editing_status === 'completed'
      ).length || 0
      const target = project.monthly_target || 12
      const progress = Math.round((completed / target) * 100)
      
      csv += `"${project.name}","${project.mobilographers?.name}",${completed},${target},${progress}%\n`
    })
    
    csv += '\n\nKUNLIK FAOLIYAT\n'
    csv += 'Sana,Vaqt,Mobilograf,Loyiha,Ish Turi,Izoh\n'
    
    records?.forEach((record: any) => {
      const date = new Date(record.date).toLocaleDateString('uz-UZ')
      const time = record.time || ''
      const mobilograf = record.mobilographers?.name || ''
      const project = record.projects?.name || ''
      const type = record.type === 'editing' ? 'Montaj' : 'Syomka'
      const notes = record.notes || ''
      
      csv += `"${date}","${time}","${mobilograf}","${project}","${type}","${notes}"\n`
    })

    // CSV ni qaytarish
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mobilograflar-hisobot-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
