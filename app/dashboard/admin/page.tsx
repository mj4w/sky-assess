"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2, PlusCircle, UserRound, GraduationCap } from "lucide-react"

export default function AdminPage() {
  const router = useRouter()
  const [instructorId, setInstructorId] = useState("")
  const [instructorName, setInstructorName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [studentName, setStudentName] = useState("")
  const [checkingAccess, setCheckingAccess] = useState(true)

  const [savingInstructor, setSavingInstructor] = useState(false)
  const [savingStudent, setSavingStudent] = useState(false)
  const [instructorMsg, setInstructorMsg] = useState<string | null>(null)
  const [studentMsg, setStudentMsg] = useState<string | null>(null)

  useEffect(() => {
    const guardAdminRoute = async () => {
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
        router.replace(`/dashboard/${profile?.role || "student"}/${user.id}`)
        return
      }

      setCheckingAccess(false)
    }

    guardAdminRoute()
  }, [router])

  const handleAddInstructor = async (e: FormEvent) => {
    e.preventDefault()
    setInstructorMsg(null)

    const id = instructorId.trim()
    const name = instructorName.trim()
    if (!id || !name) {
      setInstructorMsg("Instructor ID and full name are required.")
      return
    }

    setSavingInstructor(true)
    const { error } = await supabase
      .from("instructor_info")
      .insert([{ instructor_id: id, full_name: name }])
    setSavingInstructor(false)

    if (error) {
      setInstructorMsg(error.message)
      return
    }

    setInstructorId("")
    setInstructorName("")
    setInstructorMsg("Instructor added successfully.")
  }

  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault()
    setStudentMsg(null)

    const id = studentId.trim()
    const name = studentName.trim()
    if (!id || !name) {
      setStudentMsg("Student ID and full name are required.")
      return
    }

    setSavingStudent(true)
    const { error } = await supabase
      .from("student_info")
      .insert([{ student_id: id, full_name: name }])
    setSavingStudent(false)

    if (error) {
      setStudentMsg(error.message)
      return
    }

    setStudentId("")
    setStudentName("")
    setStudentMsg("Student added successfully.")
  }

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Checking Admin Access...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black italic uppercase text-slate-900 tracking-tight">Admin Enrollment</h1>
          <p className="text-slate-500 text-sm mt-1">Add instructors and students to your custom info tables.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <form onSubmit={handleAddInstructor} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserRound size={18} className="text-blue-900" />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Add Instructor</h2>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Instructor ID</label>
              <input
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                placeholder="INST-001"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
              <input
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
                placeholder="Captain Juan Dela Cruz"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>

            {instructorMsg && <p className="text-xs font-semibold text-slate-600">{instructorMsg}</p>}

            <button
              type="submit"
              disabled={savingInstructor}
              className="h-10 px-4 rounded-lg bg-blue-900 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60"
            >
              {savingInstructor ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
              Save Instructor
            </button>
          </form>

          <form onSubmit={handleAddStudent} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap size={18} className="text-red-600" />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Add Student</h2>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Student ID</label>
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="STD-001"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Pedro Santos"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>

            {studentMsg && <p className="text-xs font-semibold text-slate-600">{studentMsg}</p>}

            <button
              type="submit"
              disabled={savingStudent}
              className="h-10 px-4 rounded-lg bg-red-600 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60"
            >
              {savingStudent ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
              Save Student
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
