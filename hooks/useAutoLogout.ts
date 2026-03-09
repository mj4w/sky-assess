"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export function useAutoLogout(timeoutMinutes = 15) {
  const router = useRouter()

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut()
      router.push("/login?expired=true")
    }

    let timeout: NodeJS.Timeout
    const resetTimer = () => {
      clearTimeout(timeout)
      timeout = setTimeout(logout, timeoutMinutes * 60 * 1000)
    }

    window.addEventListener("mousemove", resetTimer)
    window.addEventListener("keydown", resetTimer)
    resetTimer()

    return () => {
      clearTimeout(timeout)
      window.removeEventListener("mousemove", resetTimer)
      window.removeEventListener("keydown", resetTimer)
    }
  }, [router, timeoutMinutes])
}