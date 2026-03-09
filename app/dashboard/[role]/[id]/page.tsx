/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useState } from 'react';
import { 
  LineChart, FileText, ClipboardList, 
  ClipboardCheck, Users, Calendar, MessageSquare, UserCircle, 
  ArrowRight, Plane, ShieldAlert, GraduationCap, ChevronRight
} from "lucide-react"
import Link from "next/link"
import { usePilotData } from "@/hooks/usePilotData"
import { Header } from "@/components/Header"
import { StatCard } from "@/components/StatCard"
import { motion, AnimatePresence } from "framer-motion"
import { DebriefCourseModal } from "@/components/DebriefCourseModal"
import { useRouter } from "next/navigation"

// --- MINIMALIST NAV BUTTON ---
const NavButton = ({ href, title, icon, description, onClick }: any) => {
  const content = (
    <>
      <div className="p-3 rounded-lg bg-slate-50 text-slate-600 group-hover:bg-blue-900 group-hover:text-white transition-all duration-300">
        {icon}
      </div>
      <div>
        <span className="block font-bold uppercase text-[11px] tracking-widest text-slate-900 group-hover:text-blue-900 transition-colors">
          {title}
        </span>
        <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">
          {description}
        </p>
      </div>
      <ArrowRight className="absolute bottom-6 right-6 size-4 text-slate-200 group-hover:text-blue-900 group-hover:translate-x-1 transition-all" />
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="group bg-white border border-slate-200 p-6 flex flex-col items-start justify-between gap-4 rounded-xl hover:border-blue-900 transition-all hover:shadow-xl hover:shadow-blue-900/5 relative overflow-hidden text-left w-full">
        {content}
      </button>
    )
  }

  return (
    <Link href={href} className="group bg-white border border-slate-200 p-6 flex flex-col items-start justify-between gap-4 rounded-xl hover:border-blue-900 transition-all hover:shadow-xl hover:shadow-blue-900/5 relative overflow-hidden">
      {content}
    </Link>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { pilotData, loading, error } = usePilotData()
  const [hasEntered, setHasEntered] = useState(false);
  const [showDebriefModal, setShowDebriefModal] = useState(false);
  const isInstructor = pilotData?.role === 'instructor'
  const isAdmin = pilotData?.role === 'admin'
  const displayId = pilotData?.role === "instructor" ? pilotData?.instructor_id : pilotData?.student_id
  const displayName = pilotData?.full_name || displayId || pilotData?.email
  console.log(pilotData?.full_name)
  useEffect(() => {
    if (isAdmin) {
      router.replace("/dashboard/admin")
    }
  }, [isAdmin, router])

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
      <Plane className="h-8 w-8 text-blue-900 animate-pulse mb-4" />
      <p className="font-bold uppercase text-[10px] tracking-[0.4em] text-slate-400">Initializing Terminal</p>
    </div>
  )

  if (error) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
      <ShieldAlert className="h-10 w-10 text-red-600 mb-4 opacity-20" />
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{error}</h2>
    </div>
  )

  if (isAdmin) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
        <Plane className="h-8 w-8 text-blue-900 animate-pulse mb-4" />
        <p className="font-bold uppercase text-[10px] tracking-[0.4em] text-slate-400">Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans">
      <AnimatePresence mode="wait">
        
        {/* 1. INITIAL ROLE SELECTION */}
        {!hasEntered && !isAdmin ? (
          <motion.div 
            key="selector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white"
            >
              <div className="p-12 text-center space-y-8">
                <div className="space-y-2">
                  <div className="bg-blue-900 text-white inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter mb-4">
                    WCC Aviation
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Select your Platform</h2>
                  <p className="text-slate-400 text-sm">Welcome back, {displayName}. Please select your terminal.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <button 
                    disabled={!isInstructor}
                    onClick={() => setHasEntered(true)}
                    className={`group relative p-8 rounded-2xl border-2 transition-all text-left ${isInstructor ? 'border-blue-900 bg-blue-50/30 shadow-lg shadow-blue-900/10' : 'opacity-40 grayscale border-slate-100 cursor-not-allowed'}`}
                  >
                    <div className="bg-blue-900 text-white p-3 rounded-xl w-fit mb-6 shadow-lg shadow-blue-900/20">
                      <ClipboardCheck size={24} />
                    </div>
                    <h3 className="font-black uppercase italic text-lg text-blue-900">Instructor</h3>
                    <p className="text-xs text-slate-500 mt-1">Management & Evaluations</p>
                    <ChevronRight className="absolute bottom-8 right-8 text-blue-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button 
                    disabled={isInstructor}
                    onClick={() => setHasEntered(true)}
                    className={`group relative p-8 rounded-2xl border-2 transition-all text-left ${!isInstructor ? 'border-red-600 bg-red-50/30 shadow-lg shadow-red-600/10' : 'opacity-40 grayscale border-slate-100 cursor-not-allowed'}`}
                  >
                    <div className="bg-red-600 text-white p-3 rounded-xl w-fit mb-6 shadow-lg shadow-red-600/20">
                      <GraduationCap size={24} />
                    </div>
                    <h3 className="font-black uppercase italic text-lg text-red-600">Student</h3>
                    <p className="text-xs text-slate-500 mt-1">Performance & Records</p>
                    <ChevronRight className="absolute bottom-8 right-8 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* --- ACTUAL DASHBOARD CONTENT --- */
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto p-6 lg:p-12 space-y-12"
          >
            <Header pilotData={pilotData!} role={pilotData!.role} id={pilotData!.id} />

            {/* Stats Section */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title={isInstructor ? "Flight Log Today" : "Total Airtime"} value={isInstructor ? (pilotData?.today_count ?? "0") : (pilotData?.total_hours ?? "0.0")} sub="Hours tracked" variant="blue" />
              <StatCard title={isInstructor ? "Pending Evals" : "Recent Eval"} value={isInstructor ? (pilotData?.pending_count ?? "0") : `${pilotData?.last_eval ?? "--"}%`} sub="Awaiting action" variant="white" />
              <StatCard title="Authorization" value={isInstructor ? "Faculty" : (pilotData?.phase ?? "Cadet")} sub="Clearance Level" variant="red" />
              <StatCard title="Next Session" value={pilotData?.next_flight ?? "TBD"} sub="Upcoming UTC" variant="white" />
            </div>

            {/* Quick Actions Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-4">
              {isInstructor ? (
                <>
                  <NavButton href="/dashboard/evaluate" title="Evaluation" description="Review cadet maneuvers." icon={<ClipboardCheck size={20} />} />
                  <NavButton 
                    onClick={() => setShowDebriefModal(true)} 
                    title="Debriefing" 
                    description="Post-flight notes & logs." 
                    icon={<MessageSquare size={20} />} 
                  />
                  <NavButton href="/dashboard/profiles" title="Directory" description="Access student records." icon={<Users size={20} />} />
                  <NavButton href="/dashboard/schedules" title="Calendar" description="Flight training blocks." icon={<Calendar size={20} />} />
                </>
              ) : (
                <>
                  <NavButton href="/dashboard/performance" title="Analytics" description="Training progress curves." icon={<LineChart size={20} />} />
                  <NavButton href="/dashboard/records" title="Flight Logs" description="Digital logbook history." icon={<FileText size={20} />} />
                  <NavButton href="/dashboard/tasks" title="Checklists" description="Assigned flight duties." icon={<ClipboardList size={20} />} />
                  <NavButton href="/dashboard/profile" title="My Profile" description="Certificates & info." icon={<UserCircle size={20} />} />
                  {/* Add Debriefing for students */}
                  <NavButton 
                    onClick={() => setShowDebriefModal(true)} 
                    title="Debriefing" 
                    description="Post-flight notes & logs." 
                    icon={<MessageSquare size={20} />} 
                  />
                </>
              )}
            </div>
          </motion.div>
        )}
        {/* --- DEBRIEFING COURSE SELECTION MODAL --- */}
        <DebriefCourseModal
          open={showDebriefModal}
          onClose={() => setShowDebriefModal(false)}
        />
      </AnimatePresence>
    </div>
  )
}
