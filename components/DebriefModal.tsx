"use client"
import React from 'react'
import { motion } from "framer-motion"
import { X, ChevronRight } from "lucide-react"
import Link from "next/link"

const debriefCourses = [
  { code: "PPL", name: "Private Pilot License", color: "bg-blue-600" },
  { code: "CPL", name: "Commercial Pilot License", color: "bg-emerald-600" },
  { code: "IR", name: "Instrument Rating", color: "bg-orange-600" },
  { code: "ME", name: "Multi-Engine Rating", color: "bg-purple-600" },
]

export function DebriefModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none italic uppercase">Select Course</h3>
              <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-black">Debriefing Terminal</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {debriefCourses.map((course) => (
              <Link 
                key={course.code}
                href={`/dashboard/debrief/${course.code.toLowerCase()}`}
                className="group flex items-center justify-between p-5 rounded-2xl border border-slate-100 hover:border-blue-900 hover:bg-blue-50/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs ${course.color}`}>
                    {course.code}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm tracking-tight">{course.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">View flight session logs</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-200 group-hover:text-blue-900 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}