"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BarChart3, CalendarRange, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePilotData } from "@/hooks/usePilotData"
import { supabase } from "@/lib/supabase"

interface SelfAssessmentRow {
  id: string
  assess_date: string
  landings: number
  takeoff: number
  turns: number
  notes: string | null
}

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number)
  const start = `${year}-${String(month).padStart(2, "0")}-01`
  const endDate = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`
  return { start, end }
}

function clampScore(value: number) {
  if (Number.isNaN(value)) return 1
  return Math.max(1, Math.min(5, value))
}

function formatShortDate(dateValue: string) {
  const parsed = new Date(`${dateValue}T00:00:00`)
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function PerformancePage() {
  const router = useRouter()
  const { pilotData, loading } = usePilotData()
  const now = new Date()
  const [monthValue, setMonthValue] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [assessments, setAssessments] = useState<SelfAssessmentRow[]>([])
  const [saveMessage, setSaveMessage] = useState<string>("")
  const [loadingAssessments, setLoadingAssessments] = useState(false)
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [landings, setLandings] = useState(3)
  const [takeoff, setTakeoff] = useState(3)
  const [turns, setTurns] = useState(3)
  const [notes, setNotes] = useState("")

  const loadAssessments = useCallback(async () => {
    if (!pilotData || pilotData.role !== "student") return
    const studentId = String(pilotData.student_id || "").trim()
    if (!studentId) return

    setLoadingAssessments(true)
    const { start, end } = getMonthRange(monthValue)
    const idCandidates = [...new Set([studentId, studentId.toUpperCase(), studentId.toLowerCase()])]
    const { data, error } = await supabase
      .from("student_self_assessments")
      .select("id, assess_date, landings, takeoff, turns, notes")
      .in("student_id", idCandidates)
      .gte("assess_date", start)
      .lte("assess_date", end)
      .order("assess_date", { ascending: true })

    if (error) {
      setAssessments([])
      setSaveMessage(
        error.code === "42P01"
          ? "Missing table: create student_self_assessments first."
          : error.message
      )
      setLoadingAssessments(false)
      return
    }

    setAssessments((data as SelfAssessmentRow[]) || [])
    setLoadingAssessments(false)
  }, [monthValue, pilotData])

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
    const timer = setTimeout(() => {
      void loadAssessments()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadAssessments])

  useEffect(() => {
    if (!pilotData || pilotData.role !== "student") return
    const studentId = String(pilotData.student_id || "").trim()
    if (!studentId) return
    const idCandidates = [...new Set([studentId, studentId.toUpperCase(), studentId.toLowerCase()])]

    const channel = supabase
      .channel(`student-self-assessments-${studentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_self_assessments" },
        (payload) => {
          const payloadStudentId = String((payload.new as { student_id?: string } | null)?.student_id || (payload.old as { student_id?: string } | null)?.student_id || "").trim()
          if (payloadStudentId && idCandidates.map((id) => id.toLowerCase()).includes(payloadStudentId.toLowerCase())) {
            loadAssessments()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadAssessments, pilotData])

  const handleSave = async () => {
    if (!pilotData || pilotData.role !== "student") return
    const studentId = String(pilotData.student_id || "").trim()
    if (!studentId || !formDate) return
    const payload = {
      student_id: studentId,
      assess_date: formDate,
      landings: clampScore(landings),
      takeoff: clampScore(takeoff),
      turns: clampScore(turns),
      notes: notes.trim() || null,
    }

    const { error } = await supabase
      .from("student_self_assessments")
      .upsert(payload, { onConflict: "student_id,assess_date" })

    if (error) {
      setSaveMessage(error.message)
      return
    }

    setAssessments((prev) => {
      const existingIndex = prev.findIndex((row) => row.assess_date === formDate)
      const nextRow: SelfAssessmentRow = {
        id: prev[existingIndex]?.id || `local-${formDate}`,
        assess_date: formDate,
        landings: payload.landings,
        takeoff: payload.takeoff,
        turns: payload.turns,
        notes: payload.notes,
      }
      if (existingIndex >= 0) {
        const next = [...prev]
        next[existingIndex] = nextRow
        return next.sort((a, b) => (a.assess_date > b.assess_date ? 1 : -1))
      }
      return [...prev, nextRow].sort((a, b) => (a.assess_date > b.assess_date ? 1 : -1))
    })
    setSaveMessage("Self-assessment saved.")
    setMonthValue(formDate.slice(0, 7))
  }

  const summary = useMemo(() => {
    if (assessments.length === 0) return { avg: 0, improvement: 0 }
    const totals = assessments.map((row) => row.landings + row.takeoff + row.turns)
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length
    const improvement = totals[totals.length - 1] - totals[0]
    return { avg, improvement }
  }, [assessments])

  if (loading || !pilotData) return <div className="p-8 text-sm text-slate-500">Loading...</div>
  if (pilotData.role !== "student") return <div className="p-8 text-sm text-slate-500">Redirecting...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-8 lg:p-12 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link
          href={`/dashboard/${pilotData.role}/${pilotData.id}`}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-900 transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
        >
          <ArrowLeft size={14} /> Back to Terminal
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="px-6 py-6 md:px-8 md:py-8 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100">Student Self Assessment</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white">My Performance</h1>
            <p className="mt-1 text-xs font-semibold text-blue-100/80">Rate yourself from 1 to 5 and track monthly progress</p>
          </div>

          <div className="p-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><CalendarRange size={12} /> Month</p>
              <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} className="mt-2 h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold w-full" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><BarChart3 size={12} /> Monthly Average</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{summary.avg.toFixed(1)} / 15</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><TrendingUp size={12} /> Improvement</p>
              <p className={`mt-2 text-2xl font-black ${summary.improvement >= 0 ? "text-emerald-700" : "text-red-700"}`}>{summary.improvement >= 0 ? "+" : ""}{summary.improvement}</p>
            </div>
          </div>

          <div className="px-6 pb-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Monthly Progress Graph</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-72 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  {loadingAssessments ? (
                    <p className="text-sm text-slate-500">Loading graph...</p>
                  ) : assessments.length === 0 ? (
                    <p className="text-sm text-slate-500">No assessment data for this month yet.</p>
                  ) : (
                    <div className="h-full overflow-x-auto">
                      <div className="h-full flex items-end gap-3" style={{ minWidth: `${Math.max(assessments.length * 72, 320)}px` }}>
                        {assessments.map((item) => {
                          const max = 15
                          const l = (item.landings / max) * 100
                          const t = (item.takeoff / max) * 100
                          const tr = (item.turns / max) * 100
                          return (
                            <div key={item.id} className="w-14 shrink-0 flex flex-col items-center gap-2">
                              <div className="w-full h-52 rounded-md overflow-hidden border border-slate-200 bg-white flex flex-col-reverse">
                                <div style={{ height: `${l}%` }} className="bg-cyan-400/80" />
                                <div style={{ height: `${t}%` }} className="bg-sky-500/80" />
                                <div style={{ height: `${tr}%` }} className="bg-blue-700/80" />
                              </div>
                              <p className="text-[10px] font-bold text-slate-600">{formatShortDate(item.assess_date)}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Add / Update Daily Self-Assessment</p>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-bold" />
                  <div className="grid grid-cols-1 gap-2">
                    <div className="grid grid-cols-[1fr_90px] items-center gap-2">
                      <label className="text-[11px] font-black text-slate-600">Landings Score (1-5)</label>
                      <input type="number" min={1} max={5} value={landings} onChange={(e) => setLandings(Number(e.target.value))} className="h-10 rounded-lg border border-slate-300 px-2 text-sm font-bold" />
                    </div>
                    <div className="grid grid-cols-[1fr_90px] items-center gap-2">
                      <label className="text-[11px] font-black text-slate-600">Takeoff Score (1-5)</label>
                      <input type="number" min={1} max={5} value={takeoff} onChange={(e) => setTakeoff(Number(e.target.value))} className="h-10 rounded-lg border border-slate-300 px-2 text-sm font-bold" />
                    </div>
                    <div className="grid grid-cols-[1fr_90px] items-center gap-2">
                      <label className="text-[11px] font-black text-slate-600">Turns Score (1-5)</label>
                      <input type="number" min={1} max={5} value={turns} onChange={(e) => setTurns(Number(e.target.value))} className="h-10 rounded-lg border border-slate-300 px-2 text-sm font-bold" />
                    </div>
                  </div>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes (optional)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <button onClick={handleSave} className="h-10 px-4 rounded-lg bg-blue-900 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-800 transition-colors">
                    Save Self-Assessment
                  </button>
                  {saveMessage ? <p className="text-xs font-semibold text-blue-700">{saveMessage}</p> : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
