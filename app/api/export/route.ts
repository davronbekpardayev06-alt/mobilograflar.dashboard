import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET() {
  try {
    console.log('Export started...')

    // Ma'lumotlarni olish
    const { data: mobilographers, error: mobError } = await supabase
      .from('mobilographers')
      .select('*')
      .order('name')

    if (mobError) throw mobError

    const { data: projects, error: projError } = await supabase
      .from('projects')
      .select('*')
      .order('name')

    if (projError) throw projError

    const { data: records, error: recError } = await supabase
      .from('records')
      .select(`
        *,
        mobilographers(name),
        projects(name)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (recError) throw recError

    console.log('Data fetched successfully')

    // Excel yaratish
    const workbook = new ExcelJS.Workbook()
    
    // SHEET 1: Mobilograflar
    const mobSheet = workbook.addWorksheet('Mobilograflar')
    mobSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Ism', key: 'name', width: 30 }
    ]
    
    mobilographers?.forEach(mob => {
      mobSheet.addRow({
        id: mob.id,
        name: mob.name
      })
    })

    // SHEET 2: Loyihalar
    const projSheet = workbook.addWorksheet('Loyihalar')
    projSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nomi', key: 'name', width: 30 },
      { header: 'Maqsad', key: 'target', width: 15 }
    ]
    
    projects?.forEach(proj => {
      projSheet.addRow({
        id: proj.id,
        name: proj.name,
        target: proj.monthly_target || 12
      })
    })

    // SHEET 3: Yozuvlar
    const recSheet = workbook.addWorksheet('Yozuvlar')
    recSheet.columns = [
      { header: 'Sana', key: 'date', width: 15 },
      { header: 'Mobilograf', key: 'mobilographer', width: 25 },
      { header: 'Loyiha', key: 'project', width: 25 },
      { header: 'Tur', key: 'type', width: 15 },
      { header: 'Soni', key: 'count', width: 10 }
    ]
    
    records?.forEach(rec => {
      recSheet.addRow({
        date: rec.date,
        mobilographer: rec.mobilographers?.name || 'N/A',
        project: rec.projects?.name || 'N/A',
        type: rec.type === 'editing' ? 'Montaj' : 'Syomka',
        count: rec.count || 1
      })
    })

    console.log('Excel created successfully')

    // Buffer ga aylantirish
    const buffer = await workbook.xlsx.writeBuffer()
    
    console.log('Buffer created, size:', buffer.byteLength)

    // Response qaytarish
    const fileName = `Hisobot-${new Date().toISOString().split('T')[0]}.xlsx`
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.byteLength.toString()
      }
    })

  } catch (error: any) {
    console.error('Export error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Export failed',
        message: error?.message || 'Unknown error',
        details: error?.toString()
      },
      { status: 500 }
    )
  }
}
```

---

## 3️⃣ Tekshirish ketma-ketligi:

### A) Vercel Logs ni ko'rish:

1. Vercel Dashboard → Deployments
2. Oxirgi deployment ni bosing
3. **"Functions"** tabini oching
4. `/api/export` ni toping
5. **"View Function Logs"** ni bosing
6. Qanday xatolik borligini ko'ring

### B) Xatolik turlari:

**Agar "Module not found: ExcelJS":**
```
→ package.json da "exceljs" yo'q
→ Qo'shing va qayta deploy qiling
```

**Agar "Cannot read properties of undefined":**
```
→ Supabase ma'lumot qaytarmayapti
→ Database'ni tekshiring
```

**Agar "Timeout":**
```
→ Juda ko'p ma'lumot
→ LIMIT ni kamaytiring (100 ga)
