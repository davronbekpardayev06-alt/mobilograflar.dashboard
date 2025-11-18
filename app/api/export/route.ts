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
      .limit(1000)

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
    workbook.creator = 'Space Marketing Agency'
    workbook.company = 'Space Marketing'
    workbook.created = now
    workbook.modified = now
    workbook.lastPrinted = now

    // ========== SHEET 1: DASHBOARD ==========
    const dashboardSheet = workbook.addWorksheet('📊 Dashboard', {
      views: [{ state: 'frozen', ySplit: 3 }],
      properties: { tabColor: { argb: 'FF4F46E5' } }
    })

    // TITLE
    dashboardSheet.mergeCells('A1:H1')
    const titleCell = dashboardSheet.getCell('A1')
    titleCell.value = '📊 MOBILOGRAFLAR DASHBOARD'
    titleCell.font = { size: 24, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }
    }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    dashboardSheet.getRow(1).height = 50

    // SUBTITLE
    dashboardSheet.mergeCells('A2:H2')
    const subtitleCell = dashboardSheet.getCell('A2')
    subtitleCell.value = `📅 ${now.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}`
    subtitleCell.font = { size: 14, italic: true, color: { argb: 'FF6B7280' } }
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    dashboardSheet.getRow(2).height = 28

    // STATISTIKA KARTOCHKALARI
    const totalWork = monthRecords?.reduce((sum, r) => sum + (r.count || 1), 0) || 0
    const todayWork = allRecords?.filter(r => r.date === now.toISOString().split('T')[0]).length || 0
    const totalPost = monthRecords?.reduce((sum, r) => {
      if (r.type === 'editing' && r.content_type === 'post') return sum + (r.count || 1)
      return sum
    }, 0) || 0
    const totalStoris = monthRecords?.reduce((sum, r) => {
      if (r.type === 'editing' && r.content_type === 'storis') return sum + (r.count || 1)
      return sum
    }, 0) || 0
    const totalSyomka = monthRecords?.reduce((sum, r) => {
      if (r.type === 'filming') return sum + (r.count || 1)
      return sum
    }, 0) || 0

    const statsData = [
      { label: '👥 Mobilograflar', value: mobilographers?.length || 0, color: 'FF3B82F6' },
      { label: '🎬 Loyihalar', value: projects?.length || 0, color: 'FF8B5CF6' },
      { label: '📊 Bu oy jami', value: totalWork, color: 'FF10B981' },
      { label: '⏰ Bugun', value: todayWork, color: 'FFF59E0B' },
      { label: '📄 Post montaj', value: totalPost, color: 'FF059669' },
      { label: '📱 Storis', value: totalStoris, color: 'FFEC4899' },
      { label: '📹 Syomka', value: totalSyomka, color: 'FF3B82F6' }
    ]

    let currentRow = 4
    statsData.forEach((stat, index) => {
      if (index % 2 === 0) {
        // LEFT CARD
        dashboardSheet.mergeCells(`A${currentRow}:C${currentRow + 1}`)
        const leftCard = dashboardSheet.getCell(`A${currentRow}`)
        leftCard.value = stat.label
        leftCard.font = { size: 14, bold: true, color: { argb: 'FF1F2937' } }
        leftCard.alignment = { horizontal: 'center', vertical: 'middle' }
        leftCard.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' }
        }
        leftCard.border = {
          top: { style: 'medium', color: { argb: stat.color } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        }

        dashboardSheet.mergeCells(`D${currentRow}:D${currentRow + 1}`)
        const leftValue = dashboardSheet.getCell(`D${currentRow}`)
        leftValue.value = stat.value
        leftValue.font = { size: 32, bold: true, color: { argb: stat.color } }
        leftValue.alignment = { horizontal: 'center', vertical: 'middle' }
        leftValue.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }
        }
        leftValue.border = {
          top: { style: 'medium', color: { argb: stat.color } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        }
      } else {
        // RIGHT CARD
        dashboardSheet.mergeCells(`E${currentRow - 2}:G${currentRow - 1}`)
        const rightCard = dashboardSheet.getCell(`E${currentRow - 2}`)
        rightCard.value = stat.label
        rightCard.font = { size: 14, bold: true, color: { argb: 'FF1F2937' } }
        rightCard.alignment = { horizontal: 'center', vertical: 'middle' }
        rightCard.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' }
        }
        rightCard.border = {
          top: { style: 'medium', color: { argb: stat.color } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        }

        dashboardSheet.mergeCells(`H${currentRow - 2}:H${currentRow - 1}`)
        const rightValue = dashboardSheet.getCell(`H${currentRow - 2}`)
        rightValue.value = stat.value
        rightValue.font = { size: 32, bold: true, color: { argb: stat.color } }
        rightValue.alignment = { horizontal: 'center', vertical: 'middle' }
        rightValue.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }
        }
        rightValue.border = {
          top: { style: 'medium', color: { argb: stat.color } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        }

        currentRow += 2
      }
    })

    dashboardSheet.getRow(4).height = 35
    dashboardSheet.getRow(5).height = 35
    dashboardSheet.getRow(6).height = 35
    dashboardSheet.getRow(7).height = 35
    dashboardSheet.getRow(8).height = 35
    dashboardSheet.getRow(9).height = 35
    dashboardSheet.getRow(10).height = 35

    dashboardSheet.getColumn(1).width = 12
    dashboardSheet.getColumn(2).width = 12
    dashboardSheet.getColumn(3).width = 12
    dashboardSheet.getColumn(4).width = 12
    dashboardSheet.getColumn(5).width = 12
    dashboardSheet.getColumn(6).width = 12
    dashboardSheet.getColumn(7).width = 12
    dashboardSheet.getColumn(8).width = 12

    // ========== SHEET 2: LOYIHALAR ==========
    const projectsSheet = workbook.addWorksheet('📁 Loyihalar', {
      views: [{ state: 'frozen', ySplit: 2 }],
      properties: { tabColor: { argb: 'FF8B5CF6' } }
    })

    projectsSheet.mergeCells('A1:H1')
    const projectsTitle = projectsSheet.getCell('A1')
    projectsTitle.value = '📁 LOYIHALAR PROGRESSI'
    projectsTitle.font = { size: 20, bold: true, color: { argb: 'FFFFFFFF' } }
    projectsTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8B5CF6' }
    }
    projectsTitle.alignment = { horizontal: 'center', vertical: 'middle' }
    projectsSheet.getRow(1).height = 45

    const projectHeaders = ['#', 'Loyiha Nomi', 'Mas\'ul', 'Bajarildi', 'Maqsad', 'Progress', 'Status', 'Holat']
    projectHeaders.forEach((header, index) => {
      const cell = projectsSheet.getCell(2, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF6366F1' }
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
    projectsSheet.getRow(2).height = 35

    // Auto-filter qo'shish
    projectsSheet.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: 2, column: 8 }
    }

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
      
      let status = ''
      let statusColor = ''
      let bgColor = ''
      if (progress >= 100) {
        status = '✅ Bajarildi'
        statusColor = 'FF059669'
        bgColor = 'FFD1FAE5'
      } else if (progress >= 75) {
        status = '⚠️ Yaxshi'
        statusColor = 'FFD97706'
        bgColor = 'FFFEF3C7'
      } else if (progress >= 50) {
        status = '📊 O\'rtacha'
        statusColor = 'FF3B82F6'
        bgColor = 'FFDBEAFE'
      } else if (progress >= 25) {
        status = '🔴 Past'
        statusColor = 'FFDC2626'
        bgColor = 'FFFECACA'
      } else {
        status = '❌ Juda past'
        statusColor = 'FF991B1B'
        bgColor = 'FFFEE2E2'
      }

      const holat = completed >= target ? '🎉 Maqsad erishildi!' : `⏳ ${target - completed} ta qoldi`

      const row = index + 3
      const cells = [
        { col: 1, value: index + 1 },
        { col: 2, value: project.name },
        { col: 3, value: project.mobilographers?.name || 'N/A' },
        { col: 4, value: completed },
        { col: 5, value: target },
        { col: 6, value: progress / 100 }, // Foiz formatida
        { col: 7, value: status },
        { col: 8, value: holat }
      ]

      cells.forEach(({ col, value }) => {
        const cell = projectsSheet.getCell(row, col)
        cell.value = value
        cell.alignment = {
          horizontal: col === 2 || col === 3 || col === 8 ? 'left' : 'center',
          vertical: 'middle'
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        }

        // Progress cell - foiz format
        if (col === 6) {
          cell.numFmt = '0%'
          cell.font = { bold: true, size: 13, color: { argb: statusColor } }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
          }
        }

        // Status cell
        if (col === 7) {
          cell.font = { bold: true, color: { argb: statusColor } }
        }

        // Holat cell
        if (col === 8) {
          cell.font = { size: 11, italic: true }
        }
      })

      projectsSheet.getRow(row).height = 28
    })

    projectsSheet.getColumn(1).width = 6
    projectsSheet.getColumn(2).width = 30
    projectsSheet.getColumn(3).width = 22
    projectsSheet.getColumn(4).width = 12
    projectsSheet.getColumn(5).width = 12
    projectsSheet.getColumn(6).width = 14
    projectsSheet.getColumn(7).width = 18
    projectsSheet.getColumn(8).width = 22

    // ========== SHEET 3: REYTING ==========
    const ratingSheet = workbook.addWorksheet('🏆 Reyting', {
      views: [{ state: 'frozen', ySplit: 2 }],
      properties: { tabColor: { argb: 'FFF59E0B' } }
    })

    ratingSheet.mergeCells('A1:G1')
    const ratingTitle = ratingSheet.getCell('A1')
    ratingTitle.value = `🏆 OYLIK REYTING - ${now.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })}`
    ratingTitle.font = { size: 20, bold: true, color: { argb: 'FFFFFFFF' } }
    ratingTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF59E0B' }
    }
    ratingTitle.alignment = { horizontal: 'center', vertical: 'middle' }
    ratingSheet.getRow(1).height = 45

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

    const ratingHeaders = ['🏅 O\'rin', 'Mobilograf', '⭐ Jami Ball', '📄 Post', '📱 Storis', '📹 Syomka', '💰 Mukofot']
    ratingHeaders.forEach((header, index) => {
      const cell = ratingSheet.getCell(2, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEF4444' }
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
    ratingSheet.getRow(2).height = 35

    sortedScores.forEach(([name, score], index) => {
      const row = index + 3
      const rank = index + 1
      const details = mobilographerDetails.get(name) || { post: 0, storis: 0, syomka: 0 }

      // Mukofot hisoblash (har 100 ballga 50,000 so'm)
      const mukofot = Math.floor((score as number) / 100) * 50000

      const rankCell = ratingSheet.getCell(row, 1)
      rankCell.alignment = { horizontal: 'center', vertical: 'middle' }
      rankCell.font = { bold: true, size: 16 }
      
      let bgColor = 'FFFFFFFF'
      if (rank === 1) {
        rankCell.value = '🥇'
        bgColor = 'FFFEF3C7'
      } else if (rank === 2) {
        rankCell.value = '🥈'
        bgColor = 'FFE5E7EB'
      } else if (rank === 3) {
        rankCell.value = '🥉'
        bgColor = 'FFFED7AA'
      } else {
        rankCell.value = rank
      }

      rankCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      }

      const nameCell = ratingSheet.getCell(row, 2)
      nameCell.value = name
      nameCell.font = { bold: true, size: 13 }
      nameCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      }

      const scoreCell = ratingSheet.getCell(row, 3)
      scoreCell.value = score
      scoreCell.font = { bold: true, size: 15, color: { argb: 'FF059669' } }
      scoreCell.alignment = { horizontal: 'center', vertical: 'middle' }

      ratingSheet.getCell(row, 4).value = details.post
      ratingSheet.getCell(row, 4).alignment = { horizontal: 'center', vertical: 'middle' }

      ratingSheet.getCell(row, 5).value = details.storis
      ratingSheet.getCell(row, 5).alignment = { horizontal: 'center', vertical: 'middle' }

      ratingSheet.getCell(row, 6).value = details.syomka
      ratingSheet.getCell(row, 6).alignment = { horizontal: 'center', vertical: 'middle' }

      const mukofotCell = ratingSheet.getCell(row, 7)
      mukofotCell.value = mukofot
      mukofotCell.numFmt = '#,##0" so\'m"'
      mukofotCell.font = { bold: true, size: 12, color: { argb: 'FF059669' } }
      mukofotCell.alignment = { horizontal: 'right', vertical: 'middle' }

      for (let col = 1; col <= 7; col++) {
        const cell = ratingSheet.getCell(row, col)
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        }
      }

      ratingSheet.getRow(row).height = 32
    })

    ratingSheet.getColumn(1).width = 12
    ratingSheet.getColumn(2).width = 28
    ratingSheet.getColumn(3).width = 16
    ratingSheet.getColumn(4).width = 13
    ratingSheet.getColumn(5).width = 13
    ratingSheet.getColumn(6).width = 13
    ratingSheet.getColumn(7).width = 18

    // ========== SHEET 4: FAOLIYAT ==========
    const activitySheet = workbook.addWorksheet('📅 Faoliyat', {
      views: [{ state: 'frozen', ySplit: 2 }],
      properties: { tabColor: { argb: 'FF10B981' } }
    })

    activitySheet.mergeCells('A1:H1')
    const activityTitle = activitySheet.getCell('A1')
    activityTitle.value = '📅 KUNLIK FAOLIYAT (Oxirgi 1000 ta yozuv)'
    activityTitle.font = { size: 20, bold: true, color: { argb: 'FFFFFFFF' } }
    activityTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' }
    }
    activityTitle.alignment = { horizontal: 'center', vertical: 'middle' }
    activitySheet.getRow(1).height = 45

    const activityHeaders = ['#', 'Sana', 'Vaqt', 'Mobilograf', 'Loyiha', 'Ish Turi', 'Soni', 'Izoh']
    activityHeaders.forEach((header, index) => {
      const cell = activitySheet.getCell(2, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' }
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
    activitySheet.getRow(2).height = 35

    // Auto-filter
    activitySheet.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: 2, column: 8 }
    }

    allRecords?.forEach((record, index) => {
      const row = index + 3
      const date = new Date(record.date)
      const time = record.time || '-'
      const mobilograf = record.mobilographers?.name || 'N/A'
      const project = record.projects?.name || 'N/A'
      
      let type = ''
      let typeColor = 'FF000000'
      let typeBg = 'FFFFFFFF'
      if (record.type === 'editing') {
        if (record.content_type === 'post') {
          type = '📄 POST Montaj'
          typeColor = 'FF059669'
          typeBg = 'FFD1FAE5'
        } else {
          type = '📱 STORIS Montaj'
          typeColor = 'FFEC4899'
          typeBg = 'FFFCE7F3'
        }
      } else {
        type = '📹 Syomka'
        typeColor = 'FF3B82F6'
        typeBg = 'FFDBEAFE'
      }

      // #
      activitySheet.getCell(row, 1).value = index + 1
      activitySheet.getCell(row, 1).alignment = { horizontal: 'center', vertical: 'middle' }

      // Sana
      activitySheet.getCell(row, 2).value = date
      activitySheet.getCell(row, 2).numFmt = 'dd.mm.yyyy'
      activitySheet.getCell(row, 2).alignment = { horizontal: 'center', vertical: 'middle' }

      // Vaqt
      activitySheet.getCell(row, 3).value = time
      activitySheet.getCell(row, 3).alignment = { horizontal: 'center', vertical: 'middle' }

      // Mobilograf
      activitySheet.getCell(row, 4).value = mobilograf
      activitySheet.getCell(row, 4).alignment = { horizontal: 'left', vertical: 'middle' }
      activitySheet.getCell(row, 4).font = { bold: true }

      // Loyiha
      activitySheet.getCell(row, 5).value = project
      activitySheet.getCell(row, 5).alignment = { horizontal: 'left', vertical: 'middle' }

      // Ish turi
      const typeCell = activitySheet.getCell(row, 6)
      typeCell.value = type
      typeCell.alignment = { horizontal: 'center', vertical: 'middle' }
      typeCell.font = { bold: true, color: { argb: typeColor } }
      typeCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: typeBg }
      }

      // Soni
      activitySheet.getCell(row, 7).value = record.count || 1
      activitySheet.getCell(row, 7).alignment = { horizontal: 'center', vertical: 'middle' }
      activitySheet.getCell(row, 7).font = { bold: true, size: 12 }

      // Izoh
      activitySheet.getCell(row, 8).value = record.notes || '-'
      activitySheet.getCell(row, 8).alignment = { horizontal: 'left', vertical: 'middle' }

      // Borders
      for (let col = 1; col <= 8; col++) {
        const cell = activitySheet.getCell(row, col)
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        }
      }

      activitySheet.getRow(row).height = 24
    })

    activitySheet.getColumn(1).width = 7
    activitySheet.getColumn(2).width = 14
    activitySheet.getColumn(3).width = 11
    activitySheet.getColumn(4).width = 24
    activitySheet.getColumn(5).width = 24
    activitySheet.getColumn(6).width = 22
    activitySheet.getColumn(7).width = 10
    activitySheet.getColumn(8).width = 38

    // ========== EXCEL FAYLNI YARATISH ==========
    const buffer = await workbook.xlsx.writeBuffer()

    const fileName = `Mobilograflar-Hisobot-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { 
        error: 'Export failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
