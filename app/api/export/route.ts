import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET() {
  try {
    // ========== MA'LUMOTLARNI OLISH ==========
    const { data: mobilographers } = await supabase
      .from('mobilographers')
      .select('*')
      .order('name')

    const { data: projects } = await supabase
      .from('projects')
      .select(`
        *,
        mobilographers(name),
        videos(id, editing_status, filming_status, content_type, task_type, created_at, record_id)
      `)
      .order('name')

    const { data: allRecords } = await supabase
      .from('records')
      .select(`
        *,
        mobilographers(name),
        projects(name)
      `)
      .order('created_at', { ascending: false })
      .limit(500)

    // OYLIK MA'LUMOTLAR
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]

    const { data: monthRecords } = await supabase
      .from('records')
      .select('*, mobilographers(name), projects(name)')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)

    // ========== EXCEL YARATISH ==========
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Mobilograflar Dashboard'
    workbook.created = now
    workbook.modified = now

    // ========== SHEET 1: DASHBOARD ==========
    const dashboardSheet = workbook.addWorksheet('📊 Dashboard', {
      views: [{ state: 'frozen', ySplit: 3 }]
    })

    dashboardSheet.mergeCells('A1:F1')
    const titleCell = dashboardSheet.getCell('A1')
    titleCell.value = '📊 MOBILOGRAFLAR DASHBOARD'
    titleCell.font = { size: 22, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    dashboardSheet.getRow(1).height = 45

    dashboardSheet.mergeCells('A2:F2')
    const dateCell = dashboardSheet.getCell('A2')
    dateCell.value = `📅 ${now.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })}`
    dateCell.font = { size: 12, italic: true, color: { argb: 'FF6B7280' } }
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' }
    dashboardSheet.getRow(2).height = 25

    dashboardSheet.getCell('A4').value = '📈 UMUMIY STATISTIKA'
    dashboardSheet.getCell('A4').font = { size: 16, bold: true, color: { argb: 'FF1F2937' } }
    dashboardSheet.mergeCells('A4:B4')
    dashboardSheet.getRow(4).height = 30

    const totalWork = monthRecords?.reduce((sum, r) => sum + (r.count || 1), 0) || 0
    const todayWork = allRecords?.filter(r => r.date === now.toISOString().split('T')[0]).length || 0

    const stats = [
      ['👥 Mobilograflar', mobilographers?.length || 0],
      ['🎬 Loyihalar', projects?.length || 0],
      ['📊 Bu oylik ishlar', totalWork],
      ['⏰ Bugungi ishlar', todayWork]
    ]

    stats.forEach((stat, index) => {
      const row = 5 + index
      const labelCell = dashboardSheet.getCell(`A${row}`)
      const valueCell = dashboardSheet.getCell(`B${row}`)
      
      labelCell.value = stat[0]
      labelCell.font = { size: 13, bold: true }
      
      valueCell.value = stat[1]
      valueCell.font = { size: 18, bold: true, color: { argb: 'FF059669' } }
      valueCell.alignment = { horizontal: 'right', vertical: 'middle' }
      
      dashboardSheet.getRow(row).height = 28
    })

    dashboardSheet.getColumn(1).width = 35
    dashboardSheet.getColumn(2).width = 18

    // ========== SHEET 2: LOYIHALAR ==========
    const projectsSheet = workbook.addWorksheet('📁 Loyihalar')

    projectsSheet.mergeCells('A1:G1')
    const projectsTitle = projectsSheet.getCell('A1')
    projectsTitle.value = '📁 LOYIHALAR PROGRESSI'
    projectsTitle.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } }
    projectsTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } }
    projectsTitle.alignment = { horizontal: 'center', vertical: 'middle' }
    projectsSheet.getRow(1).height = 40

    const projectHeaders = ['#', 'Loyiha', 'Mobilograf', 'Tugallandi', 'Maqsad', 'Progress', 'Holat']
    projectHeaders.forEach((header, index) => {
      const cell = projectsSheet.getCell(2, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
    projectsSheet.getRow(2).height = 30

    projects?.forEach((project, index) => {
      const monthVideos = project.videos?.filter((v: any) => {
        if (v.task_type !== 'montaj') return false
        if (v.content_type !== 'post') return false
        if (v.editing_status !== 'completed') return false
        if (!v.record_id) return false
        
        const videoDate = new Date(v.created_at)
        return videoDate.getMonth() === currentMonth && videoDate.getFullYear() === currentYear
      })

      const completed = monthVideos?.length || 0
      const target = project.monthly_target || 12
      const progress = Math.round((completed / target) * 100)
      const status = progress >= 100 ? '✅ Bajarildi' : progress >= 75 ? '⚠️ Yaxshi' : progress >= 50 ? '📊 O\'rtacha' : '🔴 Past'

      const row = index + 3
      const cells = [
        { col: 1, value: index + 1, align: 'center' },
        { col: 2, value: project.name, align: 'left' },
        { col: 3, value: project.mobilographers?.name || 'N/A', align: 'left' },
        { col: 4, value: completed, align: 'center' },
        { col: 5, value: target, align: 'center' },
        { col: 6, value: `${progress}%`, align: 'center' },
        { col: 7, value: status, align: 'center' }
      ]

      cells.forEach(({ col, value, align }) => {
        const cell = projectsSheet.getCell(row, col)
        cell.value = value
        cell.alignment = { horizontal: align as any, vertical: 'middle' }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        }
      })

      const progressCell = projectsSheet.getCell(row, 6)
      progressCell.font = { bold: true, size: 12 }
      if (progress >= 100) {
        progressCell.font = { ...progressCell.font, color: { argb: 'FF059669' } }
        progressCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
      } else if (progress >= 75) {
        progressCell.font = { ...progressCell.font, color: { argb: 'FFD97706' } }
        progressCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
      } else if (progress >= 50) {
        progressCell.font = { ...progressCell.font, color: { argb: 'FF3B82F6' } }
        progressCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
      } else {
        progressCell.font = { ...progressCell.font, color: { argb: 'FFDC2626' } }
        progressCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } }
      }

      projectsSheet.getRow(row).height = 25
    })

    projectsSheet.getColumn(1).width = 6
    projectsSheet.getColumn(2).width = 28
    projectsSheet.getColumn(3).width = 22
    projectsSheet.getColumn(4).width = 14
    projectsSheet.getColumn(5).width = 12
    projectsSheet.getColumn(6).width = 14
    projectsSheet.getColumn(7).width = 16

    // ========== SHEET 3: REYTING ==========
    const ratingSheet = workbook.addWorksheet('🏆 Reyting')

    ratingSheet.mergeCells('A1:F1')
    const ratingTitle = ratingSheet.getCell('A1')
    ratingTitle.value = '🏆 OYLIK REYTING'
    ratingTitle.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } }
    ratingTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } }
    ratingTitle.alignment = { horizontal: 'center', vertical: 'middle' }
    ratingSheet.getRow(1).height = 40

    const mobilographerScores = new Map()
    const mobilographerDetails = new Map()
    
    monthRecords?.forEach((record: any) => {
      const name = record.mobilographers?.name || 'N/A'
      const count = record.count || 1
      
      if (!mobilographerDetails.has(name)) {
        mobilographerDetails.set(name, { post: 0, storis: 0, syomka: 0 })
      }
      const details = mobilographerDetails.get(name)

      let points = 0
      if (record.type === 'editing') {
        if (record.content_type === 'post') {
          points = count * 10
          details.post += count
        } else if (record.content_type === 'storis') {
          points = count * 5
          details.storis += count
        }
      } else if (record.type === 'filming') {
        points = count * 8
        details.syomka += count
      }

      mobilographerScores.set(name, (mobilographerScores.get(name) || 0) + points)
    })

    const sortedScores = Array.from(mobilographerScores.entries())
      .sort((a, b) => b[1] - a[1])

    const ratingHeaders = ['🏅 O\'rin', 'Mobilograf', '⭐ Ball', '📄 Post', '📱 Storis', '📹 Syomka']
    ratingHeaders.forEach((header, index) => {
      const cell = ratingSheet.getCell(2, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
    ratingSheet.getRow(2).height = 30

    sortedScores.forEach(([name, score], index) => {
      const row = index + 3
      const rank = index + 1
      const details = mobilographerDetails.get(name) || { post: 0, storis: 0, syomka: 0 }

      const rankCell = ratingSheet.getCell(row, 1)
      rankCell.alignment = { horizontal: 'center', vertical: 'middle' }
      rankCell.font = { bold: true, size: 14 }
      
      if (rank === 1) {
        rankCell.value = '🥇'
        rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
      } else if (rank === 2) {
        rankCell.value = '🥈'
        rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
      } else if (rank === 3) {
        rankCell.value = '🥉'
        rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } }
      } else {
        rankCell.value = rank
      }

      const nameCell = ratingSheet.getCell(row, 2)
      nameCell.value = name
      nameCell.font = { bold: true, size: 12 }
      nameCell.alignment = { horizontal: 'left', vertical: 'middle' }

      const scoreCell = ratingSheet.getCell(row, 3)
      scoreCell.value = score
      scoreCell.alignment = { horizontal: 'center', vertical: 'middle' }
      scoreCell.font = { bold: true, size: 14, color: { argb: 'FF059669' } }

      ratingSheet.getCell(row, 4).value = details.post
      ratingSheet.getCell(row, 4).alignment = { horizontal: 'center', vertical: 'middle' }
      ratingSheet.getCell(row, 5).value = details.storis
      ratingSheet.getCell(row, 5).alignment = { horizontal: 'center', vertical: 'middle' }
      ratingSheet.getCell(row, 6).value = details.syomka
      ratingSheet.getCell(row, 6).alignment = { horizontal: 'center', vertical: 'middle' }

      for (let col = 1; col <= 6; col++) {
        const cell = ratingSheet.getCell(row, col)
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        }
      }

      ratingSheet.getRow(row).height = 28
    })

    ratingSheet.getColumn(1).width = 10
    ratingSheet.getColumn(2).width = 28
    ratingSheet.getColumn(3).width = 15
    ratingSheet.getColumn(4).width = 12
    ratingSheet.getColumn(5).width = 12
    ratingSheet.getColumn(6).width = 12

    // ========== SHEET 4: FAOLIYAT ==========
    const activitySheet = workbook.addWorksheet('📅 Faoliyat')

    activitySheet.mergeCells('A1:H1')
    const activityTitle = activitySheet.getCell('A1')
    activityTitle.value = '📅 KUNLIK FAOLIYAT (Oxirgi 500 ta)'
    activityTitle.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } }
    activityTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }
    activityTitle.alignment = { horizontal: 'center', vertical: 'middle' }
    activitySheet.getRow(1).height = 40

    const activityHeaders = ['#', 'Sana', 'Vaqt', 'Mobilograf', 'Loyiha', 'Ish Turi', 'Soni', 'Izoh']
    activityHeaders.forEach((header, index) => {
      const cell = activitySheet.getCell(2, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
    activitySheet.getRow(2).height = 30

    allRecords?.forEach((record, index) => {
      const row = index + 3
      const date = new Date(record.date).toLocaleDateString('uz-UZ')
      const time = record.time || '-'
      const mobilograf = record.mobilographers?.name || 'N/A'
      const project = record.projects?.name || 'N/A'
      
      let type = ''
      let typeColor = 'FF000000'
      if (record.type === 'editing') {
        if (record.content_type === 'post') {
          type = '📄 POST Montaj'
          typeColor = 'FF059669'
        } else {
          type = '📱 STORIS Montaj'
          typeColor = 'FFEC4899'
        }
      } else {
        type = '📹 Syomka'
        typeColor = 'FF3B82F6'
      }

      const cells = [
        { col: 1, value: index + 1, align: 'center' },
        { col: 2, value: date, align: 'center' },
        { col: 3, value: time, align: 'center' },
        { col: 4, value: mobilograf, align: 'left' },
        { col: 5, value: project, align: 'left' },
        { col: 6, value: type, align: 'center' },
        { col: 7, value: record.count || 1, align: 'center' },
        { col: 8, value: record.notes || '-', align: 'left' }
      ]

      cells.forEach(({ col, value, align }) => {
        const cell = activitySheet.getCell(row, col)
        cell.value = value
        cell.alignment = { horizontal: align as any, vertical: 'middle' }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        }

        if (col === 6) {
          cell.font = { bold: true, color: { argb: typeColor } }
        }
      })

      activitySheet.getRow(row).height = 22
    })

    activitySheet.getColumn(1).width = 6
    activitySheet.getColumn(2).width = 15
    activitySheet.getColumn(3).width = 10
    activitySheet.getColumn(4).width = 22
    activitySheet.getColumn(5).width = 22
    activitySheet.getColumn(6).width = 20
    activitySheet.getColumn(7).width = 10
    activitySheet.getColumn(8).width = 35

    // ========== EXCEL FAYLNI YARATISH ==========
    const buffer = await workbook.xlsx.writeBuffer()

    const fileName = `Mobilograflar-Hisobot-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Export failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
