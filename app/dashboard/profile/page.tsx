"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Award, BadgeInfo, CheckCircle2, ClipboardList, Clock3, FileText, Pencil, Save, ShieldAlert, Star, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePilotData } from "@/hooks/usePilotData"
import { supabase } from "@/lib/supabase"

interface DebriefRow {
  id: string
  course_code: string
  lesson_no: string | null
  op_date: string
  rpc: string | null
  instructor_name_snapshot: string | null
  student_signed_at: string | null
}

interface DebriefItemRow {
  debrief_id: string
  item_name: string
  grade: string | null
  remark: string | null
}

interface AssignmentRow {
  slot_span: number | null
}

const gradeWeight: Record<string, number> = {
  "S+": 4,
  S: 3,
  "S-": 2,
  NP: 1,
}

function toDateLabel(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function parseFlightHours(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export default function StudentProfilePage() {
  const router = useRouter()
  const { pilotData, loading, error } = usePilotData()
  const [debriefs, setDebriefs] = useState<DebriefRow[]>([])
  const [debriefItems, setDebriefItems] = useState<DebriefItemRow[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [profileName, setProfileName] = useState("")
  const [profileEmail, setProfileEmail] = useState("")
  const [profileFlightHours, setProfileFlightHours] = useState<number | null>(null)
  const [draftName, setDraftName] = useState("")
  const [draftStudentId, setDraftStudentId] = useState("")
  const [draftEmail, setDraftEmail] = useState("")
  const [draftFlightHours, setDraftFlightHours] = useState("")
  const [editingInfo, setEditingInfo] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMessage, setInfoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!pilotData) return
    if (pilotData.role === "student") return
    if (pilotData.role === "admin") {
      router.replace("/dashboard/admin")
      return
    }
    router.replace(`/dashboard/${pilotData.role}/${pilotData.id}`)
  }, [pilotData, router])

  const loadProfileData = useCallback(async () => {
    if (!pilotData || pilotData.role !== "student") return
    const studentId = String(pilotData.student_id || "").trim().toLowerCase()
    if (!studentId) return
    setLoadingData(true)

    const [studentInfoResponse, profileResponse, debriefResponse, assignmentResponse] = await Promise.all([
      supabase
        .from("student_info")
        .select("full_name")
        .ilike("student_id", studentId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("email, flight_hours")
        .eq("id", pilotData.id)
        .single(),
      supabase
        .from("course_debriefs")
        .select("id, course_code, lesson_no, op_date, rpc, instructor_name_snapshot, student_signed_at")
        .ilike("student_id", studentId)
        .order("op_date", { ascending: false }),
      supabase
        .from("flight_ops_assignments")
        .select("slot_span")
        .ilike("student_id", studentId),
    ])

    const resolvedName = String(studentInfoResponse.data?.full_name || pilotData.full_name || "").trim()
    const resolvedEmail = String(profileResponse.data?.email || pilotData.email || "").trim().toLowerCase()
    const computedFlightHours = (assignmentResponse.data || []).reduce((sum, row) => sum + (Number(row.slot_span) || 0), 0)
    const storedFlightHours = parseFlightHours(profileResponse.data?.flight_hours)
    const resolvedFlightHours = storedFlightHours ?? computedFlightHours
    setProfileName(resolvedName)
    setProfileEmail(resolvedEmail)
    setProfileFlightHours(resolvedFlightHours)
    if (!editingInfo) {
      setDraftName(resolvedName)
      setDraftStudentId(String(pilotData.student_id || "").trim())
      setDraftEmail(resolvedEmail)
      setDraftFlightHours(String(Math.round(resolvedFlightHours)))
    }

    const debriefRows = (debriefResponse.data || []) as DebriefRow[]
    setDebriefs(debriefRows)
    setAssignments((assignmentResponse.data || []) as AssignmentRow[])

    const debriefIds = [...new Set(debriefRows.map((row) => row.id).filter(Boolean))]
    if (debriefIds.length > 0) {
      const { data: itemsData } = await supabase
        .from("course_debrief_items")
        .select("debrief_id, item_name, grade, remark")
        .in("debrief_id", debriefIds)
      setDebriefItems((itemsData || []) as DebriefItemRow[])
    } else {
      setDebriefItems([])
    }
    setLoadingData(false)
  }, [editingInfo, pilotData])

  useEffect(() => {
    queueMicrotask(() => {
      void loadProfileData()
    })
  }, [loadProfileData])

  useEffect(() => {
    if (!pilotData || pilotData.role !== "student") return
    const studentId = String(pilotData.student_id || "").trim().toLowerCase()
    if (!studentId) return
    const scheduleReload = () => {
      if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current)
      reloadTimeoutRef.current = setTimeout(() => {
        void loadProfileData()
      }, 150)
    }
    const channel = supabase
      .channel(`student-profile-${studentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "student_info", filter: `student_id=eq.${studentId}` }, () => {
        scheduleReload()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${pilotData.id}` }, () => {
        scheduleReload()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "flight_ops_assignments", filter: `student_id=eq.${studentId}` }, () => {
        scheduleReload()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "course_debriefs", filter: `student_id=eq.${studentId}` }, () => {
        scheduleReload()
      })
      .subscribe()

    return () => {
      if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current)
      void supabase.removeChannel(channel)
    }
  }, [loadProfileData, pilotData])

  const handleSaveInfo = async () => {
    if (!pilotData?.student_id) return
    const nextName = draftName.trim()
    const nextStudentId = draftStudentId.trim().toLowerCase()
    const nextEmail = draftEmail.trim().toLowerCase()
    if (!nextName) {
      setInfoMessage({ type: "error", text: "Full name is required." })
      return
    }
    if (!nextStudentId) {
      setInfoMessage({ type: "error", text: "Student ID is required." })
      return
    }
    if (!/^[a-z0-9_-]+$/.test(nextStudentId)) {
      setInfoMessage({ type: "error", text: "Student ID must use lowercase letters, numbers, underscore, or dash only." })
      return
    }
    if (!nextEmail || !nextEmail.includes("@")) {
      setInfoMessage({ type: "error", text: "A valid email address is required." })
      return
    }
    const nextFlightHours = Number.parseInt(draftFlightHours, 10)
    if (draftFlightHours.trim() === "" || Number.isNaN(nextFlightHours) || nextFlightHours < 0) {
      setInfoMessage({ type: "error", text: "Flight hours must be a valid non-negative whole number." })
      return
    }
    const minimumFlightHours = Math.round(profileFlightHours ?? 0)
    if (nextFlightHours < minimumFlightHours) {
      setInfoMessage({ type: "error", text: `Flight hours cannot be decreased. Minimum allowed is ${minimumFlightHours}.` })
      return
    }
    setSavingInfo(true)
    setInfoMessage(null)
    try {
      const currentStudentId = String(pilotData.student_id || "").trim().toLowerCase()
      const currentEmail = String(profileEmail || pilotData.email || "").trim().toLowerCase()

      if (nextName !== String(profileName || "").trim()) {
        const { error: nameError } = await supabase
          .from("student_info")
          .update({ full_name: nextName })
          .ilike("student_id", currentStudentId)

        if (nameError) throw nameError
      }

      if (nextStudentId !== currentStudentId) {
        const { error: idError } = await supabase.rpc("sync_personnel_id", {
          new_personnel_id: nextStudentId,
          expected_role: "student",
        })
        if (idError) throw idError
      }

      const profileUpdates: { email?: string; flight_hours?: number } = {}
      let emailMessage = ""
      if (nextEmail !== currentEmail) {
        const { error: authEmailError } = await supabase.auth.updateUser({ email: nextEmail })
        if (authEmailError) throw authEmailError
        profileUpdates.email = nextEmail
        emailMessage = " Login email and profile email updated successfully."
      }

      if (profileFlightHours === null || Math.abs(nextFlightHours - profileFlightHours) > 0.0001) {
        profileUpdates.flight_hours = nextFlightHours
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update(profileUpdates)
          .eq("id", pilotData.id)

        if (profileUpdateError) throw profileUpdateError
      }

      setProfileName(nextName)
      setProfileEmail(nextEmail)
      setProfileFlightHours(nextFlightHours)
      setDraftName(nextName)
      setDraftEmail(nextEmail)
      setDraftFlightHours(String(nextFlightHours))
      setEditingInfo(false)
      setInfoMessage({ type: "success", text: `Student information updated successfully.${emailMessage}` })
      setSavingInfo(false)
      await loadProfileData()

      if (nextStudentId !== currentStudentId) {
        window.location.reload()
      }
    } catch (updateError) {
      setInfoMessage({ type: "error", text: updateError instanceof Error ? updateError.message : "Failed to update student information." })
      setSavingInfo(false)
    }
  }

  const stats = useMemo(() => {
    const totalFlightHours = profileFlightHours ?? assignments.reduce((sum, row) => sum + (Number(row.slot_span) || 0), 0)
    const completedLessons = debriefs.length
    const signedDebriefs = debriefs.filter((row) => Boolean(row.student_signed_at)).length

    const scoredItems = debriefItems
      .map((item) => gradeWeight[String(item.grade || "").trim()] || 0)
      .filter((value) => value > 0)
    const averageScore = scoredItems.length > 0 ? scoredItems.reduce((sum, score) => sum + score, 0) / scoredItems.length : 0

    return {
      totalFlightHours,
      completedLessons,
      signedDebriefs,
      averageScore,
    }
  }, [assignments, debriefItems, debriefs, profileFlightHours])

  const strengthsWeaknesses = useMemo(() => {
    const buckets: Record<string, { sum: number; count: number }> = {}
    debriefItems.forEach((item) => {
      const weight = gradeWeight[String(item.grade || "").trim()] || 0
      if (!weight) return
      const key = String(item.item_name || "").trim()
      if (!key) return
      if (!buckets[key]) buckets[key] = { sum: 0, count: 0 }
      buckets[key].sum += weight
      buckets[key].count += 1
    })

    const ranked = Object.entries(buckets)
      .map(([itemName, data]) => ({ itemName, avg: data.sum / data.count }))
      .sort((a, b) => b.avg - a.avg)
    const maxGradeWeight = gradeWeight["S+"]
    const improvementCandidates = ranked
      .filter((item) => item.avg < maxGradeWeight)
      .sort((a, b) => a.avg - b.avg)

    return {
      strengths: ranked.slice(0, 5),
      weaknesses: improvementCandidates.slice(0, 5),
    }
  }, [debriefItems])

  const remarksHistory = useMemo(() => {
    const dateByDebriefId: Record<string, string> = {}
    debriefs.forEach((row) => {
      dateByDebriefId[row.id] = row.op_date
    })

    return debriefItems
      .filter((item) => String(item.remark || "").trim())
      .map((item) => ({
        date: dateByDebriefId[item.debrief_id] || "",
        itemName: item.item_name,
        remark: String(item.remark || "").trim(),
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 20)
  }, [debriefItems, debriefs])

  const courseStatuses = useMemo(() => {
    const grouped = debriefs.reduce<Record<string, { courseCode: string; latestDate: string; latestLesson: string; signedCount: number; totalCount: number }>>((acc, row) => {
      const courseCode = String(row.course_code || "UNKNOWN").toUpperCase()
      if (!acc[courseCode]) {
        acc[courseCode] = {
          courseCode,
          latestDate: row.op_date || "",
          latestLesson: String(row.lesson_no || "").trim(),
          signedCount: 0,
          totalCount: 0,
        }
      }
      acc[courseCode].totalCount += 1
      if (row.student_signed_at) acc[courseCode].signedCount += 1
      if ((row.op_date || "") > acc[courseCode].latestDate) {
        acc[courseCode].latestDate = row.op_date || ""
        acc[courseCode].latestLesson = String(row.lesson_no || "").trim()
      }
      return acc
    }, {})

    return Object.values(grouped).sort((left, right) => left.courseCode.localeCompare(right.courseCode))
  }, [debriefs])

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading...</div>
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>
  if (!pilotData || pilotData.role !== "student") return <div className="p-8 text-sm text-slate-500">Redirecting...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link
          href={`/dashboard/${pilotData.role}/${pilotData.id}`}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-900 transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="px-6 py-6 md:px-8 md:py-8 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100">SkyAssess</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white">Student Profile</h1>
            <p className="mt-1 text-xs font-semibold text-blue-100/80">Certificates & Information</p>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Basic Student Info</p>
                {!editingInfo ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftName(profileName || pilotData.full_name || "")
                      setDraftStudentId(String(pilotData.student_id || "").trim())
                      setDraftEmail(String(profileEmail || pilotData.email || "").trim())
                      setDraftFlightHours(String(Math.round(profileFlightHours ?? stats.totalFlightHours)))
                      setEditingInfo(true)
                      setInfoMessage(null)
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={12} />
                    Edit Info
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingInfo(false)
                        setDraftName(profileName || "")
                        setDraftStudentId(String(pilotData.student_id || "").trim())
                        setDraftEmail(String(profileEmail || pilotData.email || "").trim())
                        setDraftFlightHours(String(Math.round(profileFlightHours ?? stats.totalFlightHours)))
                        setInfoMessage(null)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                    >
                      <X size={12} />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveInfo}
                      disabled={savingInfo}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-blue-800 disabled:opacity-60"
                    >
                      <Save size={12} />
                      {savingInfo ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>
              {infoMessage ? (
                <div className={`mb-3 rounded-lg border px-3 py-2 text-xs font-semibold ${infoMessage.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {infoMessage.text}
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <span className="font-black text-slate-700">Full Name:</span>
                  {editingInfo ? (
                    <input
                      type="text"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    />
                  ) : (
                    <p className="mt-1 text-slate-800">{profileName || pilotData.full_name || "N/A"}</p>
                  )}
                </div>
                <div>
                  <span className="font-black text-slate-700">Student ID:</span>
                  {editingInfo ? (
                    <input
                      type="text"
                      value={draftStudentId}
                      onChange={(event) => setDraftStudentId(event.target.value.toLowerCase())}
                      className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    />
                  ) : (
                    <p className="mt-1 text-slate-800">{pilotData.student_id || "N/A"}</p>
                  )}
                </div>
                <div>
                  <span className="font-black text-slate-700">Email:</span>
                  {editingInfo ? (
                    <input
                      type="email"
                      value={draftEmail}
                      onChange={(event) => setDraftEmail(event.target.value)}
                      className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    />
                  ) : (
                    <p className="mt-1 text-slate-800">{profileEmail || pilotData.email || "N/A"}</p>
                  )}
                </div>
                <p><span className="font-black text-slate-700">Role:</span> Student Pilot</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500">Flight Hours</p>
                    {editingInfo ? (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={draftFlightHours}
                        onChange={(event) => setDraftFlightHours(event.target.value)}
                        className="mt-2 block h-10 w-28 rounded-lg border border-slate-300 bg-white px-3 text-2xl font-black text-slate-900"
                      />
                    ) : (
                      <p className="mt-2 text-2xl font-black text-slate-900">{Math.round(stats.totalFlightHours)}</p>
                    )}
                  </div>
                  {!editingInfo ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftName(profileName || pilotData.full_name || "")
                        setDraftStudentId(String(pilotData.student_id || "").trim())
                        setDraftEmail(String(profileEmail || pilotData.email || "").trim())
                        setDraftFlightHours(String(Math.round(profileFlightHours ?? stats.totalFlightHours)))
                        setEditingInfo(true)
                        setInfoMessage(null)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase text-slate-500">Completed Lessons</p><p className="mt-2 text-2xl font-black text-slate-900">{stats.completedLessons}</p></div>
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase text-slate-500">Signed Debriefs</p><p className="mt-2 text-2xl font-black text-slate-900">{stats.signedDebriefs}</p></div>
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase text-slate-500">Avg. Evaluation</p><p className="mt-2 text-2xl font-black text-slate-900">{stats.averageScore > 0 ? `${stats.averageScore.toFixed(2)} / 4` : "N/A"}</p></div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3"><ClipboardList size={16} className="text-blue-900" /><p className="text-xs font-black uppercase tracking-wider text-blue-900">Completed Lessons</p></div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {debriefs.length === 0 ? (
                    <p className="text-sm text-slate-500">No debrief records yet.</p>
                  ) : (
                    debriefs.map((row) => (
                      <div key={row.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-sm font-bold text-slate-800">{row.course_code} · Lesson {row.lesson_no || "N/A"} - {row.rpc || "N/A"}</p>
                        <p className="text-xs text-slate-600">{toDateLabel(row.op_date)} · {row.instructor_name_snapshot || "Instructor"}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3"><Star size={16} className="text-blue-900" /><p className="text-xs font-black uppercase tracking-wider text-blue-900">Evaluation & Scores</p></div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {debriefItems.length === 0 ? (
                    <p className="text-sm text-slate-500">No grading items yet.</p>
                  ) : (
                    debriefItems.slice(0, 30).map((item, index) => (
                      <div key={`${item.debrief_id}-${item.item_name}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-slate-700">{item.item_name}</p>
                        <span className="text-xs font-black text-blue-900">{item.grade || "-"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3"><Award size={16} className="text-emerald-700" /><p className="text-xs font-black uppercase tracking-wider text-emerald-700">Areas of Strength</p></div>
                <ul className="space-y-2">
                  {strengthsWeaknesses.strengths.length === 0 ? (
                    <li className="text-sm text-slate-500">Not enough data yet.</li>
                  ) : (
                    strengthsWeaknesses.strengths.map((item) => (
                      <li key={`strength-${item.itemName}`} className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">
                        {item.itemName} · {item.avg.toFixed(2)}
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3"><ShieldAlert size={16} className="text-amber-700" /><p className="text-xs font-black uppercase tracking-wider text-amber-700">Areas for Improvement</p></div>
                <ul className="space-y-2">
                  {strengthsWeaknesses.weaknesses.length === 0 ? (
                    <li className="text-sm text-slate-500">Not enough data yet.</li>
                  ) : (
                    strengthsWeaknesses.weaknesses.map((item) => (
                      <li key={`weak-${item.itemName}`} className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm font-semibold text-amber-800">
                        {item.itemName} · {item.avg.toFixed(2)}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3"><FileText size={16} className="text-blue-900" /><p className="text-xs font-black uppercase tracking-wider text-blue-900">Remarks History</p></div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {remarksHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">No remarks history yet.</p>
                ) : (
                  remarksHistory.map((remark, index) => (
                    <div key={`${remark.date}-${remark.itemName}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{remark.date ? toDateLabel(remark.date) : "Unknown Date"}</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{remark.itemName}</p>
                      <p className="text-sm text-slate-700 mt-1">{remark.remark}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-5">
              <div className="flex items-center gap-2"><BadgeInfo size={16} className="text-blue-900" /><p className="text-xs font-black uppercase tracking-wider text-blue-900">Certificates & Info</p></div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Course Status</p>
                <div className="mt-3 space-y-2">
                  {courseStatuses.length === 0 ? (
                    <p className="text-sm text-slate-500">No course progress records yet.</p>
                  ) : (
                    courseStatuses.map((course) => (
                      <div key={course.courseCode} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-slate-900">{course.courseCode}</p>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-900">
                            {course.signedCount === course.totalCount ? "Completed & Signed" : "In Progress"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {course.latestLesson ? `Latest lesson ${course.latestLesson}` : "Lesson not yet recorded"}
                          {course.latestDate ? ` · ${toDateLabel(course.latestDate)}` : ""}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {course.signedCount}/{course.totalCount} signed debrief record{course.totalCount > 1 ? "s" : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock3 size={14} />
                  {loadingData ? "Syncing latest records..." : "Course status updates from your signed debrief and assignment records."}
                </div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 size={14} />
                  Student signature acknowledgement is tracked from submitted course debrief records.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
