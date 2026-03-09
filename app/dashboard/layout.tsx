"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Plane, Bell, Settings, LogOut, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase" //
import { useAutoLogout } from "@/hooks/useAutoLogout" //
import { DebriefCourseModal } from "@/components/DebriefCourseModal"

interface AssignmentNotice {
  id: string
  text: string
  notificationRead: boolean
  targetUrl: string
  type: "assignment" | "evaluation"
}

function toDateInput(date: Date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, "0")
  const d = `${date.getDate()}`.padStart(2, "0")
  return `${y}-${m}-${d}`
}

function slotToHour(slot: number) {
  const hour = 6 + slot
  return `${hour.toString().padStart(2, "0")}:00`
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showDebriefModal, setShowDebriefModal] = useState(false)
  const [assignmentNotices, setAssignmentNotices] = useState<AssignmentNotice[]>([])
  const [notificationColumn, setNotificationColumn] = useState<"notification_read_student" | "notification_read_instructor">("notification_read_student")
  const [assignmentIdColumn, setAssignmentIdColumn] = useState<"student_id" | "instructor_id">("student_id")
  const [assignmentIdCandidates, setAssignmentIdCandidates] = useState<string[]>([])
  
  // Initialize your auto-logout hook (Default: 15 mins)
  useAutoLogout(15) 

  useEffect(() => {
    const loadAssignmentNotices = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, instructor_id, student_id")
        .eq("id", user.id)
        .single()
      const role = String(profile?.role || "").toLowerCase()
      if (!profile || (role !== "instructor" && role !== "student")) {
        setAssignmentNotices([])
        return
      }

      const idColumn = role === "instructor" ? "instructor_id" : "student_id"
      const readColumn = role === "instructor" ? "notification_read_instructor" : "notification_read_student"
      setNotificationColumn(readColumn)
      setAssignmentIdColumn(idColumn)
      const idValueRaw = (role === "instructor" ? profile.instructor_id : profile.student_id) || ""
      const idValue = String(idValueRaw).trim()
      if (!idValue) {
        setAssignmentNotices([])
        return
      }
      const idCandidates = [...new Set([idValue, idValue.toUpperCase(), idValue.toLowerCase()])]
      setAssignmentIdCandidates(idCandidates)

      const { data, error } = await supabase
        .from("flight_ops_assignments")
        .select("id, op_date, aircraft_type, aircraft_registry, slot_index, slot_span, notification_read_student, notification_read_instructor")
        .eq("op_date", toDateInput(new Date()))
        .in(idColumn, idCandidates)
        .order("slot_index", { ascending: true })

      if (error || !data) {
        setAssignmentNotices([])
        return
      }

      const notices: AssignmentNotice[] = data.map((row) => {
        const start = Number(row.slot_index) || 0
        const span = Number(row.slot_span) || 1
        const end = start + span
        const message =
          idColumn === "student_id"
            ? `Assigned new flight schedule: ${row.aircraft_type} ${row.aircraft_registry} (${slotToHour(start)}-${slotToHour(end)})`
            : `Ready for debriefing: ${row.aircraft_type} ${row.aircraft_registry} (${slotToHour(start)}-${slotToHour(end)})`

        return {
          id: String(row.id),
          text: message,
          notificationRead: Boolean(
            readColumn === "notification_read_instructor"
              ? row.notification_read_instructor
              : row.notification_read_student
          ),
          type: "assignment",
          targetUrl:
            idColumn === "student_id"
              ? `/dashboard/tasks?assignment_id=${encodeURIComponent(String(row.id))}`
              : `/dashboard/debrief/ppl`,
        }
      })

      let mergedNotices = notices.filter((item) => !item.notificationRead)

      if (role === "instructor") {
        const { data: evalData, error: evalError } = await supabase
          .from("student_instructor_feedback")
          .select("id, eval_month, notify")
          .in("instructor_id", idCandidates)
          .is("notify", null)
          .order("created_at", { ascending: false })

        if (!evalError && evalData) {
          const evalNotices: AssignmentNotice[] = evalData.map((row) => ({
            id: String(row.id),
            text: `New anonymous student evaluation (${row.eval_month})`,
            notificationRead: false,
            type: "evaluation",
            targetUrl: "/dashboard/evaluate",
          }))
          mergedNotices = [...evalNotices, ...mergedNotices]
        }
      }

      setAssignmentNotices(mergedNotices)
    }

    loadAssignmentNotices()
  }, [])

  const unreadCount = useMemo(() => {
    return assignmentNotices.filter((item) => !item.notificationRead).length
  }, [assignmentNotices])

  const handleNotificationClick = async (noticeId: string) => {
    if (assignmentIdCandidates.length === 0) return
    const notice = assignmentNotices.find((item) => item.id === noticeId)
    if (!notice) return
    const target = notice.targetUrl || "/dashboard/tasks"

    let error: { message?: string } | null = null
    if (notice.type === "evaluation") {
      const result = await supabase
        .from("student_instructor_feedback")
        .update({ notify: true })
        .eq("id", noticeId)
        .in("instructor_id", assignmentIdCandidates)
      error = result.error
    } else {
      const result = await supabase
        .from("flight_ops_assignments")
        .update({ [notificationColumn]: true })
        .eq("id", noticeId)
        .in(assignmentIdColumn, assignmentIdCandidates)
      error = result.error
    }

    if (!error) {
      setAssignmentNotices((prev) => prev.filter((item) => item.id !== noticeId))
    }

    setShowNotifications(false)
    if (target.startsWith("/dashboard/tasks")) {
      router.push(target)
      return
    }
    if (target.startsWith("/dashboard/evaluate")) {
      router.push(target)
      return
    }
    setShowDebriefModal(true)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    
    try {
      // Use the same Supabase logic from your hook
      const { error } = await supabase.auth.signOut() 
      
      if (error) throw error

      // Professional delay for session synchronization
      await new Promise(resolve => setTimeout(resolve, 600))
      
      router.push('/login')
    } catch (error) {
      console.error("Manual logout failed:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#FDFDFD] font-sans">
      <header className="h-16 shrink-0 flex items-center justify-between px-8 bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm shadow-slate-900/5">
        
        {/* Left: Branding */}
        <div className="flex items-center gap-4">
          <div 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-2 group cursor-pointer select-none"
            title="Refresh Terminal"
          >
            <div className="bg-blue-900 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
              <Plane className="size-4 text-white -rotate-45" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                SkyAssess
              </h1>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                WCC Terminal
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 border-r border-slate-100 pr-6 mr-2 relative">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className="text-slate-400 hover:text-blue-900 transition-colors relative"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button className="text-slate-400 hover:text-blue-900 transition-colors">
              <Settings size={18} />
            </button>
            {showNotifications && (
              <div className="absolute right-8 top-10 w-96 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notifications</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {assignmentNotices.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-slate-500">No notifications.</p>
                  ) : (
                    assignmentNotices.map((notice) => (
                      <button
                        key={notice.id}
                        type="button"
                        onClick={() => handleNotificationClick(notice.id)}
                        className={`w-full text-left px-3 py-2 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 ${
                          notice.notificationRead ? "text-slate-400" : "text-slate-700"
                        }`}
                      >
                        <p className="text-xs font-semibold">{notice.text}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all group disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <span className="text-[10px] font-bold uppercase tracking-widest">Sign Out</span>
                <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full relative">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] opacity-20 pointer-events-none" />
        <div className="relative z-10">
          {children}
        </div>
      </main>

      <DebriefCourseModal
        open={showDebriefModal}
        onClose={() => setShowDebriefModal(false)}
      />
    </div>
  )
}
