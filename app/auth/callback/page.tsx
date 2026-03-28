"use client"

import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import ForceLightMode from "@/components/ForceLightMode"

function resolveDestination(role: string | null | undefined, userId: string, nextUrl: string | null) {
  if (nextUrl && nextUrl.startsWith("/")) return nextUrl
  const normalizedRole = String(role || "").toLowerCase()
  if (normalizedRole === "admin") return "/dashboard/admin"
  if (normalizedRole === "flightops") return "/flight-ops"
  return `/dashboard/${normalizedRole || "student"}/${userId}`
}

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const completeGoogleLogin = async () => {
      const search = new URLSearchParams(window.location.search)
      const code = search.get("code")
      const nextUrl = search.get("next")

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          router.replace(`/login?oauth_error=${encodeURIComponent(error.message)}`)
          return
        }
      }

      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) {
        router.replace("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, student_id, instructor_id")
        .eq("id", user.id)
        .maybeSingle()

      const role = String(profile?.role || "").toLowerCase()
      const hasStructuredProfile =
        (role === "student" && Boolean(String(profile?.student_id || "").trim())) ||
        (role === "instructor" && Boolean(String(profile?.instructor_id || "").trim())) ||
        role === "admin" ||
        role === "flightops"

      if (!profile || !hasStructuredProfile) {
        const onboardingUrl = nextUrl
          ? `/auth/google-onboarding?next=${encodeURIComponent(nextUrl)}`
          : "/auth/google-onboarding"
        router.replace(onboardingUrl)
        return
      }

      if (mounted) {
        router.replace(resolveDestination(role, user.id, nextUrl))
      }
    }

    void completeGoogleLogin()
    return () => {
      mounted = false
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <ForceLightMode />
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm flex items-center gap-3">
        <Loader2 className="animate-spin text-blue-900" size={18} />
        <p className="text-sm font-semibold text-slate-700">Completing Google sign-in...</p>
      </div>
    </div>
  )
}
