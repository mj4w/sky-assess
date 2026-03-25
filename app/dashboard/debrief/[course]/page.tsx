"use client"

import React, { Suspense, useEffect, useState } from "react"
import { Plus, ArrowLeft } from "lucide-react"
import { usePilotData } from "@/hooks/usePilotData"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { AnimatePresence } from "framer-motion"
import PPLGradingForm from "./components/PPLGradingForm"
import CPLGradingForm from "./components/CPLGradingForm"
import IRGradingForm from "./components/IRGradingForm"
import MEGradingForm from "./components/MEGradingForm"
import StudentPPLDebriefReview from "./components/StudentPPLDebriefReview"

interface SessionItem {
  id: string
  aircraftType: string
  aircraftRegistry: string
  lessonNo: string
  debriefCompleted: boolean
  opDate: string
  slotSpan: number
  timeLabel: string
  flightType: string
  studentId: string
  instructorId: string
}

interface StudentDebriefRecord {
  id: string
  course_code: string
  lesson_no: string
  op_date: string
  rpc: string
  duration: string
  time_label: string | null
  flight_type: string | null
  student_name_snapshot: string | null
  instructor_name_snapshot: string | null
  instructor_signature_path: string
  student_signature_path: string | null
  student_signed_at: string | null
  notify: boolean | null
}

interface CourseDebriefLookupRow {
  assignment_id: string | null
  student_id: string | null
  op_date: string | null
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

function PPLDebriefPageContent() {
  const params = useParams<{ course?: string }>()
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [studentDebriefs, setStudentDebriefs] = useState<StudentDebriefRecord[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null)
  const [selectedDebrief, setSelectedDebrief] = useState<StudentDebriefRecord | null>(null)
  const [isStudentReviewOpen, setIsStudentReviewOpen] = useState(false)
  const { pilotData, loading } = usePilotData()
  const searchParams = useSearchParams()
  const assignmentId = searchParams.get("assignment_id")
  const debriefId = searchParams.get("debrief_id")
  const selectedCourse = String(params?.course || "ppl").toLowerCase()
  const selectedMeta = courseMeta[selectedCourse] || { code: selectedCourse.toUpperCase(), name: "Debriefing Course" }

  const handleSessionSubmitted = (sessionId: string) => {
    setSessions((prev) => prev.filter((item) => item.id !== sessionId))
    setSelectedSession(null)
    setIsFormOpen(false)
  }

  useEffect(() => {
    if (!pilotData || pilotData.role !== "student") return

    const loadStudentDebriefs = async () => {
      const studentId = String(pilotData.student_id || "").trim()
      if (!studentId) {
        setStudentDebriefs([])
        return
      }
      const studentCandidates = [...new Set([studentId, studentId.toLowerCase(), studentId.toUpperCase()])]
      const { data, error } = await supabase
        .from("course_debriefs")
        .select("id, course_code, lesson_no, op_date, rpc, duration, time_label, flight_type, student_name_snapshot, instructor_name_snapshot, instructor_signature_path, student_signature_path, student_signed_at, notify")
        .in("student_id", studentCandidates)
        .eq("course_code", selectedMeta.code)
        .order("op_date", { ascending: false })
        .order("created_at", { ascending: false })

      if (error || !data) {
        setStudentDebriefs([])
        return
      }

      setStudentDebriefs(
        (data as StudentDebriefRecord[]).filter((row) => String(row.instructor_signature_path || "").trim())
      )
      if (debriefId) {
        const matched = (data as StudentDebriefRecord[]).find((row) => String(row.id) === debriefId)
        if (matched) {
          if (!matched.notify) {
            await supabase.from("course_debriefs").update({ notify: true }).eq("id", matched.id)
            matched.notify = true
          }
          setSelectedDebrief(matched)
          setIsStudentReviewOpen(true)
        }
      }
    }

    loadStudentDebriefs()
  }, [pilotData, selectedMeta.code, debriefId])

  useEffect(() => {
    const loadSessions = async () => {
      if (!pilotData || (pilotData.role !== "instructor" && pilotData.role !== "student")) {
        setSessions([])
        return
      }
      if (pilotData.role === "student") return

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
      const assignmentBaseQuery = supabase
        .from("flight_ops_assignments")
        .select("id, aircraft_type, aircraft_registry, lesson_no, slot_index, slot_span, flight_type, student_id, instructor_id, op_date")
        .in(idColumn, idCandidates)

      const { data, error } = assignmentId
        ? await assignmentBaseQuery.eq("id", assignmentId).limit(1)
        : await assignmentBaseQuery.eq("op_date", todayDate).order("slot_index", { ascending: true })

      if (error || !data) {
        setSessions([])
        return
      }

      const assignmentIds = [...new Set((data || []).map((row) => String(row.id || "").trim()).filter(Boolean))]
      const studentIds = [...new Set((data || []).map((row) => String(row.student_id || "").trim()).filter(Boolean))]
      const studentCandidates = [...new Set(studentIds.flatMap((value) => [value, value.toLowerCase(), value.toUpperCase()]))]
      const completedAssignmentIds = new Set<string>()
      const completedStudentDateKeys = new Set<string>()
      const assignmentCountByStudentDate = data.reduce<Record<string, number>>((acc, row) => {
        const studentId = String(row.student_id || "").trim().toLowerCase()
        const opDate = String(row.op_date || todayDate).trim()
        if (!studentId || !opDate) return acc
        const key = `${studentId}__${opDate}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})

      if (assignmentIds.length > 0 || studentCandidates.length > 0) {
        const debriefQuery = supabase
          .from("course_debriefs")
          .select("assignment_id, student_id, op_date")
          .eq("course_code", selectedMeta.code)
          .order("created_at", { ascending: false })
          .limit(500)

        const { data: debriefRows } = assignmentIds.length > 0
          ? await debriefQuery.in("assignment_id", assignmentIds)
          : await debriefQuery.in("student_id", studentCandidates)

        ;(debriefRows as CourseDebriefLookupRow[] | null)?.forEach((row) => {
          const assignment = String(row.assignment_id || "").trim()
          if (assignment) completedAssignmentIds.add(assignment)

          const studentId = String(row.student_id || "").trim().toLowerCase()
          const opDate = String(row.op_date || "").trim()
          if (studentId && opDate) completedStudentDateKeys.add(`${studentId}__${opDate}`)
        })
      }

      const nextSessions: SessionItem[] = data.map((row) => {
        const start = Number(row.slot_index) || 0
        const span = Number(row.slot_span) || 1
        const end = start + span
        const assignmentId = String(row.id)
        const studentId = String(row.student_id || "")
        const opDate = String(row.op_date || todayDate)
        const studentDateKey = `${studentId.trim().toLowerCase()}__${opDate}`
        const canUseFallbackDateMatch = (assignmentCountByStudentDate[studentDateKey] || 0) === 1
        return {
          id: assignmentId,
          aircraftType: String(row.aircraft_type || ""),
          aircraftRegistry: String(row.aircraft_registry || ""),
          lessonNo: String(row.lesson_no || ""),
          debriefCompleted: completedAssignmentIds.has(assignmentId) || (canUseFallbackDateMatch && completedStudentDateKeys.has(studentDateKey)),
          opDate,
          slotSpan: span,
          timeLabel: `${slotToHour(start)} - ${slotToHour(end)}`,
          flightType: String(row.flight_type || "TBD"),
          studentId,
          instructorId: String(row.instructor_id || ""),
        }
      })
      const pendingSessions = nextSessions.filter((item) => !item.debriefCompleted)
      setSessions(pendingSessions)
      if (assignmentId) {
        const matched = pendingSessions.find((item) => item.id === assignmentId)
        if (matched) {
          setSelectedSession(matched)
          setIsFormOpen(true)
        }
      }
    }

    loadSessions()
  }, [pilotData, selectedMeta.code, assignmentId])

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

      {pilotData.role === "student" ? (
        studentDebriefs.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-[2rem] h-64 flex flex-col items-center justify-center bg-white/50">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <Plus className="text-slate-300" size={32} />
            </div>
            <p className="text-slate-400 text-sm font-medium italic">
              No debrief records available yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {studentDebriefs.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={async () => {
                  if (!record.notify) {
                    await supabase.from("course_debriefs").update({ notify: true }).eq("id", record.id)
                    setStudentDebriefs((prev) =>
                      prev.map((item) => (item.id === record.id ? { ...item, notify: true } : item))
                    )
                  }
                  setSelectedDebrief(record)
                  setIsStudentReviewOpen(true)
                }}
                className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-900 hover:bg-blue-50/30 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{record.course_code} Debrief Record</p>
                  {!record.notify ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                      New
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  Lesson {record.lesson_no || "N/A"} - {record.rpc}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {new Date(`${record.op_date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  {" - "}
                  {record.instructor_name_snapshot || "Instructor"}
                </p>
              </button>
            ))}
          </div>
        )
      ) : sessions.length === 0 ? (
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
              onSubmitted={() => handleSessionSubmitted(selectedSession.id)}
              instructorName={pilotData?.full_name || pilotData?.instructor_id || pilotData?.email || "Instructor"}
              role={pilotData?.role || "student"}
              initialSession={{
                assignmentId: selectedSession.id,
                lessonNo: selectedSession.lessonNo,
                date: selectedSession.opDate,
                rpc: selectedSession.aircraftRegistry,
                duration: `${selectedSession.slotSpan} Hour${selectedSession.slotSpan > 1 ? "s" : ""}`,
                flightType: selectedSession.flightType,
                timeLabel: selectedSession.timeLabel,
                studentId: selectedSession.studentId,
                instructorId: selectedSession.instructorId,
              }}
            />
          ) : selectedCourse === "ir" ? (
            <IRGradingForm
              key={selectedSession.id}
              onClose={() => setIsFormOpen(false)}
              onSubmitted={() => handleSessionSubmitted(selectedSession.id)}
              instructorName={pilotData?.full_name || pilotData?.instructor_id || pilotData?.email || "Instructor"}
              role={pilotData?.role || "student"}
              initialSession={{
                assignmentId: selectedSession.id,
                lessonNo: selectedSession.lessonNo,
                date: selectedSession.opDate,
                rpc: selectedSession.aircraftRegistry,
                duration: `${selectedSession.slotSpan} Hour${selectedSession.slotSpan > 1 ? "s" : ""}`,
                flightType: selectedSession.flightType,
                timeLabel: selectedSession.timeLabel,
                studentId: selectedSession.studentId,
                instructorId: selectedSession.instructorId,
              }}
            />
          ) : selectedCourse === "me" ? (
            <MEGradingForm
              key={selectedSession.id}
              onClose={() => setIsFormOpen(false)}
              onSubmitted={() => handleSessionSubmitted(selectedSession.id)}
              instructorName={pilotData?.full_name || pilotData?.instructor_id || pilotData?.email || "Instructor"}
              role={pilotData?.role || "student"}
              initialSession={{
                assignmentId: selectedSession.id,
                lessonNo: selectedSession.lessonNo,
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
              onSubmitted={() => handleSessionSubmitted(selectedSession.id)}
              instructorName={pilotData?.full_name || pilotData?.instructor_id || pilotData?.email || "Instructor"}
              role={pilotData?.role || "student"}
              initialSession={{
                assignmentId: selectedSession.id,
                lessonNo: selectedSession.lessonNo,
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

      <StudentPPLDebriefReview
        open={isStudentReviewOpen}
        onClose={() => setIsStudentReviewOpen(false)}
        record={selectedDebrief}
        onSigned={({ id, studentSignaturePath, studentSignedAt }) => {
          setStudentDebriefs((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, student_signature_path: studentSignaturePath, student_signed_at: studentSignedAt, notify: true }
                : item
            )
          )
          setSelectedDebrief((prev) =>
            prev && prev.id === id
              ? { ...prev, student_signature_path: studentSignaturePath, student_signed_at: studentSignedAt, notify: true }
              : prev
          )
        }}
      />
    </div>
  )
}

export default function PPLDebriefPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFDFD]" />}>
      <PPLDebriefPageContent />
    </Suspense>
  )
}
