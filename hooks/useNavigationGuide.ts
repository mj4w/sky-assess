"use client"

import { RefObject, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

export interface NavigationGuideStep {
  key: string
  title: string
  description: string
  ref: RefObject<HTMLElement | null>
}

interface UseNavigationGuideArgs {
  enabled: boolean
  userId?: string
  pageKey: string
  steps: NavigationGuideStep[]
}

export function useNavigationGuide({ enabled, userId, pageKey, steps }: UseNavigationGuideArgs) {
  const [showGuide, setShowGuide] = useState(false)
  const [guideCompleted, setGuideCompleted] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [activeRect, setActiveRect] = useState<DOMRect | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const activeStep = steps[stepIndex]

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        id: index,
        left: `${5 + index * 4.5}%`,
        delay: `${(index % 6) * 0.08}s`,
        duration: `${2.1 + (index % 5) * 0.18}s`,
        color: ["#1d4ed8", "#ef4444", "#38bdf8", "#f59e0b"][index % 4],
      })),
    []
  )

  useEffect(() => {
    if (!enabled || !userId) return

    const loadGuideState = async () => {
      const { data, error } = await supabase
        .from("user_navigation_guides")
        .select("completed, status")
        .eq("user_id", userId)
        .eq("page_key", pageKey)
        .maybeSingle()

      if (error && error.code !== "PGRST116" && error.code !== "42P01") {
        return
      }

      const completed = Boolean(data?.completed)
      const skipped = String(data?.status || "").toLowerCase() === "skipped"
      setGuideCompleted(completed)

      if (!data || (!completed && !skipped)) {
        setShowGuide(true)
        setStepIndex(0)
      }
    }

    void loadGuideState()
  }, [enabled, pageKey, userId])

  useEffect(() => {
    if (!showGuide || !activeStep) return

    const activeElement = activeStep.ref.current
    activeElement?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" })

    const updateRect = () => {
      setActiveRect(activeElement?.getBoundingClientRect() || null)
    }

    updateRect()
    window.addEventListener("resize", updateRect)
    window.addEventListener("scroll", updateRect, true)
    return () => {
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect, true)
    }
  }, [activeStep, showGuide])

  const persistGuideState = async (status: "completed" | "skipped") => {
    if (!userId) return

    await supabase.from("user_navigation_guides").upsert(
      [
        {
          user_id: userId,
          page_key: pageKey,
          completed: status === "completed",
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null,
        },
      ],
      { onConflict: "user_id,page_key" }
    )
  }

  const openGuide = () => {
    setStepIndex(0)
    setShowGuide(true)
  }

  const closeGuide = () => {
    setShowGuide(false)
    setActiveRect(null)
  }

  const skipGuide = async () => {
    await persistGuideState("skipped")
    setGuideCompleted(false)
    closeGuide()
  }

  const finishGuide = async () => {
    await persistGuideState("completed")
    setGuideCompleted(true)
    closeGuide()
    setShowConfetti(true)
    window.setTimeout(() => setShowConfetti(false), 2600)
  }

  const nextStep = async () => {
    if (stepIndex >= steps.length - 1) {
      await finishGuide()
      return
    }
    setStepIndex((previous) => previous + 1)
  }

  const previousStep = () => {
    setStepIndex((previous) => Math.max(previous - 1, 0))
  }

  return {
    showGuide,
    guideCompleted,
    activeRect,
    activeStep,
    stepIndex,
    totalSteps: steps.length,
    showConfetti,
    confettiPieces,
    openGuide,
    skipGuide,
    nextStep,
    previousStep,
  }
}
