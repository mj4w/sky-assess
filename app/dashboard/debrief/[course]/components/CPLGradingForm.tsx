"use client"

import React, { useEffect, useState } from "react"
import { Plane, X, User, Calendar, Clock, Hash, PenTool, ClipboardCheck } from "lucide-react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import InstructorSignaturePad from "./InstructorSignaturePad"

interface InitialSession {
  lessonNo?: string
  date: string
  rpc: string
  duration: string
  flightType: string
  timeLabel: string
  studentId?: string
  instructorId?: string
}

const CPL_ITEMS = [
  "CP1 Review Basic Maneuvers / Landings",
  "CP2 Turn Around a Point / S-Turns / Landings",
  "CP3 Power-Off Landings (90°, 180°, 360°)",
  "CP4 Steep Turns / Lazy Eight / Chandelles",
  "CP5 Soft Field & Short Field T/O and Landing",
  "CP6 Advanced Maneuvers Review",
  "CP7 Crosswind T/O / Landing / Forward-Side Slip",
  "CP8 Slow Flight / Eights on Pylon / Eights Along Road",
  "CP9 Emergency Procedures",
  "CP10 Soft & Short Field with Distance Limit",
  "CP11 Advanced Maneuvers (Slow Flight + Eights)",
  "CP12 Cross Country / Lost Comms / Diversion / Nav",
  "CP13 Company Check / Advanced / Emergency / Landings",
]

export default function CPLGradingForm({
  onClose,
  instructorName,
  role,
  initialSession,
}: {
  onClose: () => void
  instructorName: string
  role: string
  initialSession?: InitialSession
}) {
  const [studentPilotLabel, setStudentPilotLabel] = useState(initialSession?.studentId || "N/A")
  const [resolvedInstructorName, setResolvedInstructorName] = useState(instructorName)
  const [lessonNo, setLessonNo] = useState(initialSession?.lessonNo || "")
  const [rpc] = useState(initialSession?.rpc || "")
  const [duration] = useState(initialSession?.duration || "")
  const [date] = useState(initialSession?.date || new Date().toISOString().split("T")[0])
  const [formData, setFormData] = useState<Record<string, { duration: string; remark: string }>>({})
  const [signatureDataUrl, setSignatureDataUrl] = useState("")

  const isInstructor = role?.toLowerCase() === "instructor"
  const canEditLessonNo = !isInstructor
  const canEditInstructorSection = isInstructor

  useEffect(() => {
    const resolveActors = async () => {
      let resolvedStudentId = String(initialSession?.studentId || "").trim()
      let resolvedStudentLabel = resolvedStudentId

      if (!isInstructor) {
        const { data: authData } = await supabase.auth.getUser()
        if (!authData.user) return
        const { data } = await supabase
          .from("profiles")
          .select("student_id, email")
          .eq("id", authData.user.id)
          .single()
        if (data) {
          resolvedStudentId = String(data.student_id || "").trim()
          resolvedStudentLabel = resolvedStudentId || String(data.email || "").trim()
        }
      }

      if (resolvedStudentId) {
        const studentCandidates = [...new Set([resolvedStudentId, resolvedStudentId.toUpperCase(), resolvedStudentId.toLowerCase()])]
        const { data: studentRows } = await supabase
          .from("student_info")
          .select("student_id, full_name")
          .in("student_id", studentCandidates)
          .limit(1)

        const fullName = String(studentRows?.[0]?.full_name || "").trim()
        if (fullName) resolvedStudentLabel = fullName
      }
      setStudentPilotLabel(resolvedStudentLabel || resolvedStudentId || "N/A")

      const rawInstructorId = String(initialSession?.instructorId || "").trim()
      if (!rawInstructorId) {
        setResolvedInstructorName(instructorName)
        return
      }

      const candidates = [...new Set([rawInstructorId, rawInstructorId.toUpperCase(), rawInstructorId.toLowerCase()])]
      const { data } = await supabase
        .from("instructor_info")
        .select("full_name, instructor_id")
        .in("instructor_id", candidates)
        .limit(1)

      if (data?.[0]?.full_name) setResolvedInstructorName(data[0].full_name)
      else setResolvedInstructorName(rawInstructorId || instructorName)
    }

    resolveActors()
  }, [initialSession, instructorName, isInstructor])

  const handleUpdate = (item: string, field: "duration" | "remark", value: string) => {
    if (!canEditInstructorSection) return
    setFormData((prev) => ({ ...prev, [item]: { ...prev[item], [field]: value } }))
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="bg-blue-900 p-2 rounded-lg text-white"><Plane className="size-5 -rotate-45" /></div>
            <div>
              <h2 className="text-xl font-black italic uppercase text-slate-900">CPL Flight Training Sheet</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Commercial Pilot License</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#FDFDFD]">
          <div className="space-y-8">
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-opacity ${canEditLessonNo ? "opacity-100" : "opacity-55"}`}>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><User size={12} /> Student Pilot</label>
                <input disabled value={studentPilotLabel} className="w-full p-2 rounded-lg text-sm font-bold text-slate-500 cursor-not-allowed bg-slate-100" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><PenTool size={12} /> Flight Instructor</label>
                <input disabled value={resolvedInstructorName} className="w-full p-2 rounded-lg text-sm font-bold text-slate-500 cursor-not-allowed bg-slate-100" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Hash size={12} /> Lesson No.</label>
                <input
                  disabled={!canEditLessonNo}
                  type="text"
                  value={lessonNo}
                  onChange={(e) => setLessonNo(e.target.value)}
                  placeholder="e.g. CP8"
                  className={`w-full p-2 rounded-lg border-none text-sm font-bold ${!canEditLessonNo ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-slate-50"}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Calendar size={12} /> Date</label>
                <input disabled type="date" value={date} className="w-full p-2 rounded-lg border-none text-sm font-bold bg-slate-100 cursor-not-allowed text-slate-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Plane size={12} /> RPC</label>
                <input disabled type="text" value={rpc} className="w-full p-2 rounded-lg border-none text-sm font-bold bg-slate-100 cursor-not-allowed text-slate-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Clock size={12} /> Duration</label>
                <input disabled type="text" value={duration} className="w-full p-2 rounded-lg border-none text-sm font-bold bg-slate-100 cursor-not-allowed text-slate-500" />
              </div>
            </div>

            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase text-blue-900 tracking-[0.2em] border-l-4 border-blue-900 pl-3">CPL Flight Training Items (Duration + Remarks)</h3>
              <div className={`space-y-3 transition-opacity ${canEditInstructorSection ? "opacity-100" : "opacity-55"}`}>
                {CPL_ITEMS.map((item) => (
                  <div key={item} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                      <span className="text-sm font-bold text-slate-700 w-full md:w-[40%]">{item}</span>
                      <input
                        type="text"
                        placeholder="Duration (e.g. 0:30)"
                        disabled={!canEditInstructorSection}
                        value={formData[item]?.duration || ""}
                        onChange={(e) => handleUpdate(item, "duration", e.target.value)}
                        className={`w-full md:w-44 rounded-lg border text-[11px] p-2 focus:ring-1 focus:ring-blue-900 ${!canEditInstructorSection ? "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500" : "bg-slate-50 border-slate-200"}`}
                      />
                      <input
                        type="text"
                        placeholder="Remarks..."
                        disabled={!canEditInstructorSection}
                        value={formData[item]?.remark || ""}
                        className={`flex-1 rounded-lg border-none text-[11px] p-2 focus:ring-1 focus:ring-blue-900 ${!canEditInstructorSection ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-slate-50"}`}
                        onChange={(e) => handleUpdate(item, "remark", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className={`transition-opacity ${canEditInstructorSection ? "opacity-100" : "opacity-55"}`}>
              <InstructorSignaturePad
                value={signatureDataUrl}
                onChange={setSignatureDataUrl}
                disabled={!canEditInstructorSection}
              />
            </div>

            <div className="pt-8 pb-4 flex justify-end gap-4 border-t border-slate-200 mt-8">
              <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                {canEditLessonNo ? "Close Sheet" : "Cancel"}
              </button>
              {canEditInstructorSection && (
                <button
                  className="px-6 py-3 rounded-xl font-black bg-blue-900 text-white hover:bg-blue-800 transition-colors flex items-center gap-2 uppercase tracking-wide"
                  onClick={() => {
                    if (!signatureDataUrl) {
                      alert("Instructor signature is required before submitting.")
                      return
                    }
                    onClose()
                  }}
                >
                  <ClipboardCheck size={18} />
                  Submit Debriefing
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
