/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useState } from 'react';
import { 
  LineChart, ClipboardList, 
  MessageSquare, UserCircle, ClipboardCheck,
  ArrowRight, ShieldAlert
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

// --- MINIMALIST NAV BUTTON ---
const NavButton = ({ href, title, icon, description, onClick, badgeCount = 0 }: any) => {
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
      <button onClick={onClick} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-start justify-between gap-4 rounded-2xl hover:border-blue-900 transition-all hover:shadow-xl hover:shadow-blue-900/10 relative overflow-hidden text-left w-full">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-900 to-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        {content}
      </button>
    )
  }

  return (
    <Link href={href} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-start justify-between gap-4 rounded-2xl hover:border-blue-900 transition-all hover:shadow-xl hover:shadow-blue-900/10 relative overflow-hidden">
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
  const isInstructor = pilotData?.role === 'instructor'
  const isAdmin = pilotData?.role === 'admin'
  useEffect(() => {
    if (isAdmin) {
      router.replace("/dashboard/admin")
    }
  }, [isAdmin, router])


  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!pilotData || (pilotData.role !== "instructor" && pilotData.role !== "student")) {
        setAssignmentUnreadCount(0)
        return
      }

      const role = pilotData.role
      const idColumn = role === "instructor" ? "instructor_id" : "student_id"
      const readColumn = role === "instructor" ? "notification_read_instructor" : "notification_read_student"
      const rawId = String(role === "instructor" ? pilotData.instructor_id || "" : pilotData.student_id || "").trim()
      if (!rawId) {
        setAssignmentUnreadCount(0)
        return
      }

      const idCandidates = [...new Set([rawId, rawId.toUpperCase(), rawId.toLowerCase()])]
      const today = new Date()
      const todayDate = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`
      const { data, error: fetchError } = await supabase
        .from("flight_ops_assignments")
        .select("id, notification_read_student, notification_read_instructor")
        .eq("op_date", todayDate)
        .in(idColumn, idCandidates)

      if (fetchError || !data) {
        setAssignmentUnreadCount(0)
        return
      }

      const rows = data as AssignmentUnreadRow[]
      const unreadCount = rows.filter((row) =>
        readColumn === "notification_read_instructor"
          ? !Boolean(row.notification_read_instructor)
          : !Boolean(row.notification_read_student)
      ).length

      setAssignmentUnreadCount(unreadCount)
    }

    loadUnreadCount()
  }, [pilotData])

  useEffect(() => {
    const loadDebriefUnreadCount = async () => {
      if (!pilotData || pilotData.role !== "student") {
        setDebriefUnreadCount(0)
        return
      }

      const studentId = String(pilotData.student_id || "").trim()
      if (!studentId) {
        setDebriefUnreadCount(0)
        return
      }

      const studentCandidates = [...new Set([studentId, studentId.toLowerCase(), studentId.toUpperCase()])]
      const { data, error: fetchError } = await supabase
        .from("course_debriefs")
        .select("id, notify")
        .in("student_id", studentCandidates)

      if (fetchError || !data) {
        setDebriefUnreadCount(0)
        return
      }

      setDebriefUnreadCount(data.filter((row) => !Boolean(row.notify)).length)
    }

    loadDebriefUnreadCount()
  }, [pilotData])

  useEffect(() => {
    const slotToHour = (slot: number) => `${String(6 + slot).padStart(2, "0")}:00`

    const loadNextSession = async () => {
      if (!pilotData || pilotData.role !== "student") {
        setNextSessionLabel("TBD")
        setNextSessionSub("Be ready for upcoming flight briefing.")
        return
      }

      const studentId = String(pilotData.student_id || "").trim()
      if (!studentId) {
        setNextSessionLabel("TBD")
        setNextSessionSub("Be ready for upcoming flight briefing.")
        return
      }

      const idCandidates = [...new Set([studentId, studentId.toUpperCase(), studentId.toLowerCase()])]
      const today = new Date()
      const todayDate = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`

      const { data, error: fetchError } = await supabase
        .from("flight_ops_assignments")
        .select("op_date, aircraft_type, aircraft_registry, slot_index, slot_span")
        .in("student_id", idCandidates)
        .gte("op_date", todayDate)
        .order("op_date", { ascending: true })
        .order("slot_index", { ascending: true })
        .limit(1)

      if (fetchError || !data?.[0]) {
        setNextSessionLabel("TBD")
        setNextSessionSub("Be ready for upcoming flight briefing.")
        return
      }

      const next = data[0]
      const slotIndex = Number(next.slot_index) || 0
      const slotSpan = Number(next.slot_span) || 1
      const start = slotToHour(slotIndex)
      const end = slotToHour(slotIndex + slotSpan)
      const dateLabel = String(next.op_date || "")
      const aircraft = `${String(next.aircraft_type || "").trim()} ${String(next.aircraft_registry || "").trim()}`.trim()

      setNextSessionLabel(aircraft || "Scheduled Flight")
      setNextSessionSub(`${dateLabel} · ${start}-${end} · Be ready 30 minutes before departure.`)
    }

    loadNextSession()
  }, [pilotData])

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
            <Header pilotData={pilotData} role={pilotData.role} id={pilotData.id} />
          </div>
          <div className="px-6 py-4 md:px-8 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800">
            <p className="text-xs font-semibold text-blue-100/80 uppercase tracking-widest">Flight Operations Terminal</p>
          </div>

          <div className="p-6 md:p-8 space-y-8 bg-slate-50/60 dark:bg-slate-900/80">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Next Session" value={nextSessionLabel} sub={nextSessionSub} variant="white" />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 pt-2">
              <NavButton href="/dashboard/performance" title="Performance" description="Training progress curves." icon={<LineChart size={20} />} />
              <NavButton href="/dashboard/instructor-evaluation" title="Instructor Eval" description="Submit instructor feedback." icon={<ClipboardCheck size={20} />} />
              <NavButton href="/dashboard/tasks" title="Checklists" description="Assigned flight duties." icon={<ClipboardList size={20} />} badgeCount={assignmentUnreadCount} />
              <NavButton href="/dashboard/profile" title="My Profile" description="Certificates & info." icon={<UserCircle size={20} />} />
              <NavButton 
                onClick={() => setShowDebriefModal(true)} 
                title="Debriefing" 
                description="Post-flight notes & logs." 
                icon={<MessageSquare size={20} />} 
                badgeCount={debriefUnreadCount}
              />
            </div>
          </div>
        </div>
      </div>
      <DebriefCourseModal
        open={showDebriefModal}
        onClose={() => setShowDebriefModal(false)}
      />
    </div>
  )
}
