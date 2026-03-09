"use client"

import React, { useEffect, useState } from "react"
import { Plus, ArrowLeft } from "lucide-react"
import { usePilotData } from "@/hooks/usePilotData"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { AnimatePresence } from "framer-motion"
import PPLGradingForm from "./components/PPLGradingForm"
import CPLGradingForm from "./components/CPLGradingForm"

interface SessionItem {
  id: string
  aircraftType: string
  aircraftRegistry: string
  opDate: string
  slotSpan: number
  timeLabel: string
  flightType: string
  studentId: string
  instructorId: string
}

const courseMeta: Record<string, { code: string; name: string }> = {
  ppl: { code: "PPL", name: "Private Pilot License" },
  cpl: { code: "CPL", name: "Commercial Pilot License" },
  ir: { code: "IR", name: "Instrument Rating" },
  me: { code: "ME", name: "Multi-Engine Rating" },
}

function slotToHour(slot: number) {
  const hour = 6 + slot
  return `${hour.toString().padStart(2, "0")}:00`
}

export default function PPLDebriefPage() {
  const params = useParams<{ course?: string }>()
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null)
  const { pilotData, loading } = usePilotData()
  const searchParams = useSearchParams()
  const assignmentId = searchParams.get("assignment_id")
  const selectedCourse = String(params?.course || "ppl").toLowerCase()
  const selectedMeta = courseMeta[selectedCourse] || { code: selectedCourse.toUpperCase(), name: "Debriefing Course" }

  useEffect(() => {
    const loadSessions = async () => {
      if (!pilotData || (pilotData.role !== "instructor" && pilotData.role !== "student")) {
        setSessions([])
        return
      }

      const today = new Date()
      const todayDate = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`
      const idColumn = pilotData.role === "instructor" ? "instructor_id" : "student_id"
      const idValueRaw = pilotData.role === "instructor" ? pilotData.instructor_id : pilotData.student_id
      const idValue = String(idValueRaw || "").trim()
      if (!idValue) {
        setSessions([])
        return
      }

      const idCandidates = [...new Set([idValue, idValue.toUpperCase(), idValue.toLowerCase()])]
      const { data, error } = await supabase
        .from("flight_ops_assignments")
        .select("id, aircraft_type, aircraft_registry, slot_index, slot_span, flight_type, student_id, instructor_id")
        .eq("op_date", todayDate)
        .in(idColumn, idCandidates)
        .order("slot_index", { ascending: true })

      if (error || !data) {
        setSessions([])
        return
      }

      const nextSessions: SessionItem[] = data.map((row) => {
        const start = Number(row.slot_index) || 0
        const span = Number(row.slot_span) || 1
        const end = start + span
        return {
          id: String(row.id),
          aircraftType: String(row.aircraft_type || ""),
          aircraftRegistry: String(row.aircraft_registry || ""),
          opDate: todayDate,
          slotSpan: span,
          timeLabel: `${slotToHour(start)} - ${slotToHour(end)}`,
          flightType: String(row.flight_type || "TBD"),
          studentId: String(row.student_id || ""),
          instructorId: String(row.instructor_id || ""),
        }
      })
      setSessions(nextSessions)
      if (assignmentId) {
        const matched = nextSessions.find((item) => item.id === assignmentId)
        if (matched) {
          setSelectedSession(matched)
          setIsFormOpen(true)
        }
      }
    }

    loadSessions()
  }, [pilotData, selectedCourse, assignmentId])

  if (loading || !pilotData) {
    return <div className="p-10 text-sm text-slate-400">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-8 lg:p-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Link
            href={`/dashboard/${pilotData?.role}/${pilotData?.id}`}
            className="flex items-center gap-2 text-slate-400 hover:text-blue-900 transition-colors text-[10px] font-black uppercase tracking-[0.2em] mb-4"
          >
            <ArrowLeft size={14} /> Back to Terminal
          </Link>
          <h1 className="text-3xl font-black italic uppercase text-slate-900 tracking-tight">
            {selectedMeta.code} <span className="text-blue-900">Sessions</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            {selectedMeta.name} Grading History
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-[2rem] h-64 flex flex-col items-center justify-center bg-white/50">
          <div className="bg-slate-100 p-4 rounded-full mb-4">
            <Plus className="text-slate-300" size={32} />
          </div>
          <p className="text-slate-400 text-sm font-medium italic">
            No recent sessions found. Start a new evaluation to begin.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => {
                setSelectedSession(session)
                setIsFormOpen(true)
              }}
              className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-900 hover:bg-blue-50/30 transition-all"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Session</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{session.aircraftType} {session.aircraftRegistry}</p>
              <p className="text-xs text-slate-600 mt-1">{session.timeLabel} - {session.flightType}</p>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isFormOpen && selectedSession && (
          selectedCourse === "cpl" ? (
            <CPLGradingForm
              key={selectedSession.id}
              onClose={() => setIsFormOpen(false)}
              instructorName={pilotData?.full_name || pilotData?.instructor_id || pilotData?.email || "Instructor"}
              role={pilotData?.role || "student"}
              initialSession={{
                date: selectedSession.opDate,
                rpc: selectedSession.aircraftRegistry,
                duration: `${selectedSession.slotSpan} Hour${selectedSession.slotSpan > 1 ? "s" : ""}`,
                flightType: selectedSession.flightType,
                timeLabel: selectedSession.timeLabel,
                studentId: selectedSession.studentId,
                instructorId: selectedSession.instructorId,
              }}
            />
          ) : (
            <PPLGradingForm
              key={selectedSession.id}
              onClose={() => setIsFormOpen(false)}
              instructorName={pilotData?.full_name || pilotData?.instructor_id || pilotData?.email || "Instructor"}
              role={pilotData?.role || "student"}
              initialSession={{
                date: selectedSession.opDate,
                rpc: selectedSession.aircraftRegistry,
                duration: `${selectedSession.slotSpan} Hour${selectedSession.slotSpan > 1 ? "s" : ""}`,
                flightType: selectedSession.flightType,
                timeLabel: selectedSession.timeLabel,
                studentId: selectedSession.studentId,
                instructorId: selectedSession.instructorId,
              }}
            />
          )
        )}
      </AnimatePresence>
    </div>
  )
}
