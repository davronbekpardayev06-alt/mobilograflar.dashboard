const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 3000)
      return
    }

    try {
      // Avval record ma'lumotlarini olish
      const { data: record, error: fetchError } = await supabase
        .from('records')
        .select('*, projects(*)')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      const count = record.count || 1
      const projectId = record.project_id
      const type = record.type

      // 1. Record'ni o'chirish
      const { error: deleteError } = await supabase
        .from('records')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // 2. Videolarni o'chirish yoki statusini o'zgartirish
      if (type === 'editing') {
        // MONTAJ: oxirgi 'count' ta completed videolarni pending qilish
        const { data: completedVideos } = await supabase
          .from('videos')
          .select('id')
          .eq('project_id', projectId)
          .eq('editing_status', 'completed')
          .order('created_at', { ascending: false })
          .limit(count)

        if (completedVideos && completedVideos.length > 0) {
          const videoIds = completedVideos.map(v => v.id)
          await supabase
            .from('videos')
            .update({ editing_status: 'pending' })
            .in('id', videoIds)
        }
      } else if (type === 'filming') {
        // SYOMKA: oxirgi 'count' ta pending videolarni o'chirish
        const { data: pendingVideos } = await supabase
          .from('videos')
          .select('id')
          .eq('project_id', projectId)
          .eq('editing_status', 'pending')
          .order('created_at', { ascending: false })
          .limit(count)

        if (pendingVideos && pendingVideos.length > 0) {
          const videoIds = pendingVideos.map(v => v.id)
          await supabase
            .from('videos')
            .delete()
            .in('id', videoIds)
        }
      }

      alert('✅ Yozuv o\'chirildi!')
      setDeleteConfirm(null)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Xatolik yuz berdi!')
    }
  }
