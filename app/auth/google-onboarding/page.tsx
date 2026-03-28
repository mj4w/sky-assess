"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, ShieldCheck, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import ForceLightMode from "@/components/ForceLightMode"
import SkyAssessLogo from "@/components/SkyAssessLogo"

type UserRole = "student" | "instructor"

function makeTemporaryId(role: UserRole, userId: string) {
  const suffix = userId.replace(/-/g, "").slice(0, 8).toLowerCase()
  return `${role}_temp_${suffix}`
}

function resolveDestination(role: UserRole, userId: string, nextUrl: string | null) {
  if (nextUrl && nextUrl.startsWith("/")) return nextUrl
  return `/dashboard/${role}/${userId}`
}

export default function GoogleOnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<UserRole>("student")
  const [userId, setUserId] = useState("")
  const nextUrl = useMemo(() => {
    if (typeof window === "undefined") return null
    return new URLSearchParams(window.location.search).get("next")
  }, [])

  useEffect(() => {
    const loadUser = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) {
        router.replace("/login")
        return
      }

      setUserId(user.id)
      setEmail(String(user.email || "").trim().toLowerCase())
      setFullName(String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim())

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      const existingRole = String(profile?.role || "").toLowerCase()
      if (existingRole === "student" || existingRole === "instructor") {
        setRole(existingRole)
      }

      setLoading(false)
    }

    void loadUser()
  }, [router])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!userId) return

    const normalizedName = fullName.trim()
    if (!normalizedName) {
      setError("Full name is required.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const temporaryId = makeTemporaryId(role, userId)

      const profilePayload = {
        id: userId,
        email,
        role,
        login_first_time: false,
        student_id: role === "student" ? temporaryId : null,
        instructor_id: role === "instructor" ? temporaryId : null,
      }

      const { error: profileError } = await supabase.from("profiles").upsert([profilePayload], { onConflict: "id" })
      if (profileError) throw profileError

      if (role === "student") {
        const { error: studentInfoError } = await supabase
          .from("student_info")
          .upsert([{ student_id: temporaryId, full_name: normalizedName }], { onConflict: "student_id" })
        if (studentInfoError) throw studentInfoError
      } else {
        const { error: instructorInfoError } = await supabase
          .from("instructor_info")
          .upsert([{ instructor_id: temporaryId, full_name: normalizedName }], { onConflict: "instructor_id" })
        if (instructorInfoError) throw instructorInfoError
      }

      router.replace(resolveDestination(role, userId, nextUrl))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to finish Google account setup.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <ForceLightMode />
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-900" size={18} />
          <p className="text-sm font-semibold text-slate-700">Loading Google profile setup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      <ForceLightMode />

      <div className="hidden lg:flex lg:w-1/2 bg-[#1E3A8A] relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-600/10 rounded-full -ml-48 -mb-48" />

        <div className="relative z-10 max-w-xl space-y-6">
          <div className="flex items-center gap-5">
            <SkyAssessLogo className="h-28 w-28 lg:h-32 lg:w-32" />
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-blue-100/75">SkyAssess</p>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-red-300">Google Sign-In Setup</p>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl font-black text-white tracking-tight leading-[0.95] lg:text-6xl">
              COMPLETE <br />
              <span className="text-red-500">YOUR</span> PROFILE.
            </h1>
            <p className="text-blue-100/72 text-lg font-medium max-w-lg leading-relaxed">
              Select your role and confirm your name. SkyAssess will assign a temporary ID and prompt you to set your official ID after login.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-slate-50/30">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <Link href="/login" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-blue-900">
              <ArrowLeft size={14} /> Back to Login
            </Link>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Google Account Setup</h2>
            <p className="text-slate-500 text-sm">Choose your role and enter the name that should appear in your training records.</p>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-xs font-semibold text-red-600">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="font-semibold uppercase text-[10px] tracking-widest text-slate-500">Google Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full h-11 px-3 border border-slate-200 bg-slate-100 text-sm rounded-md text-slate-500"
              />
            </div>

            <div className="space-y-3">
              <label className="font-semibold uppercase text-[10px] tracking-widest text-slate-500">Select Role</label>
              <div className="grid grid-cols-2 gap-3">
                {(["student", "instructor"] as const).map((nextRole) => (
                  <button
                    key={nextRole}
                    type="button"
                    onClick={() => setRole(nextRole)}
                    className={`h-12 rounded-md border text-[11px] font-bold uppercase tracking-widest transition-all ${
                      role === nextRole
                        ? "bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-lg shadow-blue-900/20"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {nextRole}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold uppercase text-[10px] tracking-widest text-slate-500">Full Name</label>
              <div className="relative group">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-900 transition-colors" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Juan Dela Cruz"
                  required
                  className="w-full h-11 pl-10 pr-4 border border-slate-200 focus:outline-none focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5 transition-all bg-white text-sm rounded-md"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-12 bg-[#1E3A8A] hover:bg-[#162a63] text-white font-bold uppercase tracking-widest text-xs transition-all rounded-md shadow-xl shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : "Complete Google Login"}
            </button>
          </form>

          <div className="pt-6 border-t border-slate-100 flex justify-center">
            <a href="https://privacy.gov.ph/data-privacy-act/" target="_blank" className="text-[10px] font-bold text-slate-400 hover:text-blue-900 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={12} /> Privacy
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
