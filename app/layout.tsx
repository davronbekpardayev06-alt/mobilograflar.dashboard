'use client'

import './globals.css'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('uz-UZ', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleExport = async () => {
    try {
      // CSV formatida export
      const response = await fetch('/api/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `mobilograflar-hisobot-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Excel yuklab bo\'lmadi. Iltimos qaytadan urinib ko\'ring.')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Xatolik yuz berdi!')
    }
  }

  const tabs = [
    { name: 'Asosiy', path: '/', icon: '🏠' },
    { name: 'Statistika', path: '/statistika', icon: '📊' },
    { name: 'Reyting', path: '/reyting', icon: '🏆' },
    { name: 'Timeline', path: '/timeline', icon: '📅' },
    { name: 'Haftalik', path: '/haftalik', icon: '📆' },
    { name: 'Oylik', path: '/oylik', icon: '📈' },
    { name: 'Mobilograflar', path: '/mobilograflar', icon: '👥' },
    { name: 'Loyihalar', path: '/loyihalar', icon: '📁' },
    { name: 'Kiritish', path: '/kiritish', icon: '➕' }
  ]

  return (
    <html lang="uz">
      <body>
        <div className="min-h-screen">
          {/* Header */}
          <header className="bg-white shadow-sm border-b sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">📊</div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Mobilograflar
                    </h1>
                    <p className="text-sm text-gray-500">Real-time Dashboard</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-gray-600 font-medium text-lg">
                    {currentTime}
                  </div>
                  <button 
                    onClick={handleRefresh}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    🔄 Yangilash
                  </button>
                  <button 
                    onClick={handleExport}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    📥 Excel
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Navigation Tabs */}
          <nav className="bg-white border-b sticky top-[88px] z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => {
                  const isActive = pathname === tab.path
                  return (
                    <Link
                      key={tab.path}
                      href={tab.path}
                      className={`
                        flex items-center gap-2 px-5 py-3.5 border-b-2 transition-all whitespace-nowrap font-medium
                        ${isActive 
                          ? 'border-blue-500 text-blue-600 bg-blue-50' 
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }
                      `}
                    >
                      <span className="text-xl">{tab.icon}</span>
                      <span>{tab.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
