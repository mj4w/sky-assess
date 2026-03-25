"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import ForceLightMode from "@/components/ForceLightMode"
import SkyAssessLogo from "@/components/SkyAssessLogo"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const appUrl = window.location.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const redirectTo = `${appUrl}/reset-password`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setMessage("Password reset link sent. Check your email to continue.")
    setLoading(false)
    console.log("window.location.origin", window.location.origin)
    console.log("redirectTo", redirectTo)

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
              <p className="text-sm font-black uppercase tracking-[0.24em] text-red-300">Password Recovery</p>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl font-black text-white tracking-tight leading-[0.95] lg:text-6xl">
              RESET <br />
              <span className="text-red-500">ACCESS</span> CREDENTIALS.
            </h1>
            <p className="text-blue-100/72 text-lg font-medium max-w-lg leading-relaxed">
              Enter your registered email address and SkyAssess will send a secure password reset link.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-slate-50/30">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <SkyAssessLogo className="h-16 w-16" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">SkyAssess</p>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-900">Password Recovery</p>
            </div>
          </div>

          <div className="space-y-2">
            <Link href="/login" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-blue-900">
              <ArrowLeft size={14} /> Back to Login
            </Link>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Forgot Password</h2>
            <p className="text-slate-500 text-sm">Use your registered email to receive a reset link.</p>
          </div>

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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="font-semibold uppercase text-[10px] tracking-widest text-slate-500">Registered Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-900 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@example.com"
                  required
                  className="w-full h-11 pl-10 pr-4 border border-slate-200 focus:outline-none focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5 transition-all bg-white text-sm rounded-md"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#1E3A8A] hover:bg-[#162a63] text-white font-bold uppercase tracking-widest text-xs transition-all rounded-md shadow-xl shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : "Send Reset Link"}
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
