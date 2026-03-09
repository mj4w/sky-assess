"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { usePilotData } from "@/hooks/usePilotData"
import { supabase } from "@/lib/supabase"

interface SessionItem {
  id: string
  aircraft: string
  timeLabel: string
  flightType: string
}

function slotToHour(slot: number) {
  const hour = 6 + slot
  return `${hour.toString().padStart(2, "0")}:00`
}

export default function FlightLogsPage() {
  const { pilotData, loading } = usePilotData()
  const searchParams = useSearchParams()
  const highlightedId = searchParams.get("assignment_id")
  const [sessions, setSessions] = useState<SessionItem[]>([])

  useEffect(() => {
    const loadSessions = async () => {
      if (!pilotData || pilotData.role !== "student") {
        setSessions([])
        return
      }

      const today = new Date()
      const todayDate = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`
      const studentId = String(pilotData.student_id || "").trim()
      if (!studentId) {
        setSessions([])
        return
      }

      const idCandidates = [...new Set([studentId, studentId.toUpperCase(), studentId.toLowerCase()])]
      const { data, error } = await supabase
        .from("flight_ops_assignments")
        .select("id, aircraft_type, aircraft_registry, slot_index, slot_span, flight_type")
        .eq("op_date", todayDate)
        .in("student_id", idCandidates)
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
          aircraft: `${row.aircraft_type} ${row.aircraft_registry}`,
          timeLabel: `${slotToHour(start)} - ${slotToHour(end)}`,
          flightType: String(row.flight_type || "TBD"),
        }
      })
      setSessions(nextSessions)
    }

    loadSessions()
  }, [pilotData])

  if (loading || !pilotData) {
    return <div className="p-8 text-sm text-slate-500">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-8 lg:p-12 space-y-6">
      <div>
        <Link
          href={`/dashboard/${pilotData.role}/${pilotData.id}`}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-900 transition-colors text-[10px] font-black uppercase tracking-[0.2em] mb-4"
        >
          <ArrowLeft size={14} /> Back to Terminal
        </Link>
        <h1 className="text-3xl font-black italic uppercase text-slate-900 tracking-tight">
          Flight <span className="text-blue-900">Logs</span>
        </h1>
        <p className="text-slate-400 text-sm font-medium">Assigned sessions from Flight Operations</p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-sm text-slate-500">
          No assigned sessions for today.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`rounded-2xl border p-4 ${
                highlightedId === session.id
                  ? "border-blue-900 bg-blue-50/40"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Session</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{session.aircraft}</p>
              <p className="text-xs text-slate-600 mt-1">{session.timeLabel} - {session.flightType}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
