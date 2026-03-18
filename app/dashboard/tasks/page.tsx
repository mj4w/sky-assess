"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { usePilotData } from "@/hooks/usePilotData"
import { supabase } from "@/lib/supabase"

interface SessionItem {
  id: string
  aircraft: string
  aircraftRegistry: string
  opDate: string
  instructorId: string
  duration: string
  timeLabel: string
  flightType: string
  lessonNo: string
}

function slotToHour(slot: number) {
  const hour = 6 + slot
  return `${hour.toString().padStart(2, "0")}:00`
}

function TasksPageContent() {
  const router = useRouter()
  const { pilotData, loading } = usePilotData()
  const searchParams = useSearchParams()
  const highlightedId = searchParams.get("assignment_id")
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [lessonInputs, setLessonInputs] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [instructorNames, setInstructorNames] = useState<Record<string, string>>({})
  const [idCandidates, setIdCandidates] = useState<string[]>([])

  useEffect(() => {
    if (!pilotData) return
    if (pilotData.role === "student") return
    if (pilotData.role === "admin") {
      router.replace("/dashboard/admin")
      return
    }
    router.replace(`/dashboard/${pilotData.role}/${pilotData.id}`)
  }, [pilotData, router])

  useEffect(() => {
    const loadSessions = async () => {
      if (!pilotData || pilotData.role !== "student") {
        setSessions([])
        return
      }

      const studentId = String(pilotData.student_id || "").trim()
      if (!studentId) {
        setSessions([])
        return
      }

      const studentIdCandidates = [...new Set([studentId, studentId.toUpperCase(), studentId.toLowerCase()])]
      setIdCandidates(studentIdCandidates)
      const { data, error } = await supabase
        .from("flight_ops_assignments")
        .select("id, op_date, aircraft_type, aircraft_registry, slot_index, slot_span, flight_type, instructor_id, lesson_no")
        .in("student_id", studentIdCandidates)
        .order("op_date", { ascending: false })
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
          aircraftRegistry: String(row.aircraft_registry || ""),
          opDate: String(row.op_date || ""),
          instructorId: String(row.instructor_id || ""),
          duration: `${span} Hour${span > 1 ? "s" : ""}`,
          timeLabel: `${slotToHour(start)} - ${slotToHour(end)}`,
          flightType: String(row.flight_type || "TBD"),
          lessonNo: String(row.lesson_no || ""),
        }
      })
      setSessions(nextSessions)
      setLessonInputs(
        nextSessions.reduce<Record<string, string>>((acc, session) => {
          acc[session.id] = session.lessonNo
          return acc
        }, {})
      )

      const instructorIds = [...new Set(nextSessions.map((session) => session.instructorId).filter(Boolean))]
      if (instructorIds.length > 0) {
        const instructorCandidates = [...new Set(instructorIds.flatMap((id) => [id, id.toUpperCase(), id.toLowerCase()]))]
        const { data: instructorRows } = await supabase
          .from("instructor_info")
          .select("instructor_id, full_name")
          .in("instructor_id", instructorCandidates)

        if (instructorRows) {
          const map: Record<string, string> = {}
          instructorRows.forEach((row) => {
            const key = String(row.instructor_id || "").toLowerCase()
            const value = String(row.full_name || "").trim()
            if (key && value) map[key] = value
          })
          setInstructorNames(map)
        }
      }
    }

    loadSessions()
  }, [pilotData])

  const handleLessonSave = async (session: SessionItem) => {
    if (idCandidates.length === 0 || savingId) return
    setSavingId(session.id)
    setSaveMessage(null)
    const lessonNo = String(lessonInputs[session.id] || "").trim()

    const { error } = await supabase
      .from("flight_ops_assignments")
      .update({ lesson_no: lessonNo || null })
      .eq("id", session.id)
      .in("student_id", idCandidates)

    if (error) {
      setSaveMessage(error.message)
      setSavingId(null)
      return
    }

    setSessions((prev) =>
      prev.map((item) => (item.id === session.id ? { ...item, lessonNo } : item))
    )
    setSaveMessage("Lesson number saved.")
    setSavingId(null)
  }

  if (loading || !pilotData) {
    return <div className="p-8 text-sm text-slate-500">Loading...</div>
  }
  if (pilotData.role !== "student") {
    return <div className="p-8 text-sm text-slate-500">Redirecting...</div>
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
          Assigned <span className="text-blue-900">Flight Schedule</span>
        </h1>
        <p className="text-slate-400 text-sm font-medium">Your assigned flight schedules and lesson entries</p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-sm text-slate-500">
          No assigned flights found.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`rounded-2xl border p-4 ${
                highlightedId === session.id ? "border-blue-900 bg-blue-50/40" : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned Flight</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student Pilot</p>
                  <p className="text-sm font-bold text-slate-800">{pilotData.full_name || pilotData.student_id || pilotData.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Flight Instructor</p>
                  <p className="text-sm font-bold text-slate-800">
                    {instructorNames[session.instructorId.toLowerCase()] || session.instructorId || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</p>
                  <p className="text-sm font-bold text-slate-800">{session.opDate}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">RPC</p>
                  <p className="text-sm font-bold text-slate-800">{session.aircraftRegistry}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</p>
                  <p className="text-sm font-bold text-slate-800">{session.duration}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Session</p>
                  <p className="text-sm font-bold text-slate-800">{session.timeLabel} - {session.flightType}</p>
                </div>
                <div className="space-y-1 lg:col-span-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lesson No.</p>
                  <div className="flex gap-2">
                    <input
                      value={lessonInputs[session.id] ?? ""}
                      onChange={(e) => setLessonInputs((prev) => ({ ...prev, [session.id]: e.target.value }))}
                      placeholder="e.g. 18"
                      disabled={Boolean(String(session.lessonNo || "").trim())}
                      className={`h-10 flex-1 rounded-lg border px-3 text-sm font-bold ${
                        String(session.lessonNo || "").trim()
                          ? "border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed"
                          : "border-slate-300"
                      }`}
                    />
                    {!String(session.lessonNo || "").trim() ? (
                      <button
                        type="button"
                        onClick={() => handleLessonSave(session)}
                        disabled={savingId === session.id}
                        className="h-10 px-4 rounded-lg bg-blue-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60"
                      >
                        {savingId === session.id ? "Saving..." : "Save"}
                      </button>
                    ) : (
                      <div className="h-10 px-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-widest flex items-center">
                        Saved
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {saveMessage && (
        <p className="text-xs font-semibold text-blue-700">{saveMessage}</p>
      )}
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFDFD]" />}>
      <TasksPageContent />
    </Suspense>
  )
}
