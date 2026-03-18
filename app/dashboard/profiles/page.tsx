"use client"

import { useEffect, useMemo, useState } from "react"
import { BellRing, CalendarDays, CheckCircle2, CircleDashed, Loader2, UserRound, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePilotData } from "@/hooks/usePilotData"
import { supabase } from "@/lib/supabase"
import { DebriefCourseModal } from "@/components/DebriefCourseModal"

interface AssignmentRow {
  id: string
  op_date: string
  student_id: string
  aircraft_type: string | null
  aircraft_registry: string | null
  slot_index: number | null
  slot_span: number | null
  lesson_no: string | null
  notify: boolean | null
  notification_read_instructor: boolean | null
}

interface StudentInfoRow {
  student_id: string
  full_name: string | null
}

interface StudentProfileRow {
  student_id: string | null
  email: string | null
}

interface CourseDebriefRow {
  assignment_id: string | null
  student_id: string | null
  op_date: string | null
}

interface FlightDayGroup {
  date: string
  label: string
  students: {
    assignmentId: string
    studentId: string
    studentName: string
    timeLabel: string
    aircraftType: string
    aircraftRegistry: string
    lessonNo: string
    notified: boolean
    debriefCompleted: boolean
    readyForDebrief: boolean
  }[]
}

function formatDateLabel(opDate: string, todayIso: string) {
  const dateObj = new Date(`${opDate}T00:00:00`)
  const human = dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric" })
  return opDate === todayIso ? `Today's Flight (${human})` : `${human} Flight`
}

function formatDateMeta(opDate: string) {
  const dateObj = new Date(`${opDate}T00:00:00`)
  return dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function slotToHour(slot: number) {
  const hour = 6 + slot
  return `${hour.toString().padStart(2, "0")}:00`
}

export default function InstructorDirectoryPage() {
  const router = useRouter()
  const { pilotData, loading } = usePilotData()
  const [groups, setGroups] = useState<FlightDayGroup[]>([])
  const [studentEmails, setStudentEmails] = useState<Record<string, string>>({})
  const [openingDebriefId, setOpeningDebriefId] = useState<string | null>(null)
  const [notifyingAssignmentId, setNotifyingAssignmentId] = useState<string | null>(null)
  const [showDebriefModal, setShowDebriefModal] = useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("")
  const [noticeMessage, setNoticeMessage] = useState<string>("")
  const [evaluationNotifyCount, setEvaluationNotifyCount] = useState(0)
  const [schedulePageByDate, setSchedulePageByDate] = useState<Record<string, number>>({})
  const [datePage, setDatePage] = useState(1)
  const schedulePageSize = 3
  const datePageSize = 3

  const instructorDisplayName = useMemo(() => {
    const name = String(pilotData?.full_name || "").trim()
    if (name) return name
    return String(pilotData?.instructor_id || "").trim() || "Instructor"
  }, [pilotData])

  useEffect(() => {
    if (!pilotData) return
    if (pilotData.role === "instructor") return
    if (pilotData.role === "admin") {
      router.replace("/dashboard/admin")
      return
    }
    router.replace(`/dashboard/${pilotData.role}/${pilotData.id}`)
  }, [pilotData, router])

  useEffect(() => {
    const loadDirectory = async () => {
      if (!pilotData || pilotData.role !== "instructor") {
        setGroups([])
        return
      }

      const instructorId = String(pilotData.instructor_id || "").trim()
      if (!instructorId) {
        setGroups([])
        return
      }

      const idCandidates = [...new Set([instructorId, instructorId.toUpperCase(), instructorId.toLowerCase()])]
      const now = new Date()
      const todayIso = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`

      const { data, error } = await supabase
        .from("flight_ops_assignments")
        .select("id, op_date, student_id, aircraft_type, aircraft_registry, slot_index, slot_span, lesson_no, notify, notification_read_instructor")
        .in("instructor_id", idCandidates)
        .lte("op_date", todayIso)
        .order("op_date", { ascending: false })
        .order("slot_index", { ascending: true })

      if (error || !data) {
        setGroups([])
        return
      }

      const rows = (data as AssignmentRow[]).filter((row) => String(row.op_date || "").trim())
      const studentIds = [...new Set(rows.map((row) => String(row.student_id || "").trim()).filter(Boolean))]
      const studentCandidates = [...new Set(studentIds.flatMap((id) => [id, id.toUpperCase(), id.toLowerCase()]))]
      const assignmentIds = [...new Set(rows.map((row) => String(row.id || "").trim()).filter(Boolean))]
      const nameMap: Record<string, string> = {}
      const emailMap: Record<string, string> = {}
      const completedAssignmentIds = new Set<string>()
      const completedStudentDateKeys = new Set<string>()

      if (studentCandidates.length > 0) {
        const { data: studentRows } = await supabase
          .from("student_info")
          .select("student_id, full_name")
          .in("student_id", studentCandidates)

        ;(studentRows as StudentInfoRow[] | null)?.forEach((row) => {
          const key = String(row.student_id || "").toLowerCase()
          const value = String(row.full_name || "").trim()
          if (key && value) nameMap[key] = value
        })

        const { data: profileRows } = await supabase
          .from("profiles")
          .select("student_id, email")
          .in("student_id", studentCandidates)

        ;(profileRows as StudentProfileRow[] | null)?.forEach((row) => {
          const key = String(row.student_id || "").toLowerCase()
          const value = String(row.email || "").trim()
          if (key && value) emailMap[key] = value
        })
      }
      setStudentEmails(emailMap)

      if (assignmentIds.length > 0 || studentCandidates.length > 0) {
        const debriefQuery = supabase
          .from("course_debriefs")
          .select("assignment_id, student_id, op_date")
          .order("created_at", { ascending: false })
          .limit(500)

        const { data: debriefRows } = assignmentIds.length > 0
          ? await debriefQuery.in("assignment_id", assignmentIds)
          : await debriefQuery.in("student_id", studentCandidates)

        ;(debriefRows as CourseDebriefRow[] | null)?.forEach((row) => {
          const assignmentId = String(row.assignment_id || "").trim()
          if (assignmentId) completedAssignmentIds.add(assignmentId)

          const studentId = String(row.student_id || "").trim().toLowerCase()
          const opDate = String(row.op_date || "").trim()
          if (studentId && opDate) completedStudentDateKeys.add(`${studentId}__${opDate}`)
        })
      }

      const { data: evalRows } = await supabase
        .from("student_instructor_feedback")
        .select("id")
        .in("instructor_id", idCandidates)
        .is("notify", null)
      setEvaluationNotifyCount((evalRows || []).length)

      const grouped: Record<string, FlightDayGroup["students"]> = {}
      rows.forEach((row) => {
        const date = String(row.op_date)
        const studentIdRaw = String(row.student_id || "").trim()
        if (!date || !studentIdRaw) return
        if (!grouped[date]) grouped[date] = []
        const displayName = nameMap[studentIdRaw.toLowerCase()] || studentIdRaw
        const start = Number(row.slot_index) || 0
        const span = Number(row.slot_span) || 1
        const end = start + span
        const lessonNo = String(row.lesson_no || "").trim()
        const assignmentId = String(row.id || "")
        const studentDateKey = `${studentIdRaw.toLowerCase()}__${date}`
        const isDebriefCompleted = completedAssignmentIds.has(assignmentId) || completedStudentDateKeys.has(studentDateKey)
        const nextValue = {
          assignmentId,
          studentId: studentIdRaw,
          studentName: displayName,
          timeLabel: `${slotToHour(start)} - ${slotToHour(end)}`,
          aircraftType: String(row.aircraft_type || "N/A"),
          aircraftRegistry: String(row.aircraft_registry || "N/A"),
          lessonNo,
          notified: Boolean(row.notify),
          debriefCompleted: isDebriefCompleted,
          readyForDebrief: Boolean(lessonNo),
        }
        const exists = grouped[date].some((item) => item.assignmentId === assignmentId)
        if (!exists) grouped[date].push(nextValue)
      })

      const nextGroups: FlightDayGroup[] = Object.entries(grouped).map(([date, students]) => ({
        date,
        label: formatDateLabel(date, todayIso),
        students: [...students].sort((left, right) => left.timeLabel.localeCompare(right.timeLabel)),
      }))
      nextGroups.sort((a, b) => (a.date < b.date ? 1 : -1))
      setGroups(nextGroups)
      setDatePage(1)
      setSchedulePageByDate(() =>
        nextGroups.reduce<Record<string, number>>((acc, group) => {
          acc[group.date] = 1
          return acc
        }, {})
      )
    }

    loadDirectory()
  }, [pilotData])

  if (loading || !pilotData) return <div className="p-8 text-sm text-slate-500 dark:text-slate-400">Loading...</div>
  if (pilotData.role !== "instructor") return <div className="p-8 text-sm text-slate-500 dark:text-slate-400">Redirecting...</div>

  const totalStudents = groups.reduce((count, group) => count + group.students.length, 0)
  const pendingNotifyCount = groups.reduce((count, group) => count + group.students.filter((student) => !student.readyForDebrief && !student.notified).length, 0)
  const totalDatePages = Math.max(1, Math.ceil(groups.length / datePageSize))
  const paginatedGroups = groups.slice((datePage - 1) * datePageSize, datePage * datePageSize)

  const handleOpenEvaluation = async () => {
    if (!pilotData?.instructor_id) {
      router.push("/dashboard/evaluate")
      return
    }

    const rawId = String(pilotData.instructor_id).trim()
    const idCandidates = [...new Set([rawId.toLowerCase(), rawId.toUpperCase(), rawId])]
    await supabase
      .from("student_instructor_feedback")
      .update({ notify: true })
      .in("instructor_id", idCandidates)
      .is("notify", null)

    setEvaluationNotifyCount(0)
    router.push("/dashboard/evaluate")
  }
  const now = new Date()
  const todayIso = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`

  const handleOpenDebrief = async (assignmentId: string) => {
    if (!pilotData?.instructor_id || !assignmentId || openingDebriefId) return
    setOpeningDebriefId(assignmentId)
    setSelectedAssignmentId(assignmentId)
    setShowDebriefModal(true)
    setOpeningDebriefId(null)
  }

  const handleNotifyStudent = async (student: FlightDayGroup["students"][number]) => {
    if (notifyingAssignmentId) return
    if (student.notified) {
      setNoticeMessage(`${student.studentName} was already notified today.`)
      return
    }
    setNotifyingAssignmentId(student.assignmentId)
    setNoticeMessage("")
    await supabase
      .from("flight_ops_assignments")
      .update({ notification_read_student: false, notify: true })
      .eq("id", student.assignmentId)

    const email = studentEmails[student.studentId.toLowerCase()]
    if (email) {
      const response = await fetch("/api/reminders/lesson-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, studentName: student.studentName }),
      })
      if (response.ok) setNoticeMessage(`Reminder sent to ${student.studentName}.`)
      else {
        const result = await response.json().catch(() => ({}))
        setNoticeMessage(result?.error || `Failed to send reminder to ${student.studentName}.`)
      }
    } else {
      setNoticeMessage(`${student.studentName} has no registered email yet. Ask the student to register first.`)
    }
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        students: group.students.map((item) =>
          item.assignmentId === student.assignmentId ? { ...item, notified: true } : item
        ),
      }))
    )
    setNotifyingAssignmentId(null)
  }

  const handleNotifyAllPending = async () => {
    const pending = groups.flatMap((group) => group.students.filter((student) => !student.readyForDebrief && !student.notified))
    if (pending.length === 0 || notifyingAssignmentId) return
    setNotifyingAssignmentId("bulk")
    setNoticeMessage("")
    let sentCount = 0
    let missingEmailCount = 0

    for (const student of pending) {
      await supabase.from("flight_ops_assignments").update({ notification_read_student: false }).eq("id", student.assignmentId)
      await supabase.from("flight_ops_assignments").update({ notify: true }).eq("id", student.assignmentId)
      const email = studentEmails[student.studentId.toLowerCase()]
      if (!email) {
        missingEmailCount += 1
        continue
      }
      const response = await fetch("/api/reminders/lesson-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, studentName: student.studentName }),
      })
      if (response.ok) sentCount += 1
    }
    setNoticeMessage(`Reminders sent: ${sentCount}. Missing registered email: ${missingEmailCount}.`)
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        students: group.students.map((item) => (!item.readyForDebrief ? { ...item, notified: true } : item)),
      }))
    )
    setNotifyingAssignmentId(null)
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/60 dark:shadow-slate-950/50 overflow-hidden">
          <div className="px-6 py-6 md:px-8 md:py-8 border-b border-slate-100 dark:border-slate-700 bg-linear-to-r from-blue-950 via-blue-900 to-blue-800">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100/90">Flight Instructor Dashboard</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white">{`Instructor. ${instructorDisplayName}`}</h1>
            <p className="mt-1 text-xs font-semibold text-blue-100/80">Flight assignments, debrief status, and student action tracking</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={handleOpenEvaluation} className="inline-flex items-center gap-2 rounded-lg bg-white text-blue-900 hover:bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-colors">
                Open Evaluation
                {evaluationNotifyCount > 0 ? (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-black">
                    {evaluationNotifyCount}
                  </span>
                ) : null}
              </button>
              <button type="button" onClick={handleNotifyAllPending} disabled={pendingNotifyCount === 0 || Boolean(notifyingAssignmentId)} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <BellRing size={14} />
                Notify Pending ({pendingNotifyCount})
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Scheduled Days</p>
                <p className="mt-1 text-2xl font-black text-white">{groups.length}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Student Slots</p>
                <p className="mt-1 text-2xl font-black text-white">{totalStudents}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Pending Notifications</p>
                <p className="mt-1 text-2xl font-black text-white">{pendingNotifyCount}</p>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/80">
            {noticeMessage ? <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800">{noticeMessage}</div> : null}
            {groups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-10 text-center">
                <p className="text-base font-bold text-slate-700 dark:text-slate-200">No flight assignments found.</p>
              </div>
            ) : (
              paginatedGroups.map((group) => (
                <section
                  key={group.date}
                  className={`rounded-2xl border overflow-hidden shadow-sm ${
                    group.date === todayIso
                      ? "border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-slate-900/90 shadow-blue-100 dark:shadow-slate-950/40"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  <div
                    className={`px-5 py-4 border-b ${
                      group.date === todayIso
                        ? "border-blue-200 dark:border-blue-800 bg-linear-to-r from-blue-100 to-blue-50 dark:from-slate-800 dark:to-slate-900"
                        : "border-slate-100 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h2
                        className={`text-xl md:text-2xl font-black tracking-tight ${
                          group.date === todayIso ? "text-slate-900 dark:text-blue-100" : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {group.label}
                      </h2>
                      {group.date === todayIso ? (
                        <span className="inline-flex items-center rounded-full bg-blue-900 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                          Today
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={`mt-1 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                        group.date === todayIso ? "text-slate-600 dark:text-blue-200/80" : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <CalendarDays size={14} />
                      {formatDateMeta(group.date)}
                      <span className="mx-1">•</span>
                      <Users size={14} />
                      {group.students.length} Student{group.students.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="px-5 py-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.students
                      .slice(
                        ((schedulePageByDate[group.date] || 1) - 1) * schedulePageSize,
                        ((schedulePageByDate[group.date] || 1) - 1) * schedulePageSize + schedulePageSize
                      )
                      .map((student) => (
                      <div key={`${group.date}-${student.assignmentId}`} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <UserRound size={14} className="text-slate-400" />
                          {student.studentName}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded-md bg-slate-50 dark:bg-slate-800 px-2 py-1.5">
                            <p className="font-bold text-slate-500 dark:text-slate-400">Time</p>
                            <p className="font-black text-slate-800 dark:text-slate-100">{student.timeLabel}</p>
                          </div>
                          <div className="rounded-md bg-slate-50 dark:bg-slate-800 px-2 py-1.5">
                            <p className="font-bold text-slate-500 dark:text-slate-400">Aircraft</p>
                            <p className="font-black text-slate-800 dark:text-slate-100">{student.aircraftType}</p>
                          </div>
                          <div className="rounded-md bg-slate-50 dark:bg-slate-800 px-2 py-1.5">
                            <p className="font-bold text-slate-500 dark:text-slate-400">RPC</p>
                            <p className="font-black text-slate-800 dark:text-slate-100">{student.aircraftRegistry}</p>
                          </div>
                          <div className="rounded-md bg-slate-50 dark:bg-slate-800 px-2 py-1.5">
                            <p className="font-bold text-slate-500 dark:text-slate-400">Lesson No.</p>
                            <p className="font-black text-slate-800 dark:text-slate-100">{student.lessonNo || "Pending"}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {student.debriefCompleted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                              <CheckCircle2 size={12} />
                              Lesson No. Submitted
                            </span>
                          ) : student.readyForDebrief ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                              <CircleDashed size={12} />
                              Ready for Debrief
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                              <CircleDashed size={12} />
                              Awaiting Lesson No.
                            </span>
                          )}
                          {student.notified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                              <BellRing size={12} />
                              Notified Today
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDebrief(student.assignmentId)}
                            disabled={student.debriefCompleted || !student.readyForDebrief || openingDebriefId === student.assignmentId}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider disabled:cursor-not-allowed ${
                              student.debriefCompleted
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700 disabled:opacity-100 disabled:pointer-events-none"
                                : "bg-blue-900 hover:bg-blue-800 text-white disabled:opacity-40"
                            }`}
                          >
                            {openingDebriefId === student.assignmentId ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            {student.debriefCompleted ? "Debrief Done" : "Debrief"}
                          </button>
                          <button type="button" onClick={() => handleNotifyStudent(student)} disabled={student.readyForDebrief || student.notified || Boolean(notifyingAssignmentId)} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed">
                            {notifyingAssignmentId === student.assignmentId ? <Loader2 size={12} className="animate-spin" /> : <BellRing size={12} />}
                            Notify
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {group.students.length > schedulePageSize ? (
                    <div className="px-5 pb-4 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSchedulePageByDate((prev) => ({
                            ...prev,
                            [group.date]: Math.max((prev[group.date] || 1) - 1, 1),
                          }))
                        }
                        disabled={(schedulePageByDate[group.date] || 1) <= 1}
                        className="h-8 rounded-md border border-slate-300 px-3 text-[10px] font-black uppercase tracking-wider text-slate-700 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Page {schedulePageByDate[group.date] || 1} / {Math.ceil(group.students.length / schedulePageSize)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSchedulePageByDate((prev) => ({
                            ...prev,
                            [group.date]: Math.min(
                              (prev[group.date] || 1) + 1,
                              Math.ceil(group.students.length / schedulePageSize)
                            ),
                          }))
                        }
                        disabled={(schedulePageByDate[group.date] || 1) >= Math.ceil(group.students.length / schedulePageSize)}
                        className="h-8 rounded-md border border-slate-300 px-3 text-[10px] font-black uppercase tracking-wider text-slate-700 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </section>
              ))
            )}
            {groups.length > datePageSize ? (
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDatePage((previous) => Math.max(previous - 1, 1))}
                  disabled={datePage <= 1}
                  className="h-8 rounded-md border border-slate-300 px-3 text-[10px] font-black uppercase tracking-wider text-slate-700 disabled:opacity-40"
                >
                  Prev Dates
                </button>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Dates Page {datePage} / {totalDatePages}
                </span>
                <button
                  type="button"
                  onClick={() => setDatePage((previous) => Math.min(previous + 1, totalDatePages))}
                  disabled={datePage >= totalDatePages}
                  className="h-8 rounded-md border border-slate-300 px-3 text-[10px] font-black uppercase tracking-wider text-slate-700 disabled:opacity-40"
                >
                  Next Dates
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <DebriefCourseModal open={showDebriefModal} onClose={() => setShowDebriefModal(false)} assignmentId={selectedAssignmentId} />
    </div>
  )
}
