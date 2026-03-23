"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BarChart3, HelpCircle, ShieldCheck, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import NavigationGuideOverlay from "@/components/NavigationGuideOverlay"
import { usePilotData } from "@/hooks/usePilotData"
import { useNavigationGuide } from "@/hooks/useNavigationGuide"
import { supabase } from "@/lib/supabase"

interface FeedbackRow {
  id: string
  eval_month: string
  created_at: string
  attr_instructional_planning: number
  attr_pedagogical_competence: number
  attr_training_policy: number
  attr_tech_adaptability: number
  attr_professional_development: number
  attr_instructional_planning_details?: number[] | null
  attr_pedagogical_competence_details?: number[] | null
  attr_training_policy_details?: number[] | null
  attr_tech_adaptability_details?: number[] | null
  attr_professional_development_details?: number[] | null
  influence_professional_experience: number
  influence_instructional_training: number
  influence_work_environment: number
  influence_institutional_policies: number
  notes: string | null
}

type DetailSectionKey =
  | "Instructional Planning"
  | "Pedagogical Competence"
  | "Institutional Training Policy"
  | "Technological Adaptability"
  | "Continuous Professional Development"

const detailSectionLabels: DetailSectionKey[] = [
  "Instructional Planning",
  "Pedagogical Competence",
  "Institutional Training Policy",
  "Technological Adaptability",
  "Continuous Professional Development",
]

const detailFieldNames: Record<DetailSectionKey, string[]> = {
  "Instructional Planning": [
    "Prepares lessons clearly and in an organized manner",
    "Explains objectives for each flight session",
    "Follows a logical and effective lesson sequence",
    "Provides clear briefings before practical exercises",
    "Plans sessions to address strengths and weaknesses",
    "Anticipates training challenges during flight",
    "Uses flight session time effectively",
  ],
  "Pedagogical Competence": [
    "Explains concepts clearly for better understanding",
    "Adjusts teaching methods to student learning style",
    "Encourages questions and constructive feedback",
    "Shows patience and professionalism during lessons",
    "Applies strategies effectively in flight situations",
    "Motivates student skill improvement",
    "Enhances learning through effective teaching style",
  ],
  "Institutional Training Policy": [
    "Follows school flight standards and guidelines",
    "Emphasizes strict adherence to flight procedures",
    "Reminds students about safety regulations consistently",
    "Ensures compliance with school policies",
    "Aligns lessons with institutional objectives",
    "Applies institutional policy positively in teaching",
    "Maintains expected professional conduct",
  ],
  "Technological Adaptability": [
    "Uses simulators and training technology effectively",
    "Uses technology to improve lesson understanding",
    "Handles issues with flight training equipment",
    "Encourages technology use for learning support",
    "Adapts lessons based on available technology",
    "Builds new skills through technology in training",
    "Improves learning through technology integration",
  ],
  "Continuous Professional Development": [
    "Participates in training to improve instruction",
    "Shares updated knowledge and techniques",
    "Encourages continuous improvement mindset",
    "Demonstrates up-to-date aviation knowledge",
    "Reflects ongoing professional development in lessons",
    "Seeks feedback to improve teaching quality",
    "Maintains current and relevant instructional skills",
  ],
}

export default function InstructorEvaluationResultsPage() {
  const router = useRouter()
  const { pilotData, loading } = usePilotData()
  const now = new Date()
  const [monthValue, setMonthValue] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [message, setMessage] = useState("")
  const heroRef = useRef<HTMLDivElement | null>(null)
  const filtersRef = useRef<HTMLDivElement | null>(null)
  const resultsRef = useRef<HTMLDivElement | null>(null)
  const responseRef = useRef<HTMLDivElement | null>(null)
  const guideSteps = useMemo(
    () => [
      {
        key: "hero",
        title: "Evaluation Analytics Overview",
        description: "This page summarizes anonymous student evaluations submitted for the current instructor account.",
        ref: heroRef,
      },
      {
        key: "filters",
        title: "Month and Summary Filters",
        description: "Use these cards to filter by month and review the response count and average overall score.",
        ref: filtersRef,
      },
      {
        key: "results",
        title: "Evaluation Response List",
        description: "This section lists each anonymous response submitted for the selected month.",
        ref: resultsRef,
      },
      {
        key: "response",
        title: "Detailed Response Breakdown",
        description: "Open the detailed competency sections here to inspect per-item ratings and narrative feedback.",
        ref: responseRef,
      },
    ],
    []
  )
  const guide = useNavigationGuide({
    enabled: pilotData?.role === "instructor",
    userId: pilotData?.id,
    pageKey: "instructor-dashboard-evaluations",
    steps: guideSteps,
  })

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
          "id, eval_month, created_at, attr_instructional_planning, attr_pedagogical_competence, attr_training_policy, attr_tech_adaptability, attr_professional_development, attr_instructional_planning_details, attr_pedagogical_competence_details, attr_training_policy_details, attr_tech_adaptability_details, attr_professional_development_details, influence_professional_experience, influence_instructional_training, influence_work_environment, influence_institutional_policies, notes"
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
    <div className="min-h-screen bg-slate-100 p-8 lg:p-12 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/dashboard/${pilotData.role}/${pilotData.id}`}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-900 transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <button
            type="button"
            onClick={guide.openGuide}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 hover:border-blue-900 hover:text-blue-900"
          >
            <HelpCircle size={14} />
            {guide.guideCompleted ? "Replay Tour" : "Start Tour"}
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <div ref={heroRef} className="px-6 py-6 md:px-8 md:py-8 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-800">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100">Instructor Analytics</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white">Anonymous Student Evaluations</h1>
            <p className="mt-1 text-xs font-semibold text-blue-100/80">Professional summary of monthly anonymous student feedback</p>
          </div>

          <div className="p-6 space-y-6">
            <div ref={filtersRef} className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Month</p>
                <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-bold" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><ShieldCheck size={12} /> Responses</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{summary.responses}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><BarChart3 size={12} /> Avg Overall Score</p>
                <p className="mt-2 text-2xl font-black text-blue-900">{summary.avgTotal.toFixed(1)} / 36</p>
              </div>
            </div>

            {message ? <p className="text-xs font-semibold text-blue-700">{message}</p> : null}

            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <p className="text-base font-bold text-slate-700">No evaluations submitted for this month.</p>
              </div>
            ) : (
              <div ref={resultsRef} className="space-y-4">
                {rows.map((row, index) => {
                  const total =
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
                    <div ref={index === 0 ? responseRef : undefined} key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-wide">Anonymous Response #{index + 1}</p>
                        <p className="text-sm font-black text-blue-900 flex items-center gap-1"><Star size={14} /> {total}/36</p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Submitted {new Date(row.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                      <div className="mt-4 grid gap-2 md:grid-cols-2 text-xs">
                        <p className="font-semibold text-slate-700">Instructional Planning: <span className="font-black">{row.attr_instructional_planning}/4</span></p>
                        <p className="font-semibold text-slate-700">Pedagogical Competence: <span className="font-black">{row.attr_pedagogical_competence}/4</span></p>
                        <p className="font-semibold text-slate-700">Institutional Training Policy: <span className="font-black">{row.attr_training_policy}/4</span></p>
                        <p className="font-semibold text-slate-700">Technological Adaptability: <span className="font-black">{row.attr_tech_adaptability}/4</span></p>
                        <p className="font-semibold text-slate-700">Continuous Professional Development: <span className="font-black">{row.attr_professional_development}/4</span></p>
                        <p className="font-semibold text-slate-700">Influence: Professional Experience: <span className="font-black">{row.influence_professional_experience}/4</span></p>
                        <p className="font-semibold text-slate-700">Influence: Instructional Training: <span className="font-black">{row.influence_instructional_training}/4</span></p>
                        <p className="font-semibold text-slate-700">Influence: Work Environment: <span className="font-black">{row.influence_work_environment}/4</span></p>
                        <p className="font-semibold text-slate-700">Influence: Institutional Policies: <span className="font-black">{row.influence_institutional_policies}/4</span></p>
                      </div>
                      <div className="mt-4 space-y-3">
                        {detailSectionLabels.map((label) => {
                          const details =
                            label === "Instructional Planning"
                              ? row.attr_instructional_planning_details
                              : label === "Pedagogical Competence"
                              ? row.attr_pedagogical_competence_details
                              : label === "Institutional Training Policy"
                              ? row.attr_training_policy_details
                              : label === "Technological Adaptability"
                              ? row.attr_tech_adaptability_details
                              : row.attr_professional_development_details
                          if (!Array.isArray(details) || details.length === 0) return null
                          const sectionAverage = (details.reduce((sum, score) => sum + score, 0) / details.length).toFixed(2)
                          return (
                            <details key={`${row.id}-${label}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                                <div>
                                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">{label}</p>
                                  <p className="text-[11px] text-slate-500">See details ({details.length} items)</p>
                                </div>
                                <p className="text-[11px] font-bold text-blue-900">Avg: {sectionAverage}/4</p>
                              </summary>
                              <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                                {details.map((value, valueIndex) => (
                                  <div
                                    key={`${row.id}-${label}-${valueIndex}`}
                                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
                                  >
                                    <p className="leading-snug">{detailFieldNames[label][valueIndex] || `Item ${valueIndex + 1}`}</p>
                                    <p className="mt-1 text-[11px]">
                                      Rating: <span className="font-black text-blue-900">{value}/4</span>
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )
                        })}
                      </div>
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Narrative Feedback</p>
                        <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap break-words">{row.notes?.trim() || "No written comments."}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
      <NavigationGuideOverlay
        showGuide={guide.showGuide}
        activeRect={guide.activeRect}
        activeStep={guide.activeStep}
        stepIndex={guide.stepIndex}
        totalSteps={guide.totalSteps}
        showConfetti={guide.showConfetti}
        confettiPieces={guide.confettiPieces}
        onPrevious={guide.previousStep}
        onNext={guide.nextStep}
        onSkip={guide.skipGuide}
      />
    </div>
  )
}
