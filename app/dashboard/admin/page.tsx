"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2, PlusCircle, UserRound, GraduationCap, Shield, Trash2, Pencil, Check, X } from "lucide-react"

type ManagedRole = "admin" | "flightops"
type RoleNoticeTone = "success" | "error" | "info"

interface InstructorRow {
  instructor_id: string
  full_name: string | null
}

interface StudentRow {
  student_id: string
  full_name: string | null
}

interface StaffRoleRow {
  id: string
  email: string | null
  role: string | null
}

export default function AdminPage() {
  const router = useRouter()
  const [checkingAccess, setCheckingAccess] = useState(true)

  const [instructorId, setInstructorId] = useState("")
  const [instructorName, setInstructorName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [studentName, setStudentName] = useState("")
  const [roleEmail, setRoleEmail] = useState("")
  const [roleValue, setRoleValue] = useState<ManagedRole>("flightops")

  const [savingInstructor, setSavingInstructor] = useState(false)
  const [savingStudent, setSavingStudent] = useState(false)
  const [savingRole, setSavingRole] = useState(false)

  const [instructorMsg, setInstructorMsg] = useState<string | null>(null)
  const [studentMsg, setStudentMsg] = useState<string | null>(null)
  const [roleMsg, setRoleMsg] = useState<string | null>(null)
  const [roleMsgTone, setRoleMsgTone] = useState<RoleNoticeTone>("info")
  const [listMsg, setListMsg] = useState<string | null>(null)

  const [instructors, setInstructors] = useState<InstructorRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [staffRoles, setStaffRoles] = useState<StaffRoleRow[]>([])
  const [loadingLists, setLoadingLists] = useState(false)
  const [rowBusyKey, setRowBusyKey] = useState<string | null>(null)

  const [editingInstructorId, setEditingInstructorId] = useState<string | null>(null)
  const [editingInstructorName, setEditingInstructorName] = useState("")
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [editingStudentName, setEditingStudentName] = useState("")

  const loadLists = useCallback(async () => {
    setLoadingLists(true)
    setListMsg(null)
    const [instructorRes, studentRes, roleRes] = await Promise.all([
      supabase.from("instructor_info").select("instructor_id, full_name").order("instructor_id", { ascending: true }),
      supabase.from("student_info").select("student_id, full_name").order("student_id", { ascending: true }),
      supabase.from("profiles").select("id, email, role").in("role", ["admin", "flightops"]).order("email", { ascending: true }),
    ])

    if (instructorRes.error || studentRes.error || roleRes.error) {
      setListMsg(instructorRes.error?.message || studentRes.error?.message || roleRes.error?.message || "Failed to load lists.")
      setLoadingLists(false)
      return
    }

    setInstructors((instructorRes.data as InstructorRow[]) || [])
    setStudents((studentRes.data as StudentRow[]) || [])
    setStaffRoles((roleRes.data as StaffRoleRow[]) || [])
    setLoadingLists(false)
  }, [])

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
        if (profile?.role === "flightops") {
          router.replace("/flight-ops")
          return
        }
        router.replace(`/dashboard/${profile?.role || "student"}/${user.id}`)
        return
      }

      await loadLists()
      setCheckingAccess(false)
    }

    guardAdminRoute()
  }, [loadLists, router])

  const stats = useMemo(
    () => ({
      instructorCount: instructors.length,
      studentCount: students.length,
      staffCount: staffRoles.length,
    }),
    [instructors.length, students.length, staffRoles.length]
  )
  const adminRoles = useMemo(() => staffRoles.filter((row) => row.role === "admin"), [staffRoles])
  const flightOpsRoles = useMemo(() => staffRoles.filter((row) => row.role === "flightops"), [staffRoles])

  const handleAddInstructor = async (event: FormEvent) => {
    event.preventDefault()
    setInstructorMsg(null)
    const id = instructorId.trim().toLowerCase()
    const name = instructorName.trim()
    if (!id || !name) {
      setInstructorMsg("Instructor ID and full name are required.")
      return
    }

    setSavingInstructor(true)
    const { error } = await supabase.from("instructor_info").insert([{ instructor_id: id, full_name: name }])
    setSavingInstructor(false)
    if (error) {
      setInstructorMsg(error.message)
      return
    }
    setInstructorId("")
    setInstructorName("")
    setInstructorMsg("Instructor added.")
    await loadLists()
  }

  const handleAddStudent = async (event: FormEvent) => {
    event.preventDefault()
    setStudentMsg(null)
    const id = studentId.trim().toLowerCase()
    const name = studentName.trim()
    if (!id || !name) {
      setStudentMsg("Student ID and full name are required.")
      return
    }

    setSavingStudent(true)
    const { error } = await supabase.from("student_info").insert([{ student_id: id, full_name: name }])
    setSavingStudent(false)
    if (error) {
      setStudentMsg(error.message)
      return
    }
    setStudentId("")
    setStudentName("")
    setStudentMsg("Student added.")
    await loadLists()
  }

  const handleAssignRole = async (event: FormEvent) => {
    event.preventDefault()
    setRoleMsg(null)
    setRoleMsgTone("info")
    const email = roleEmail.trim().toLowerCase()
    if (!email) {
      setRoleMsg("Email is required.")
      setRoleMsgTone("error")
      return
    }

    setSavingRole(true)
    let matchedProfile: StaffRoleRow | null = null

    const { data: exactProfile, error: exactLookupError } = await supabase
      .from("profiles")
      .select("id, email, role")
      .eq("email", email)
      .limit(1)
      .maybeSingle()

    if (exactLookupError) {
      setSavingRole(false)
      setRoleMsg(exactLookupError.message)
      setRoleMsgTone("error")
      return
    }
    matchedProfile = exactProfile as StaffRoleRow | null

    if (!matchedProfile?.id) {
      const { data: fuzzyProfiles, error: fuzzyLookupError } = await supabase
        .from("profiles")
        .select("id, email, role")
        .ilike("email", `%${email}%`)
        .limit(20)

      if (fuzzyLookupError) {
        setSavingRole(false)
        setRoleMsg(fuzzyLookupError.message)
        setRoleMsgTone("error")
        return
      }

      matchedProfile =
        ((fuzzyProfiles as StaffRoleRow[] | null) || []).find(
          (row) => String(row.email || "").trim().toLowerCase() === email
        ) || null
    }

    if (!matchedProfile?.id) {
      setSavingRole(false)
      setRoleMsg(`No profile found for ${email}.`)
      setRoleMsgTone("error")
      return
    }

    const previousRole = String(matchedProfile.role || "").toLowerCase()
    if (previousRole === roleValue) {
      setSavingRole(false)
      setRoleMsg(`Email ${matchedProfile.email || email} already has role '${roleValue}'.`)
      setRoleMsgTone("info")
      return
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: roleValue })
      .eq("id", matchedProfile.id)

    setSavingRole(false)
    if (updateError) {
      setRoleMsg(updateError.message)
      setRoleMsgTone("error")
      return
    }
    setRoleMsg(
      `Role updated for ${matchedProfile.email || email}: ${previousRole || "unassigned"} -> ${roleValue}.`
    )
    setRoleMsgTone("success")
    setRoleEmail("")
    await loadLists()
  }

  const handleDeleteInstructor = async (id: string) => {
    setRowBusyKey(`instructor-delete-${id}`)
    setListMsg(null)
    const { error } = await supabase.from("instructor_info").delete().ilike("instructor_id", id)
    setRowBusyKey(null)
    if (error) {
      setListMsg(error.message)
      return
    }
    await loadLists()
  }

  const handleDeleteStudent = async (id: string) => {
    setRowBusyKey(`student-delete-${id}`)
    setListMsg(null)
    const { error } = await supabase.from("student_info").delete().ilike("student_id", id)
    setRowBusyKey(null)
    if (error) {
      setListMsg(error.message)
      return
    }
    await loadLists()
  }

  const handleSaveInstructorName = async (id: string) => {
    const nextName = editingInstructorName.trim()
    if (!nextName) return
    setRowBusyKey(`instructor-edit-${id}`)
    const { error } = await supabase.from("instructor_info").update({ full_name: nextName }).ilike("instructor_id", id)
    setRowBusyKey(null)
    if (error) {
      setListMsg(error.message)
      return
    }
    setEditingInstructorId(null)
    setEditingInstructorName("")
    await loadLists()
  }

  const handleSaveStudentName = async (id: string) => {
    const nextName = editingStudentName.trim()
    if (!nextName) return
    setRowBusyKey(`student-edit-${id}`)
    const { error } = await supabase.from("student_info").update({ full_name: nextName }).ilike("student_id", id)
    setRowBusyKey(null)
    if (error) {
      setListMsg(error.message)
      return
    }
    setEditingStudentId(null)
    setEditingStudentName("")
    await loadLists()
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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="px-6 py-6 md:px-8 md:py-8 bg-linear-to-r from-slate-900 via-blue-900 to-blue-800">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100">Admin Enrollment</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white">Personnel & Roles Management</h1>
            <p className="mt-1 text-xs font-semibold text-blue-100/80">Add, edit, and remove instructors/students and manage staff roles.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Instructors</p>
                <p className="mt-1 text-2xl font-black text-white">{stats.instructorCount}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Students</p>
                <p className="mt-1 text-2xl font-black text-white">{stats.studentCount}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Admin/FlightOps</p>
                <p className="mt-1 text-2xl font-black text-white">{stats.staffCount}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 bg-slate-50/50">
            <div className="grid gap-6 lg:grid-cols-3">
              <form onSubmit={handleAddInstructor} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <UserRound size={16} className="text-blue-900" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Add Instructor</h2>
                </div>
                <input value={instructorId} onChange={(event) => setInstructorId(event.target.value)} placeholder="instructor_id" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                <input value={instructorName} onChange={(event) => setInstructorName(event.target.value)} placeholder="Full name" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                {instructorMsg ? <p className="text-xs font-semibold text-slate-600">{instructorMsg}</p> : null}
                <button type="submit" disabled={savingInstructor} className="h-10 px-4 rounded-lg bg-blue-900 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60">
                  {savingInstructor ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                  Save
                </button>
              </form>

              <form onSubmit={handleAddStudent} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <GraduationCap size={16} className="text-emerald-700" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Add Student</h2>
                </div>
                <input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="student_id" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                <input value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Full name" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                {studentMsg ? <p className="text-xs font-semibold text-slate-600">{studentMsg}</p> : null}
                <button type="submit" disabled={savingStudent} className="h-10 px-4 rounded-lg bg-emerald-700 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60">
                  {savingStudent ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                  Save
                </button>
              </form>

              <form onSubmit={handleAssignRole} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-amber-600" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Assign Role</h2>
                </div>
                <input value={roleEmail} onChange={(event) => setRoleEmail(event.target.value)} placeholder="user email" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                <select value={roleValue} onChange={(event) => setRoleValue(event.target.value as ManagedRole)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold">
                  <option value="flightops">flightops</option>
                  <option value="admin">admin</option>
                </select>
                {roleMsg ? (
                  <p
                    className={`text-xs font-semibold ${
                      roleMsgTone === "error"
                        ? "text-red-700"
                        : roleMsgTone === "success"
                          ? "text-emerald-700"
                          : "text-slate-600"
                    }`}
                  >
                    {roleMsg}
                  </p>
                ) : null}
                <button type="submit" disabled={savingRole} className="h-10 px-4 rounded-lg bg-amber-600 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60">
                  {savingRole ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                  Apply
                </button>
              </form>
            </div>

            {listMsg ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{listMsg}</div> : null}

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Instructor List</h3>
                </div>
                <div className="max-h-105 overflow-y-auto">
                  {loadingLists ? (
                    <p className="px-4 py-5 text-xs text-slate-500">Loading...</p>
                  ) : instructors.length === 0 ? (
                    <p className="px-4 py-5 text-xs text-slate-500">No instructors found.</p>
                  ) : (
                    instructors.map((row) => {
                      const busy = rowBusyKey === `instructor-edit-${row.instructor_id}` || rowBusyKey === `instructor-delete-${row.instructor_id}`
                      const isEditing = editingInstructorId === row.instructor_id
                      return (
                        <div key={row.instructor_id} className="px-4 py-3 border-b border-slate-100 last:border-b-0">
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{row.instructor_id}</p>
                          {isEditing ? (
                            <div className="mt-2 flex items-center gap-2">
                              <input value={editingInstructorName} onChange={(event) => setEditingInstructorName(event.target.value)} className="h-9 flex-1 rounded-md border border-slate-300 px-2 text-sm" />
                              <button type="button" onClick={() => handleSaveInstructorName(row.instructor_id)} disabled={busy} className="h-9 w-9 rounded-md bg-emerald-600 text-white inline-flex items-center justify-center">
                                <Check size={14} />
                              </button>
                              <button type="button" onClick={() => { setEditingInstructorId(null); setEditingInstructorName("") }} className="h-9 w-9 rounded-md border border-slate-300 text-slate-600 inline-flex items-center justify-center">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800">{row.full_name || "No name"}</p>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => { setEditingInstructorId(row.instructor_id); setEditingInstructorName(String(row.full_name || "")) }} className="h-8 w-8 rounded-md border border-slate-300 text-slate-600 inline-flex items-center justify-center">
                                  <Pencil size={13} />
                                </button>
                                <button type="button" onClick={() => handleDeleteInstructor(row.instructor_id)} disabled={busy} className="h-8 w-8 rounded-md bg-red-600 text-white inline-flex items-center justify-center disabled:opacity-40">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Student List</h3>
                </div>
                <div className="max-h-105 overflow-y-auto">
                  {loadingLists ? (
                    <p className="px-4 py-5 text-xs text-slate-500">Loading...</p>
                  ) : students.length === 0 ? (
                    <p className="px-4 py-5 text-xs text-slate-500">No students found.</p>
                  ) : (
                    students.map((row) => {
                      const busy = rowBusyKey === `student-edit-${row.student_id}` || rowBusyKey === `student-delete-${row.student_id}`
                      const isEditing = editingStudentId === row.student_id
                      return (
                        <div key={row.student_id} className="px-4 py-3 border-b border-slate-100 last:border-b-0">
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{row.student_id}</p>
                          {isEditing ? (
                            <div className="mt-2 flex items-center gap-2">
                              <input value={editingStudentName} onChange={(event) => setEditingStudentName(event.target.value)} className="h-9 flex-1 rounded-md border border-slate-300 px-2 text-sm" />
                              <button type="button" onClick={() => handleSaveStudentName(row.student_id)} disabled={busy} className="h-9 w-9 rounded-md bg-emerald-600 text-white inline-flex items-center justify-center">
                                <Check size={14} />
                              </button>
                              <button type="button" onClick={() => { setEditingStudentId(null); setEditingStudentName("") }} className="h-9 w-9 rounded-md border border-slate-300 text-slate-600 inline-flex items-center justify-center">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800">{row.full_name || "No name"}</p>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => { setEditingStudentId(row.student_id); setEditingStudentName(String(row.full_name || "")) }} className="h-8 w-8 rounded-md border border-slate-300 text-slate-600 inline-flex items-center justify-center">
                                  <Pencil size={13} />
                                </button>
                                <button type="button" onClick={() => handleDeleteStudent(row.student_id)} disabled={busy} className="h-8 w-8 rounded-md bg-red-600 text-white inline-flex items-center justify-center disabled:opacity-40">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Staff Role List (Profiles)</h3>
              </div>
              <div className="grid gap-4 p-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-200 bg-blue-50">
                    <p className="text-[11px] font-black uppercase tracking-wider text-blue-900">Admin Dashboard Access</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {loadingLists ? (
                      <p className="px-3 py-4 text-xs text-slate-500">Loading...</p>
                    ) : adminRoles.length === 0 ? (
                      <p className="px-3 py-4 text-xs text-slate-500">No admin profiles found.</p>
                    ) : (
                      adminRoles.map((row) => (
                        <div key={row.id} className="px-3 py-2 border-b border-slate-100 last:border-b-0">
                          <p className="text-sm font-semibold text-slate-800">{row.email || "No email"}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-800">role=admin</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-200 bg-amber-50">
                    <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">FlightOps Dashboard Access</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {loadingLists ? (
                      <p className="px-3 py-4 text-xs text-slate-500">Loading...</p>
                    ) : flightOpsRoles.length === 0 ? (
                      <p className="px-3 py-4 text-xs text-slate-500">No flightops profiles found.</p>
                    ) : (
                      flightOpsRoles.map((row) => (
                        <div key={row.id} className="px-3 py-2 border-b border-slate-100 last:border-b-0">
                          <p className="text-sm font-semibold text-slate-800">{row.email || "No email"}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">role=flightops</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
