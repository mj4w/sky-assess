"use client"

import React, { useState, useEffect } from 'react'
import { Plane, X, User, Calendar, Clock, Hash, PenTool, ClipboardCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from "@/lib/supabase"

const GRADES = ["S+", "S", "S-", "NP"]
interface StudentProfile {
  id: string;
  student_id: string | null;
  email: string;
}

const PPL_SECTIONS = [
  {
    title: "Preflight Items",
    items: ["Pre-flight Inspection", "Engine Starting", "Taxiing", "Before Takeoff Check"]
  },
  {
    title: "Traffic Pattern",
    items: ["Normal Takeoff & Climb", "Normal Approach & Landing", "Power-Off Landings (90°/180°/360°)", "Landings with Flap Settings", "Go-Around/Missed Approach Procedure"]
  },
  {
    title: "Aerial Maneuvers",
    items: ["Straight & Level", "Climbs & Descents", "Turns", "Climbing & Descending Turns", "Slow Flight (Clean & Dirty)", "Power-On Stalls", "Power-Off Stalls", "Spin Awareness (Discussion)", "Aerodrome Entry & Exit Procedures"]
  }
]

// Note: I changed 'role' to accept any string to prevent database mismatch errors
export default function PPLGradingForm({ onClose, instructorName, role }: { onClose: () => void, instructorName: string, role: string }) {
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [selectedStudent, setSelectedStudent] = useState("")
  const [lessonNo, setLessonNo] = useState("")
  const [rpc, setRpc] = useState("")
  const [duration, setDuration] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [formData, setFormData] = useState<Record<string, { grade: string, remark: string }>>({})

  // BULLETPROOF CHECK: Converts to lowercase. If it's not exactly "instructor", treat as student.
  const isStudent = role?.toLowerCase() !== "instructor";

  useEffect(() => {
    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, student_id, email')
        .eq('role', 'student')

      if (data) setStudents(data as StudentProfile[])
      if (error) console.error(error)
    }
    fetchStudents()
  }, [])

  const handleUpdate = (item: string, field: 'grade' | 'remark', value: string) => {
    if (isStudent) return // Students cannot edit grading items
    setFormData(prev => ({
      ...prev,
      [item]: { ...prev[item], [field]: value }
    }))
  }

  return (
    // Fixed z-100 to z-[100] so it correctly applies the z-index in Tailwind
    <div className="fixed inset-0 z-100 flex items-center justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="bg-blue-900 p-2 rounded-lg text-white"><Plane className="size-5 -rotate-45" /></div>
            <div>
              <h2 className="text-xl font-black italic uppercase text-slate-900">PPL Grading Sheet</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Flight Operations Department</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#FDFDFD]">
          
          <div className="space-y-8">
            {/* SESSION METADATA BLOCK */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><User size={12}/> Student Pilot</label>
                <select 
                  disabled={isStudent} 
                  className={`w-full p-2 rounded-lg border-none text-sm font-bold focus:ring-2 focus:ring-blue-900 ${isStudent ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-slate-50"}`}
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                >
                  <option value="">Select Student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.student_id || s.email}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><PenTool size={12}/> Flight Instructor</label>
                {/* Always disabled because auto-filled with current instructor's name */}
                <input disabled value={instructorName} className="w-full p-2 rounded-lg text-sm font-bold text-slate-500 cursor-not-allowed bg-slate-100" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Hash size={12}/> Lesson No.</label>
                <input 
                  disabled={isStudent} 
                  type="text" value={lessonNo} onChange={(e) => setLessonNo(e.target.value)} placeholder="e.g. 18" 
                  className={`w-full p-2 rounded-lg border-none text-sm font-bold ${isStudent ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-slate-50"}`} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Calendar size={12}/> Date</label>
                <input 
                  disabled={isStudent} 
                  type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className={`w-full p-2 rounded-lg border-none text-sm font-bold ${isStudent ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-slate-50"}`} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Plane size={12}/> RPC</label>
                <input 
                  disabled={isStudent} 
                  type="text" value={rpc} onChange={(e) => setRpc(e.target.value)} placeholder="e.g. RP-C1984"
                  className={`w-full p-2 rounded-lg border-none text-sm font-bold ${isStudent ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-slate-50"}`} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Clock size={12}/> Duration</label>
                <input 
                  disabled={isStudent} 
                  type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 1.5 Hours"
                  className={`w-full p-2 rounded-lg border-none text-sm font-bold ${isStudent ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-slate-50"}`} 
                />
              </div>
            </div>

            {/* GRADING ITEMS */}
            {PPL_SECTIONS.map((section) => (
              <section key={section.title} className="space-y-4">
                <h3 className="text-xs font-black uppercase text-blue-900 tracking-[0.2em] border-l-4 border-blue-900 pl-3">{section.title}</h3>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div key={item} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                        <span className="text-sm font-bold text-slate-700 w-full md:w-1/3">{item}</span>
                        
                        {/* Grade Selector */}
                        <div className="flex gap-1 shrink-0">
                          {GRADES.map((grade) => (
                            <button
                              key={grade}
                              onClick={() => handleUpdate(item, 'grade', grade)}
                              disabled={isStudent}
                              className={`w-10 h-9 rounded-lg text-[10px] font-black border-2 transition-all ${
                                formData[item]?.grade === grade ? 'bg-blue-900 border-blue-900 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-900'
                              } ${isStudent ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              {grade}
                            </button>
                          ))}
                        </div>

                        {/* Individual Remark */}
                        <input 
                          type="text" 
                          placeholder="Item remark..."
                          disabled={isStudent}
                          className={`flex-1 rounded-lg border-none text-[11px] p-2 focus:ring-1 focus:ring-blue-900 ${isStudent ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-slate-50"}`}
                          onChange={(e) => handleUpdate(item, 'remark', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* ACTION FOOTER - DYNAMIC BUTTONS */}
            <div className="pt-8 pb-4 flex justify-end gap-4 border-t border-slate-200 mt-8">
              <button 
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                {isStudent ? "Close Sheet" : "Cancel"}
              </button>
              
              {!isStudent && (
                <button 
                  className="px-6 py-3 bg-yellow-400 text-black border-2 border-black rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 uppercase tracking-wide"
                  onClick={() => {
                    console.log("Submitting Sheet...", { student: selectedStudent, lessonNo, date, rpc, duration, formData });
                    onClose();
                  }}
                >
                  <ClipboardCheck size={18} />
                  Submit Evaluation
                </button>
              )}
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  )
}
