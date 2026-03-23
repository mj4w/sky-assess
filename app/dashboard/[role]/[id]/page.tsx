"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  LineChart, ClipboardList, 
  MessageSquare, UserCircle, ClipboardCheck,
  ArrowRight, ShieldAlert, HelpCircle
} from "lucide-react"
import Link from "next/link"
import { usePilotData } from "@/hooks/usePilotData"
import { Header } from "@/components/Header"
import { StatCard } from "@/components/StatCard"
import { DebriefCourseModal } from "@/components/DebriefCourseModal"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import InstructorDirectoryPage from "@/app/dashboard/profiles/page"
import SkyAssessLogo from "@/components/SkyAssessLogo"

type AssignmentUnreadRow = {
  id: string
  notification_read_student: boolean | null
  notification_read_instructor: boolean | null
}

function slotToHour(slot: number) {
  return `${String(6 + slot).padStart(2, "0")}:00`
}

const walkthroughSteps = [
  {
    key: "header",
    title: "Dashboard Header",
    description: "This area shows your identity, role, and top-level dashboard context before you navigate deeper.",
  },
  {
    key: "next-session",
    title: "Next Session",
    description: "This card shows your next scheduled aircraft, date, and expected reporting time.",
  },
  {
    key: "performance",
    title: "Performance",
    description: "Open your self-assessment and performance progress view here.",
  },
  {
    key: "instructor-eval",
    title: "Instructor Evaluation",
    description: "Use this section to submit your evaluation for the instructor assigned to your flights.",
  },
  {
    key: "checklists",
    title: "Checklists",
    description: "This opens your assigned flight schedules and lesson number entry page. The badge shows unread assignment notices.",
  },
  {
    key: "profile",
    title: "My Profile",
    description: "This section contains your student information, flight hours, completed lessons, and course status.",
  },
  {
    key: "debriefing",
    title: "Debriefing",
    description: "Open your signed debrief records and post-flight review items here.",
  },
] as const

const STUDENT_DASHBOARD_GUIDE_KEY = "student-dashboard-home"

// --- MINIMALIST NAV BUTTON ---
interface NavButtonProps {
  href?: string
  title: string
  icon: React.ReactNode
  description: string
  onClick?: () => void
  badgeCount?: number
  elementRef?: React.Ref<HTMLButtonElement | HTMLAnchorElement>
}

const NavButton = ({ href, title, icon, description, onClick, badgeCount = 0, elementRef }: NavButtonProps) => {
  const content = (
    <>
      <div className="p-3 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-blue-900 group-hover:text-white transition-all duration-300 shadow-sm">
        {icon}
      </div>
      <div>
        <span className="block font-black uppercase text-[11px] tracking-widest text-slate-900 group-hover:text-blue-900 transition-colors">
          {title}
        </span>
        <p className="text-[10px] text-slate-500 font-semibold mt-1 leading-relaxed">
          {description}
        </p>
      </div>
      {badgeCount > 0 && (
        <span className="absolute top-4 right-4 h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
          {badgeCount}
        </span>
      )}
      <ArrowRight className="absolute bottom-5 right-5 size-4 text-slate-300 group-hover:text-blue-900 group-hover:translate-x-1 transition-all" />
    </>
  );

  if (onClick) {
    return (
      <button ref={elementRef as React.Ref<HTMLButtonElement>} onClick={onClick} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-start justify-between gap-4 rounded-2xl hover:border-blue-900 transition-all hover:shadow-xl hover:shadow-blue-900/10 relative overflow-hidden text-left w-full">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-900 to-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        {content}
      </button>
    )
  }

  return (
    <Link ref={elementRef as React.Ref<HTMLAnchorElement>} href={href || "#"} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-start justify-between gap-4 rounded-2xl hover:border-blue-900 transition-all hover:shadow-xl hover:shadow-blue-900/10 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-900 to-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      {content}
    </Link>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { pilotData, loading, error } = usePilotData()
  const [showDebriefModal, setShowDebriefModal] = useState(false);
  const [assignmentUnreadCount, setAssignmentUnreadCount] = useState(0)
  const [debriefUnreadCount, setDebriefUnreadCount] = useState(0)
  const [nextSessionLabel, setNextSessionLabel] = useState("TBD")
  const [nextSessionSub, setNextSessionSub] = useState("Upcoming UTC")
  const [checklistDescription, setChecklistDescription] = useState("Assigned flight duties.")
  const [showWalkthrough, setShowWalkthrough] = useState(false)
  const [walkthroughStep, setWalkthroughStep] = useState(0)
  const [walkthroughRect, setWalkthroughRect] = useState<DOMRect | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [guideCompleted, setGuideCompleted] = useState(false)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const nextSessionRef = useRef<HTMLDivElement | null>(null)
  const performanceRef = useRef<HTMLAnchorElement | null>(null)
  const instructorEvalRef = useRef<HTMLAnchorElement | null>(null)
  const checklistRef = useRef<HTMLAnchorElement | null>(null)
  const profileRef = useRef<HTMLAnchorElement | null>(null)
  const debriefRef = useRef<HTMLButtonElement | null>(null)
  const isInstructor = pilotData?.role === 'instructor'
  const isAdmin = pilotData?.role === 'admin'
  const activeWalkthroughStep = walkthroughSteps[walkthroughStep]
  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        id: index,
        left: `${5 + index * 4.5}%`,
        delay: `${(index % 6) * 0.08}s`,
        duration: `${2.1 + (index % 5) * 0.18}s`,
        color: ["#1d4ed8", "#ef4444", "#38bdf8", "#f59e0b"][index % 4],
      })),
    []
  )

  useEffect(() => {
    if (isAdmin) {
      router.replace("/dashboard/admin")
    }
  }, [isAdmin, router])

  useEffect(() => {
    const loadGuideState = async () => {
      if (!pilotData || pilotData.role !== "student") return

      const { data, error } = await supabase
        .from("user_navigation_guides")
        .select("completed")
        .eq("user_id", pilotData.id)
        .eq("page_key", STUDENT_DASHBOARD_GUIDE_KEY)
        .maybeSingle()

      if (error && error.code !== "PGRST116" && error.code !== "42P01") {
        return
      }

      const isCompleted = Boolean(data?.completed)
      const isSkipped = String(data?.status || "").toLowerCase() === "skipped"
      setGuideCompleted(isCompleted)

      if (!data || (!isCompleted && !isSkipped)) {
        queueMicrotask(() => {
          setShowWalkthrough(true)
          setWalkthroughStep(0)
        })
      }
    }

    void loadGuideState()
  }, [pilotData])

  useEffect(() => {
    if (!showWalkthrough) return
    const activeElement =
      activeWalkthroughStep?.key === "header"
        ? headerRef.current
        : activeWalkthroughStep?.key === "next-session"
        ? nextSessionRef.current
        : activeWalkthroughStep?.key === "performance"
        ? performanceRef.current
        : activeWalkthroughStep?.key === "instructor-eval"
        ? instructorEvalRef.current
        : activeWalkthroughStep?.key === "checklists"
        ? checklistRef.current
        : activeWalkthroughStep?.key === "profile"
        ? profileRef.current
        : debriefRef.current

    activeElement?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" })
    const updateRect = () => {
      setWalkthroughRect(activeElement?.getBoundingClientRect() || null)
    }
    updateRect()
    window.addEventListener("resize", updateRect)
    window.addEventListener("scroll", updateRect, true)
    return () => {
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect, true)
    }
  }, [activeWalkthroughStep?.key, showWalkthrough])

  const persistGuideState = async (status: "completed" | "skipped") => {
    if (!pilotData?.id) return
    await supabase.from("user_navigation_guides").upsert(
      [{
        user_id: pilotData.id,
        page_key: STUDENT_DASHBOARD_GUIDE_KEY,
        completed: status === "completed",
        status,
        completed_at: new Date().toISOString(),
      }],
      { onConflict: "user_id,page_key" }
    )
  }

  const completeWalkthrough = async () => {
    await persistGuideState("completed")
    setGuideCompleted(true)
    setShowWalkthrough(false)
    setShowConfetti(true)
    window.setTimeout(() => setShowConfetti(false), 2600)
  }

  const skipWalkthrough = async () => {
    await persistGuideState("skipped")
    setGuideCompleted(false)
    setShowWalkthrough(false)
  }


  const loadDashboardData = useCallback(async () => {
    if (!pilotData || (pilotData.role !== "instructor" && pilotData.role !== "student")) {
      setAssignmentUnreadCount(0)
      setDebriefUnreadCount(0)
      setNextSessionLabel("TBD")
      setNextSessionSub("Be ready for upcoming flight briefing.")
      setChecklistDescription("Assigned flight duties.")
      return
    }

    const today = new Date()
    const todayDate = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`

    if (pilotData.role === "instructor") {
      const rawId = String(pilotData.instructor_id || "").trim()
      if (!rawId) {
        setAssignmentUnreadCount(0)
        setDebriefUnreadCount(0)
        return
      }

      const idCandidates = [...new Set([rawId, rawId.toUpperCase(), rawId.toLowerCase()])]
      const { data, error: fetchError } = await supabase
        .from("flight_ops_assignments")
        .select("id, notification_read_instructor")
        .eq("op_date", todayDate)
        .in("instructor_id", idCandidates)

      if (fetchError || !data) {
        setAssignmentUnreadCount(0)
        return
      }

      setAssignmentUnreadCount(
        (data as AssignmentUnreadRow[]).filter((row) => !Boolean(row.notification_read_instructor)).length
      )
      return
    }

    const rawStudentId = String(pilotData.student_id || "").trim()
    if (!rawStudentId) {
      setAssignmentUnreadCount(0)
      setDebriefUnreadCount(0)
      setNextSessionLabel("TBD")
      setNextSessionSub("Be ready for upcoming flight briefing.")
      setChecklistDescription("Assigned flight duties.")
      return
    }

    const studentCandidates = [...new Set([rawStudentId, rawStudentId.toUpperCase(), rawStudentId.toLowerCase()])]
    const [{ data: assignmentRows, error: assignmentError }, { data: debriefRows, error: debriefError }] = await Promise.all([
      supabase
        .from("flight_ops_assignments")
        .select("id, op_date, aircraft_type, aircraft_registry, slot_index, slot_span, flight_type, notification_read_student")
        .in("student_id", studentCandidates)
        .gte("op_date", todayDate)
        .order("op_date", { ascending: true })
        .order("slot_index", { ascending: true }),
      supabase
        .from("course_debriefs")
        .select("id, notify")
        .in("student_id", studentCandidates),
    ])

    if (assignmentError || !assignmentRows) {
      setAssignmentUnreadCount(0)
      setNextSessionLabel("TBD")
      setNextSessionSub("Be ready for upcoming flight briefing.")
      setChecklistDescription("No flight assigned for today.")
    } else {
      const todayAssignments = assignmentRows.filter((row) => String(row.op_date || "") === todayDate)
      setAssignmentUnreadCount(todayAssignments.filter((row) => !Boolean(row.notification_read_student)).length)

      const nextAssignment = assignmentRows[0]
      if (!nextAssignment) {
        setNextSessionLabel("TBD")
        setNextSessionSub("Be ready for upcoming flight briefing.")
      } else {
        const slotIndex = Number(nextAssignment.slot_index) || 0
        const slotSpan = Number(nextAssignment.slot_span) || 1
        const start = slotToHour(slotIndex)
        const end = slotToHour(slotIndex + slotSpan)
        const aircraft = `${String(nextAssignment.aircraft_type || "").trim()} ${String(nextAssignment.aircraft_registry || "").trim()}`.trim()
        setNextSessionLabel(aircraft || "Scheduled Flight")
        setNextSessionSub(`${String(nextAssignment.op_date || "")} · ${start}-${end} · Be ready 30 minutes before departure.`)
      }

      if (todayAssignments.length === 0) {
        setChecklistDescription("No flight assigned for today.")
      } else if (todayAssignments.length === 1) {
        const current = todayAssignments[0]
        const start = slotToHour(Number(current.slot_index) || 0)
        const end = slotToHour((Number(current.slot_index) || 0) + (Number(current.slot_span) || 1))
        setChecklistDescription(`Today: ${current.aircraft_type} ${current.aircraft_registry} · ${start}-${end} · ${current.flight_type}`)
      } else {
        setChecklistDescription(`Today: ${todayAssignments.length} assigned flights.`)
      }
    }

    if (debriefError || !debriefRows) {
      setDebriefUnreadCount(0)
      return
    }

    setDebriefUnreadCount(debriefRows.filter((row) => !Boolean(row.notify)).length)
  }, [pilotData])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboardData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadDashboardData])


  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-slate-950">
      <SkyAssessLogo className="h-12 w-12 mb-4 animate-pulse" />
      <p className="font-bold uppercase text-[10px] tracking-[0.4em] text-slate-400">Initializing Terminal</p>
    </div>
  )

  if (error) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-6 text-center">
      <ShieldAlert className="h-10 w-10 text-red-600 mb-4 opacity-20" />
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{error}</h2>
    </div>
  )

  if (isAdmin) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-slate-950">
        <SkyAssessLogo className="h-12 w-12 mb-4 animate-pulse" />
        <p className="font-bold uppercase text-[10px] tracking-[0.4em] text-slate-400">Redirecting...</p>
      </div>
    )
  }

  if (!pilotData) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-6 text-center">
        <ShieldAlert className="h-10 w-10 text-red-600 mb-4 opacity-20" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Unable to load dashboard profile.</h2>
      </div>
    )
  }

  if (isInstructor) return <InstructorDirectoryPage />

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 font-sans">
      <div className="max-w-7xl mx-auto p-6 lg:p-12 space-y-8">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/60 dark:shadow-slate-950/50 overflow-hidden">
          <div className="px-6 py-6 md:px-8 md:py-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <div ref={headerRef}>
              <Header pilotData={pilotData} role={pilotData.role} id={pilotData.id} />
            </div>
          </div>
          <div className="px-6 py-4 md:px-8 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800">
            <p className="text-xs font-semibold text-blue-100/80 uppercase tracking-widest">Flight Operations Terminal</p>
          </div>

          <div className="p-6 md:p-8 space-y-8 bg-slate-50/60 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600">
                <HelpCircle size={14} className="text-blue-900" />
                {guideCompleted ? "Tour completed." : "Tour not yet completed."}
              </div>
              <button
                type="button"
                onClick={() => {
                  setWalkthroughStep(0)
                  setShowWalkthrough(true)
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-wider text-slate-700 hover:border-blue-900 hover:text-blue-900"
              >
                <HelpCircle size={14} />
                Replay Tour
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div ref={nextSessionRef}>
                <StatCard title="Next Session" value={nextSessionLabel} sub={nextSessionSub} variant="white" />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 pt-2">
              <NavButton href="/dashboard/performance" title="Performance" description="Training progress curves." icon={<LineChart size={20} />} elementRef={performanceRef} />
              <NavButton href="/dashboard/instructor-evaluation" title="Instructor Eval" description="Submit instructor feedback." icon={<ClipboardCheck size={20} />} elementRef={instructorEvalRef} />
              <NavButton href="/dashboard/tasks" title="Checklists" description={checklistDescription} icon={<ClipboardList size={20} />} badgeCount={assignmentUnreadCount} elementRef={checklistRef} />
              <NavButton href="/dashboard/profile" title="My Profile" description="Certificates & info." icon={<UserCircle size={20} />} elementRef={profileRef} />
              <NavButton 
                onClick={() => setShowDebriefModal(true)} 
                title="Debriefing" 
                description="Post-flight notes & logs." 
                icon={<MessageSquare size={20} />} 
                badgeCount={debriefUnreadCount}
                elementRef={debriefRef}
              />
            </div>
          </div>
        </div>
      </div>
      {showWalkthrough && activeWalkthroughStep && walkthroughRect ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/55" />
          <div
            className="pointer-events-none absolute rounded-2xl border-2 border-sky-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.55)] transition-all"
            style={{
              top: walkthroughRect.top - 8,
              left: walkthroughRect.left - 8,
              width: walkthroughRect.width + 16,
              height: walkthroughRect.height + 16,
            }}
          />
          <div
            className="absolute w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            style={{
              top: Math.min(walkthroughRect.bottom + 18, typeof window !== "undefined" ? window.innerHeight - 220 : walkthroughRect.bottom + 18),
              left: Math.min(walkthroughRect.left, typeof window !== "undefined" ? window.innerWidth - 340 : walkthroughRect.left),
            }}
          >
            <div className="absolute -top-2 left-8 h-4 w-4 rotate-45 border-l border-t border-slate-200 bg-white" />
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-900">
              Step {walkthroughStep + 1} of {walkthroughSteps.length}
            </p>
            <h3 className="mt-2 text-lg font-black text-slate-900">{activeWalkthroughStep.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{activeWalkthroughStep.description}</p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => void skipWalkthrough()}
                className="text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900"
              >
                Skip Tour
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWalkthroughStep((prev) => Math.max(0, prev - 1))}
                  disabled={walkthroughStep === 0}
                  className="h-10 rounded-lg border border-slate-300 px-4 text-[11px] font-black uppercase tracking-wider text-slate-700 disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (walkthroughStep === walkthroughSteps.length - 1) {
                      void completeWalkthrough()
                      return
                    }
                    setWalkthroughStep((prev) => prev + 1)
                  }}
                  className="h-10 rounded-lg bg-blue-900 px-4 text-[11px] font-black uppercase tracking-wider text-white"
                >
                  {walkthroughStep === walkthroughSteps.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {showConfetti ? (
        <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="absolute top-[-10%] h-4 w-2 rounded-full confetti-piece"
              style={{
                left: piece.left,
                backgroundColor: piece.color,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
              }}
            />
          ))}
        </div>
      ) : null}
      <DebriefCourseModal
        open={showDebriefModal}
        onClose={() => setShowDebriefModal(false)}
      />
      <style jsx global>{`
        @keyframes skyassess-confetti-fall {
          0% { transform: translate3d(0, -10vh, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(0, 110vh, 0) rotate(540deg); opacity: 0; }
        }
        .confetti-piece {
          animation-name: skyassess-confetti-fall;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  )
}

