"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, ClipboardCheck, HelpCircle, ShieldCheck, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import NavigationGuideOverlay from "@/components/NavigationGuideOverlay"
import { useNavigationGuide } from "@/hooks/useNavigationGuide"
import { supabase } from "@/lib/supabase"

interface InstructorRow {
  instructor_id: string
  full_name: string | null
}

interface FeedbackCountRow {
  instructor_id: string | null
}

interface InstructorEvaluationSummary {
  instructorId: string
  fullName: string
  evaluationCount: number
}

export default function AdminEvaluationDirectoryPage() {
  const router = useRouter()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [loadingData, setLoadingData] = useState(true)
  const [message, setMessage] = useState("")
  const [rows, setRows] = useState<InstructorEvaluationSummary[]>([])
  const [adminUserId, setAdminUserId] = useState("")
  const heroRef = useRef<HTMLDivElement | null>(null)
  const statsRef = useRef<HTMLDivElement | null>(null)
  const directoryRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLAnchorElement | null>(null)
  const guideSteps = useMemo(
    () => [
      {
        key: "hero",
        title: "Evaluation Directory Overview",
        description: "This page gives administrators a high-level directory of instructor evaluation records.",
        ref: heroRef,
      },
      {
        key: "stats",
        title: "Evaluation Summary Metrics",
        description: "These counters summarize how many instructors exist, how many have responses, and the total number of submissions.",
        ref: statsRef,
      },
      {
        key: "directory",
        title: "Instructor Directory Grid",
        description: "This grid lists all instructors and shows how many anonymous evaluation responses each one has received.",
        ref: directoryRef,
      },
      {
        key: "card",
        title: "Instructor Evaluation Card",
        description: "Open any card to view the detailed anonymous evaluation record for that instructor.",
        ref: cardRef,
      },
    ],
    []
  )
  const guide = useNavigationGuide({
    enabled: !checkingAccess && Boolean(adminUserId),
    userId: adminUserId || undefined,
    pageKey: "admin-dashboard-evaluations-directory",
    steps: guideSteps,
  })

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user

      if (!user) {
        router.replace("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role !== "admin") {
        if (profile?.role === "flightops") {
          router.replace("/flight-ops")
          return
        }
        router.replace(`/dashboard/${profile?.role || "student"}/${user.id}`)
        return
      }

      setAdminUserId(user.id)
      setCheckingAccess(false)
      setLoadingData(true)

      const [instructorRes, feedbackRes] = await Promise.all([
        supabase.from("instructor_info").select("instructor_id, full_name").order("full_name", { ascending: true }),
        supabase.from("student_instructor_feedback").select("instructor_id"),
      ])

      if (instructorRes.error || feedbackRes.error) {
        setMessage(instructorRes.error?.message || feedbackRes.error?.message || "Failed to load evaluation directory.")
        setRows([])
        setLoadingData(false)
        return
      }

      const feedbackCounts = ((feedbackRes.data as FeedbackCountRow[] | null) || []).reduce<Record<string, number>>((acc, row) => {
        const key = String(row.instructor_id || "").trim().toLowerCase()
        if (!key) return acc
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})

      const summaries = ((instructorRes.data as InstructorRow[] | null) || []).map((row) => {
        const normalizedId = String(row.instructor_id || "").trim().toLowerCase()
        return {
          instructorId: String(row.instructor_id || ""),
          fullName: String(row.full_name || row.instructor_id || "Unnamed Instructor"),
          evaluationCount: feedbackCounts[normalizedId] || 0,
        }
      })

      setRows(summaries)
      setMessage("")
      setLoadingData(false)
    }

    load()
  }, [router])

  const stats = useMemo(() => {
    const totalResponses = rows.reduce((sum, row) => sum + row.evaluationCount, 0)
    const withResponses = rows.filter((row) => row.evaluationCount > 0).length
    return {
      instructorCount: rows.length,
      withResponses,
      totalResponses,
    }
  }, [rows])

  if (checkingAccess) {
    return <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center text-xs font-bold uppercase tracking-widest text-slate-400">Checking Admin Access...</div>
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-6 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-900 transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
          >
            <ArrowLeft size={14} /> Back to Admin
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

        <section className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div ref={heroRef} className="px-6 py-6 md:px-8 md:py-8 bg-linear-to-r from-slate-900 via-blue-900 to-blue-800">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100">Admin Review</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white">Instructor Evaluation Directory</h1>
            <p className="mt-1 text-xs font-semibold text-blue-100/80">Open any instructor record to review anonymous student evaluation details.</p>
            <div ref={statsRef} className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Instructors</p>
                <p className="mt-1 text-2xl font-black text-white">{stats.instructorCount}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">With Responses</p>
                <p className="mt-1 text-2xl font-black text-white">{stats.withResponses}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Total Responses</p>
                <p className="mt-1 text-2xl font-black text-white">{stats.totalResponses}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50/50 space-y-4">
            {message ? <p className="text-sm font-semibold text-red-700">{message}</p> : null}
            {loadingData ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
                Loading evaluation directory...
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
                No instructors found.
              </div>
            ) : (
              <div ref={directoryRef} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rows.map((row, index) => (
                  <Link
                    ref={index === 0 ? cardRef : undefined}
                    key={row.instructorId}
                    href={`/dashboard/admin/evaluations/${encodeURIComponent(row.instructorId)}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-900 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Instructor</p>
                        <h2 className="mt-2 text-lg font-black text-slate-900">{row.fullName}</h2>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{row.instructorId}</p>
                      </div>
                      <ClipboardCheck className="size-5 text-blue-900" />
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-900">
                        <ShieldCheck size={12} />
                        {row.evaluationCount} response{row.evaluationCount === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                        <Star size={12} />
                        {row.evaluationCount > 0 ? "View details" : "No evaluations yet"}
                      </span>
                    </div>
                    <div className="mt-5 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-blue-900">
                      Open evaluation details <ArrowRight size={14} />
                    </div>
                  </Link>
                ))}
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
