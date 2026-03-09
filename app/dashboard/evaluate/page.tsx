"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BarChart3, ShieldCheck, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePilotData } from "@/hooks/usePilotData"
import { supabase } from "@/lib/supabase"

interface FeedbackRow {
  id: string
  eval_month: string
  created_at: string
  profile_experience: number
  profile_training_certificate: number
  profile_licenses: number
  profile_instruction_type: number
  attr_instructional_planning: number
  attr_pedagogical_competence: number
  attr_training_policy: number
  attr_tech_adaptability: number
  attr_professional_development: number
  influence_professional_experience: number
  influence_instructional_training: number
  influence_work_environment: number
  influence_institutional_policies: number
  notes: string | null
}

export default function InstructorEvaluationResultsPage() {
  const router = useRouter()
  const { pilotData, loading } = usePilotData()
  const now = new Date()
  const [monthValue, setMonthValue] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [message, setMessage] = useState("")

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
    const load = async () => {
      if (!pilotData || pilotData.role !== "instructor") return
      const instructorId = String(pilotData.instructor_id || "").trim()
      if (!instructorId) return

      const monthStart = `${monthValue}-01`
      const monthEnd = `${monthValue}-31`
      const normalizedInstructorId = instructorId.toLowerCase()
      const candidates = [...new Set([normalizedInstructorId, normalizedInstructorId.toUpperCase()])]

      await supabase
        .from("student_instructor_feedback")
        .update({ notify: true })
        .in("instructor_id", candidates)
        .is("notify", null)

      const { data, error } = await supabase
        .from("student_instructor_feedback")
        .select(
          "id, eval_month, created_at, profile_experience, profile_training_certificate, profile_licenses, profile_instruction_type, attr_instructional_planning, attr_pedagogical_competence, attr_training_policy, attr_tech_adaptability, attr_professional_development, influence_professional_experience, influence_instructional_training, influence_work_environment, influence_institutional_policies, notes"
        )
        .in("instructor_id", candidates)
        .gte("eval_month", monthStart)
        .lte("eval_month", monthEnd)
        .order("created_at", { ascending: false })

      if (error) {
        setRows([])
        setMessage(error.code === "42P01" ? "Missing table: create student_instructor_feedback first." : error.message)
        return
      }

      setRows((data as FeedbackRow[]) || [])
      setMessage("")
    }
    load()
  }, [monthValue, pilotData])

  const summary = useMemo(() => {
    if (rows.length === 0) return { responses: 0, avgTotal: 0 }
    const totals = rows.map((row) =>
      row.profile_experience +
      row.profile_training_certificate +
      row.profile_licenses +
      row.profile_instruction_type +
      row.attr_instructional_planning +
      row.attr_pedagogical_competence +
      row.attr_training_policy +
      row.attr_tech_adaptability +
      row.attr_professional_development +
      row.influence_professional_experience +
      row.influence_instructional_training +
      row.influence_work_environment +
      row.influence_institutional_policies
    )
    const avgTotal = totals.reduce((a, b) => a + b, 0) / totals.length
    return { responses: rows.length, avgTotal }
  }, [rows])

  if (loading || !pilotData) return <div className="p-8 text-sm text-slate-500">Loading...</div>
  if (pilotData.role !== "instructor") return <div className="p-8 text-sm text-slate-500">Redirecting...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-8 lg:p-12 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link
          href={`/dashboard/${pilotData.role}/${pilotData.id}`}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-900 transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="px-6 py-6 md:px-8 md:py-8 bg-linear-to-r from-blue-950 via-blue-900 to-blue-800">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100">Instructor Analytics</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white">Anonymous Student Evaluations</h1>
            <p className="mt-1 text-xs font-semibold text-blue-100/80">Responses are anonymized and grouped by month</p>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Month</p>
                <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-bold" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><ShieldCheck size={12} /> Responses</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{summary.responses}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><BarChart3 size={12} /> Avg Overall Score</p>
                <p className="mt-2 text-2xl font-black text-blue-900">{summary.avgTotal.toFixed(1)} / 65</p>
              </div>
            </div>

            {message ? <p className="text-xs font-semibold text-blue-700">{message}</p> : null}

            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <p className="text-base font-bold text-slate-700">No evaluations submitted for this month.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row, index) => {
                  const total =
                    row.profile_experience +
                    row.profile_training_certificate +
                    row.profile_licenses +
                    row.profile_instruction_type +
                    row.attr_instructional_planning +
                    row.attr_pedagogical_competence +
                    row.attr_training_policy +
                    row.attr_tech_adaptability +
                    row.attr_professional_development +
                    row.influence_professional_experience +
                    row.influence_instructional_training +
                    row.influence_work_environment +
                    row.influence_institutional_policies
                  return (
                    <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-slate-900">Anonymous Response #{index + 1}</p>
                        <p className="text-sm font-black text-blue-900 flex items-center gap-1"><Star size={14} /> {total}/65</p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Submitted {new Date(row.created_at).toLocaleDateString()}</p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2 text-xs">
                        <p className="font-semibold text-slate-700">Length of Professional Experience: <span className="font-black">{row.profile_experience}/5</span></p>
                        <p className="font-semibold text-slate-700">Training Certificate: <span className="font-black">{row.profile_training_certificate}/5</span></p>
                        <p className="font-semibold text-slate-700">Licenses: <span className="font-black">{row.profile_licenses}/5</span></p>
                        <p className="font-semibold text-slate-700">Type of Instruction Handled: <span className="font-black">{row.profile_instruction_type}/5</span></p>
                        <p className="font-semibold text-slate-700">Instructional Planning: <span className="font-black">{row.attr_instructional_planning}/5</span></p>
                        <p className="font-semibold text-slate-700">Pedagogical Competence: <span className="font-black">{row.attr_pedagogical_competence}/5</span></p>
                        <p className="font-semibold text-slate-700">Institutional Training Policy: <span className="font-black">{row.attr_training_policy}/5</span></p>
                        <p className="font-semibold text-slate-700">Technological Adaptability: <span className="font-black">{row.attr_tech_adaptability}/5</span></p>
                        <p className="font-semibold text-slate-700">Continuous Professional Development: <span className="font-black">{row.attr_professional_development}/5</span></p>
                        <p className="font-semibold text-slate-700">Influence: Professional Experience: <span className="font-black">{row.influence_professional_experience}/5</span></p>
                        <p className="font-semibold text-slate-700">Influence: Instructional Training: <span className="font-black">{row.influence_instructional_training}/5</span></p>
                        <p className="font-semibold text-slate-700">Influence: Work Environment: <span className="font-black">{row.influence_work_environment}/5</span></p>
                        <p className="font-semibold text-slate-700">Influence: Institutional Policies: <span className="font-black">{row.influence_institutional_policies}/5</span></p>
                      </div>
                      <p className="text-sm text-slate-700 mt-3">{row.notes?.trim() || "No written comments."}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
