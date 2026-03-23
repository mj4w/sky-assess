"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Pilot } from "../app/dashboard/types/pilot"

export function usePilotData() {
  const router = useRouter()
  const params = useParams<{ role?: string; id?: string }>()
  const [pilotData, setPilotData] = useState<Pilot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const debugLog = useCallback((...args: unknown[]) => {
    if (process.env.NODE_ENV === "production") return
    console.log("[usePilotData]", ...args)
  }, [])

  const lookupFullName = useCallback(async (roleRaw: string, instructorId?: string | null, studentId?: string | null) => {
    try {
      const role = (roleRaw || "").toLowerCase()
      const preferredId =
        role === "instructor" ? (instructorId || studentId) : role === "student" ? (studentId || instructorId) : (instructorId || studentId)
      // console.log(roleRaw)
      const rawId = preferredId?.trim()
      // console.log(rawId)
      if (!rawId) {
        debugLog("lookupFullName:missing-id", { roleRaw, instructorId, studentId })
        return null
      }

      const candidates = [...new Set([rawId, rawId.toUpperCase(), rawId.toLowerCase()])]
      // console.log(candidates)
      const tryLookup = async (table: "instructor_info" | "student_info", column: "instructor_id" | "student_id") => {
        const { data, error: infoError } = await supabase
          .from(table)
          .select("full_name")
          .in(column, candidates)
          .limit(1)
        
        if (infoError) {
          debugLog("lookupFullName:error", { table, column, infoError })
          return null
        }
        const fullName = data?.[0]?.full_name
        return typeof fullName === "string" && fullName.trim() ? fullName.trim() : null
      }

      // Prefer matching the declared role, but fall back to the other table if needed.
      if (role === "instructor") {
        const name = await tryLookup("instructor_info", "instructor_id")
        if (name) return name
        return await tryLookup("student_info", "student_id")
      }

      if (role === "student") {
        const name = await tryLookup("student_info", "student_id")
        if (name) return name
        return await tryLookup("instructor_info", "instructor_id")
      }
    } catch {
      return null
    }
  }, [debugLog])

  useEffect(() => {
    const fetchPilot = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push("/login")
          return
        }

        const routeId = params?.id
        const routeRole = params?.role
        const shouldValidateRouteIdentity = Boolean(routeId && routeRole)

        if (shouldValidateRouteIdentity && user.id !== routeId) {
          router.push("/login")
          return
        }

        const profileId = routeId || user.id

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", profileId)
          .single()

        if (profileError) {
          setError("Unexpected system error")
          return
        }

        if (shouldValidateRouteIdentity && data.role !== routeRole) {
          setError("Security Mismatch: Unauthorized Flight Path")
          return
        }

        const full_name = await lookupFullName(data.role, data.instructor_id, data.student_id)
        setPilotData({ ...data, full_name })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        setError("Unexpected system error")
      } finally {
        setLoading(false)
      }
    }

    fetchPilot()
  }, [lookupFullName, params.id, params.role, router])

  return { pilotData, loading, error }
}
