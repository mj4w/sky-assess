"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import ForceLightMode from "@/components/ForceLightMode"
import SkyAssessLogo from "@/components/SkyAssessLogo"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const initRecovery = async () => {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
      const params = new URLSearchParams(hash)
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")
      const type = params.get("type")

      if (type === "recovery" && accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError) {
          if (mounted) setError(sessionError.message)
        } else if (mounted) {
          setReady(true)
        }
        return
      }

      const { data } = await supabase.auth.getSession()
      if (mounted) {
        if (data.session) setReady(true)
        else setError("Password reset link is invalid or expired. Request a new one.")
      }
    }

    initRecovery()
    return () => {
      mounted = false
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setMessage("Password updated successfully. Redirecting to login...")
    setLoading(false)
    setTimeout(() => {
      router.push("/login")
    }, 1200)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-6 py-10">
      <ForceLightMode />

      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-4">
          <SkyAssessLogo className="h-16 w-16" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">SkyAssess</p>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reset Password</h1>
          </div>
        </div>

        <Link href="/login" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-blue-900">
          <ArrowLeft size={14} /> Back to Login
        </Link>

        {error ? (
          <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-xs font-semibold text-red-600">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-xs font-semibold text-green-700 flex items-center gap-2">
            <CheckCircle2 size={14} />
            {message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold uppercase text-[10px] tracking-widest text-slate-500">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!ready || loading}
                required
                className="w-full h-11 pl-3 pr-10 border border-slate-200 focus:outline-none focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5 transition-all bg-white text-sm rounded-md disabled:bg-slate-100"
              />
              <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-3 text-slate-400 hover:text-blue-900">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold uppercase text-[10px] tracking-widest text-slate-500">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={!ready || loading}
              required
              className="w-full h-11 px-3 border border-slate-200 focus:outline-none focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5 transition-all bg-white text-sm rounded-md disabled:bg-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={!ready || loading}
            className="w-full h-12 bg-[#1E3A8A] hover:bg-[#162a63] text-white font-bold uppercase tracking-widest text-xs transition-all rounded-md shadow-xl shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  )
}
