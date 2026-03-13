"use client"

import { Suspense, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

function DebriefAccessPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debriefId = String(searchParams.get("debrief_id") || "").trim()
  const target = `/dashboard/debrief/ppl${debriefId ? `?debrief_id=${encodeURIComponent(debriefId)}` : ""}`

  useEffect(() => {
    const routeUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        router.replace(target)
        return
      }
      router.replace(`/login?next=${encodeURIComponent(target)}`)
    }
    routeUser()
  }, [router, target])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-3">
        <h1 className="text-lg font-black text-slate-900">Accessing Debrief Record</h1>
        <p className="text-sm text-slate-600">If you are not logged in, continue to login or register.</p>
        <div className="flex items-center justify-center gap-2">
          <Link href={`/login?next=${encodeURIComponent(target)}`} className="h-10 px-4 rounded-lg bg-blue-900 text-white text-sm font-bold inline-flex items-center">
            Login
          </Link>
          <Link href={`/register?next=${encodeURIComponent(target)}`} className="h-10 px-4 rounded-lg border border-slate-300 text-sm font-bold inline-flex items-center">
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function DebriefAccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <DebriefAccessPageContent />
    </Suspense>
  )
}
