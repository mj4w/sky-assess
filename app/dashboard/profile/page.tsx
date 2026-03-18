"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Award, BadgeInfo, CheckCircle2, ClipboardList, Clock3, FileText, ShieldAlert, Star } from "lucide-react"
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
  op_date: string
  slot_span: number | null
  aircraft_type: string | null
  aircraft_registry: string | null
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

export default function StudentProfilePage() {
  const router = useRouter()
  const { pilotData, loading, error } = usePilotData()
  const [debriefs, setDebriefs] = useState<DebriefRow[]>([])
  const [debriefItems, setDebriefItems] = useState<DebriefItemRow[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loadingData, setLoadingData] = useState(false)

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
    const loadProfileData = async () => {
      if (!pilotData || pilotData.role !== "student") return
      const studentId = String(pilotData.student_id || "").trim()
      if (!studentId) return
      setLoadingData(true)
      const studentCandidates = [...new Set([studentId, studentId.toLowerCase(), studentId.toUpperCase()])]

      const [debriefResponse, assignmentResponse] = await Promise.all([
        supabase
          .from("course_debriefs")
          .select("id, course_code, lesson_no, op_date, rpc, instructor_name_snapshot, student_signed_at")
          .in("student_id", studentCandidates)
          .order("op_date", { ascending: false }),
        supabase
          .from("flight_ops_assignments")
          .select("op_date, slot_span, aircraft_type, aircraft_registry")
          .in("student_id", studentCandidates)
          .order("op_date", { ascending: false }),
      ])

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
    }

    loadProfileData()
  }, [pilotData])

  const stats = useMemo(() => {
    const totalFlightHours = assignments.reduce((sum, row) => sum + (Number(row.slot_span) || 0), 0)
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
  }, [assignments, debriefItems, debriefs])

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

    return {
      strengths: ranked.slice(0, 5),
      weaknesses: [...ranked].reverse().slice(0, 5),
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
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Basic Student Info</p>
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <p><span className="font-black text-slate-700">Full Name:</span> {pilotData.full_name || "N/A"}</p>
                <p><span className="font-black text-slate-700">Student ID:</span> {pilotData.student_id || "N/A"}</p>
                <p><span className="font-black text-slate-700">Email:</span> {pilotData.email || "N/A"}</p>
                <p><span className="font-black text-slate-700">Role:</span> Student Pilot</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase text-slate-500">Flight Hours</p><p className="mt-2 text-2xl font-black text-slate-900">{stats.totalFlightHours.toFixed(1)}</p></div>
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

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 mb-2"><BadgeInfo size={16} className="text-blue-900" /><p className="text-xs font-black uppercase tracking-wider text-blue-900">Certificates & Info</p></div>
              <p className="text-sm text-slate-700">
                Certification records can be added here once your school uploads official PPL/CPL certificate data.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Clock3 size={14} />
                {loadingData ? "Syncing latest records..." : "Profile metrics updated from your debrief and assignment records."}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <CheckCircle2 size={14} />
                Student signature acknowledgement is tracked from submitted course debrief records.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
