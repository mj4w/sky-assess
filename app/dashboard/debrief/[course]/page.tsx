"use client"

import React, { useState } from 'react'
import PPLGradingForm from './components/PPLGradingForm'
import { Plus, ArrowLeft } from 'lucide-react'
import { usePilotData } from "@/hooks/usePilotData"
import { AnimatePresence } from 'framer-motion'
import Link from 'next/link'

export default function PPLDebriefPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const { pilotData, loading } = usePilotData()

  if (loading || !pilotData) {
    return <div className="p-10 text-sm text-slate-400">Loading...</div>
  }
  return (
    <div className="min-h-screen bg-[#FDFDFD] p-8 lg:p-12 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Link 
            href={`/dashboard/${pilotData?.role}/${pilotData?.id}`}
            className="flex items-center gap-2 text-slate-400 hover:text-blue-900 transition-colors text-[10px] font-black uppercase tracking-[0.2em] mb-4"
          >
            <ArrowLeft size={14} /> Back to Terminal
          </Link>
          <h1 className="text-3xl font-black italic uppercase text-slate-900 tracking-tight">
            PPL <span className="text-blue-900">Sessions</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Private Pilot License Grading History
          </p>
        </div>
        
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-900 text-white px-8 py-4 rounded-2xl flex items-center gap-3 hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/20 active:scale-95 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">New Grading Sheet</span>
        </button>
      </div>

      {/* History Placeholder */}
      <div className="border-2 border-dashed border-slate-200 rounded-[2rem] h-64 flex flex-col items-center justify-center bg-white/50">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <Plus className="text-slate-300" size={32} />
        </div>
        <p className="text-slate-400 text-sm font-medium italic">
          No recent sessions found. Start a new evaluation to begin.
        </p>
      </div>

      {/* Slide-over Form Logic */}
      <AnimatePresence>
        {isFormOpen && (
          <PPLGradingForm 
            onClose={() => setIsFormOpen(false)}
            instructorName={pilotData?.full_name || pilotData?.instructor_id || pilotData?.email || "Instructor"} 
            role={pilotData?.role || "student"} // Just pass the raw role from Supabase
          />
        )}
      </AnimatePresence>
    </div>
  )
}
