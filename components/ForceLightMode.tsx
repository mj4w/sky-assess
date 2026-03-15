"use client"

import { useEffect } from "react"

export default function ForceLightMode() {
  useEffect(() => {
    const root = document.documentElement
    const previousTheme = window.localStorage.getItem("skyassess-theme")

    root.classList.remove("dark")

    return () => {
      const nextTheme = window.localStorage.getItem("skyassess-theme") || previousTheme
      root.classList.toggle("dark", nextTheme === "dark")
    }
  }, [])

  return null
}
