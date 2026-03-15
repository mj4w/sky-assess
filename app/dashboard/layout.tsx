"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Bell, Settings, LogOut, Loader2, AlertTriangle, Sun, Moon, Menu } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase" //
import { useAutoLogout } from "@/hooks/useAutoLogout" //
import { DebriefCourseModal } from "@/components/DebriefCourseModal"
import SkyAssessLogo from "@/components/SkyAssessLogo"

interface AssignmentNotice {
  id: string
  text: string
  notificationRead: boolean
  targetUrl: string
  type: "assignment" | "evaluation" | "debrief"
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
  const [showIdReminderModal, setShowIdReminderModal] = useState(false)
  const [idUpdateRole, setIdUpdateRole] = useState<"student" | "instructor" | null>(null)
  const [currentIdValue, setCurrentIdValue] = useState("")
  const [newIdValue, setNewIdValue] = useState("")
  const [isUpdatingId, setIsUpdatingId] = useState(false)
  const [idUpdateError, setIdUpdateError] = useState("")
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  
  // Initialize your auto-logout hook (Default: 15 mins)
  useAutoLogout(15) 

  useEffect(() => {
    if (typeof window === "undefined") return
    const current = document.documentElement.classList.contains("dark") ? "dark" : "light"
    setTheme(current)
  }, [])

  useEffect(() => {
    const loadAssignmentNotices = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, instructor_id, student_id, login_first_time")
        .eq("id", user.id)
        .single()
      const role = String(profile?.role || "").toLowerCase()
      if (!profile || (role !== "instructor" && role !== "student")) {
        setAssignmentNotices([])
        return
      }

      const idValueRaw = (role === "instructor" ? profile.instructor_id : profile.student_id) || ""
      const idValue = String(idValueRaw).trim()
      setIdUpdateRole(role === "instructor" ? "instructor" : "student")
      setCurrentIdValue(idValue)
      if (profile.login_first_time !== true) {
        setShowIdReminderModal(true)
      }

      const idColumn = role === "instructor" ? "instructor_id" : "student_id"
      const readColumn = role === "instructor" ? "notification_read_instructor" : "notification_read_student"
      setNotificationColumn(readColumn)
      setAssignmentIdColumn(idColumn)
      if (!idValue) {
        setAssignmentNotices([])
        return
      }
      const idCandidates = [...new Set([idValue, idValue.toUpperCase(), idValue.toLowerCase()])]
      setAssignmentIdCandidates(idCandidates)

      const { data, error } = await supabase
        .from("flight_ops_assignments")
        .select("id, op_date, aircraft_type, aircraft_registry, slot_index, slot_span, lesson_no, notification_read_student, notification_read_instructor")
        .eq("op_date", toDateInput(new Date()))
        .in(idColumn, idCandidates)
        .order("slot_index", { ascending: true })

      if (error || !data) {
        setAssignmentNotices([])
        return
      }

      const notices: AssignmentNotice[] = data
        .filter((row) => {
          if (idColumn !== "instructor_id") return true
          const lessonNo = String(row.lesson_no || "").trim()
          return Boolean(lessonNo)
        })
        .map((row) => {
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

      if (role === "student") {
        const { data: debriefRows, error: debriefError } = await supabase
          .from("course_debriefs")
          .select("id, course_code, lesson_no, notify")
          .in("student_id", idCandidates)
          .eq("notify", false)
          .order("created_at", { ascending: false })

        if (!debriefError && debriefRows) {
          const debriefNotices: AssignmentNotice[] = debriefRows.map((row) => {
            const courseCode = String(row.course_code || "ppl").toLowerCase()
            const lessonNo = String(row.lesson_no || "").trim()
            return {
              id: String(row.id),
              text: `${String(row.course_code || "PPL")} debrief completed${lessonNo ? ` for lesson ${lessonNo}` : ""}.`,
              notificationRead: false,
              type: "debrief",
              targetUrl: `/dashboard/debrief/${courseCode}?debrief_id=${encodeURIComponent(String(row.id))}`,
            }
          })
          mergedNotices = [...debriefNotices, ...mergedNotices]
        }
      }

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

  const applyTheme = (nextTheme: "light" | "dark") => {
    if (typeof window === "undefined") return
    document.documentElement.classList.toggle("dark", nextTheme === "dark")
    window.localStorage.setItem("skyassess-theme", nextTheme)
    setTheme(nextTheme)
    setShowThemeMenu(false)
    setShowMobileMenu(false)
  }

  const unreadCount = useMemo(() => {
    return assignmentNotices.filter((item) => !item.notificationRead).length
  }, [assignmentNotices])

  const handleRequiredIdUpdate = async () => {
    if (!idUpdateRole) return
    setIdUpdateError("")
    const normalizedNewId = String(newIdValue || "").trim().toLowerCase()
    if (!normalizedNewId) {
      setIdUpdateError("Please enter your official ID.")
      return
    }
    if (!/^[a-z0-9_-]+$/.test(normalizedNewId)) {
      setIdUpdateError("Use only lowercase letters, numbers, underscore, or dash.")
      return
    }
    if (normalizedNewId === String(currentIdValue || "").trim().toLowerCase()) {
      setIdUpdateError("Please enter a different official ID.")
      return
    }

    setIsUpdatingId(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) {
        setIdUpdateError("Session expired. Please login again.")
        return
      }

      const { error: rpcError } = await supabase.rpc("sync_personnel_id", {
        new_personnel_id: normalizedNewId,
        expected_role: idUpdateRole,
      })
      if (rpcError) {
        setIdUpdateError(rpcError.message)
        return
      }

      setShowIdReminderModal(false)
      setNewIdValue("")
      window.location.reload()
    } finally {
      setIsUpdatingId(false)
    }
  }

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
    } else if (notice.type === "debrief") {
      const result = await supabase
        .from("course_debriefs")
        .update({ notify: true })
        .eq("id", noticeId)
        .in("student_id", assignmentIdCandidates)
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
    setShowMobileMenu(false)
    if (target.startsWith("/dashboard/tasks")) {
      router.push(target)
      return
    }
    if (target.startsWith("/dashboard/evaluate")) {
      router.push(target)
      return
    }
    if (target.startsWith("/dashboard/debrief/")) {
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
    <div className="min-h-screen w-full flex flex-col bg-[#FDFDFD] dark:bg-slate-950 font-sans">
      <header className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-30 shadow-sm shadow-slate-900/5">
        
        {/* Left: Branding */}
        <div className="flex items-center gap-4">
          <div 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-2 group cursor-pointer select-none"
            title="Refresh Terminal"
          >
            <SkyAssessLogo className="h-8 w-8 shrink-0 transition-transform group-hover:rotate-6" />
            <div className="flex flex-col">
              <h1 className="text-sm font-black italic uppercase tracking-tighter text-slate-900 dark:text-slate-100 leading-none">
                SkyAssess
              </h1>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                WCC Terminal
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden md:flex items-center gap-4 border-r border-slate-100 dark:border-slate-700 pr-6 mr-2 relative">
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
            <button
              onClick={() => setShowThemeMenu((prev) => !prev)}
              className="text-slate-400 hover:text-blue-900 transition-colors"
              title="Theme settings"
            >
              <Settings size={18} />
            </button>
            {showThemeMenu && (
              <div className="absolute right-0 top-10 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-40 p-2">
                <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Appearance</p>
                <button
                  type="button"
                  onClick={() => applyTheme("light")}
                  className={`w-full h-9 px-2 rounded-md text-left text-xs font-semibold inline-flex items-center gap-2 ${
                    theme === "light" ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <Sun size={14} /> Light mode
                </button>
                <button
                  type="button"
                  onClick={() => applyTheme("dark")}
                  className={`mt-1 w-full h-9 px-2 rounded-md text-left text-xs font-semibold inline-flex items-center gap-2 ${
                    theme === "dark" ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <Moon size={14} /> Night mode
                </button>
              </div>
            )}
            {showNotifications && (
              <div className="absolute right-8 top-10 w-96 max-w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
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
                        className={`w-full text-left px-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800 ${
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

          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => {
                setShowMobileMenu((prev) => !prev)
                setShowNotifications(false)
                setShowThemeMenu(false)
              }}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300"
              title="Menu"
            >
              <Menu size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {showMobileMenu && (
              <div className="absolute right-0 top-12 w-72 max-w-[85vw] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quick Actions</p>
                </div>
                <div className="p-3 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications((prev) => !prev)
                      setShowThemeMenu(false)
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                        <Bell size={16} />
                        Notifications
                      </div>
                      {unreadCount > 0 ? (
                        <span className="h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                          {unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </button>

                  {showNotifications && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="max-h-72 overflow-y-auto bg-white dark:bg-slate-900">
                        {assignmentNotices.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-slate-500">No notifications.</p>
                        ) : (
                          assignmentNotices.map((notice) => (
                            <button
                              key={notice.id}
                              type="button"
                              onClick={() => handleNotificationClick(notice.id)}
                              className={`w-full text-left px-3 py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                                notice.notificationRead ? "text-slate-400" : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              <p className="text-xs font-semibold">{notice.text}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setShowThemeMenu((prev) => !prev)
                        setShowNotifications(false)
                      }}
                      className="w-full px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                        <Settings size={16} />
                        Appearance
                      </div>
                    </button>
                    {showThemeMenu && (
                      <div className="border-t border-slate-200 dark:border-slate-700 p-2 space-y-1 bg-white dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() => applyTheme("light")}
                          className={`w-full h-9 px-2 rounded-md text-left text-xs font-semibold inline-flex items-center gap-2 ${
                            theme === "light" ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          <Sun size={14} /> Light mode
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTheme("dark")}
                          className={`w-full h-9 px-2 rounded-md text-left text-xs font-semibold inline-flex items-center gap-2 ${
                            theme === "dark" ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          <Moon size={14} /> Night mode
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full rounded-xl bg-red-50 px-3 py-3 text-left text-red-600 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-bold">
                      {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                      {isLoggingOut ? "Signing out..." : "Sign Out"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all group disabled:opacity-50"
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
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-size-[16px_16px] opacity-20 pointer-events-none" />
        <div className="relative z-10">
          {children}
        </div>
      </main>

      {showIdReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white shadow-2xl">
            <div className="border-b border-amber-100 bg-amber-50 px-5 py-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-700">Action Required</p>
              <div className="mt-2 flex items-center gap-2 text-slate-900">
                <AlertTriangle size={18} className="text-amber-600" />
                <h2 className="text-base font-black">Update Your ID Before Proceeding</h2>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-slate-700">
                Please set your official {idUpdateRole === "instructor" ? "instructor_id" : "student_id"} before proceeding.
              </p>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Current ID</p>
                <p className="text-sm font-black text-slate-900">{currentIdValue || "Not set"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                  New Official {idUpdateRole === "instructor" ? "Instructor" : "Student"} ID
                </label>
                <input
                  value={newIdValue}
                  onChange={(event) => setNewIdValue(event.target.value)}
                  disabled={isUpdatingId}
                  placeholder="e.g. gascon-001"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold lowercase"
                />
              </div>
              {idUpdateError ? <p className="text-xs font-semibold text-red-600">{idUpdateError}</p> : null}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isUpdatingId}
                  className="h-9 rounded-lg border border-slate-300 px-4 text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                >
                  Logout
                </button>
                <button
                  type="button"
                  onClick={handleRequiredIdUpdate}
                  disabled={isUpdatingId}
                  className="h-9 rounded-lg bg-blue-900 px-4 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {isUpdatingId ? "Updating..." : "Change ID & Continue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DebriefCourseModal
        open={showDebriefModal}
        onClose={() => setShowDebriefModal(false)}
      />
    </div>
  )
}
