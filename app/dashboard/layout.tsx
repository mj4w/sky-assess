"use client"

import React, { useState } from 'react'
import { Plane, Bell, Settings, LogOut, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase" //
import { useAutoLogout } from "@/hooks/useAutoLogout" //

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  // Initialize your auto-logout hook (Default: 15 mins)
  useAutoLogout(15) 

  const handleLogout = async () => {
    setIsLoggingOut(true)
    
    try {
      // Use the same Supabase logic from your hook
      const { error } = await supabase.auth.signOut() 
      
      if (error) throw error

      // Professional delay for session synchronization
      await new Promise(resolve => setTimeout(resolve, 600))
      
      router.push('/login')
    } catch (error) {
      console.error("Manual logout failed:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#FDFDFD] font-sans">
      <header className="h-16 shrink-0 flex items-center justify-between px-8 bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm shadow-slate-900/5">
        
        {/* Left: Branding */}
        <div className="flex items-center gap-4">
          <div 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-2 group cursor-pointer select-none"
            title="Refresh Terminal"
          >
            <div className="bg-blue-900 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
              <Plane className="size-4 text-white -rotate-45" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                SkyAssess
              </h1>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                WCC Terminal
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 border-r border-slate-100 pr-6 mr-2">
            <button className="text-slate-400 hover:text-blue-900 transition-colors">
              <Bell size={18} />
            </button>
            <button className="text-slate-400 hover:text-blue-900 transition-colors">
              <Settings size={18} />
            </button>
          </div>
          
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all group disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <span className="text-[10px] font-bold uppercase tracking-widest">Sign Out</span>
                <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full relative">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] opacity-20 pointer-events-none" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}