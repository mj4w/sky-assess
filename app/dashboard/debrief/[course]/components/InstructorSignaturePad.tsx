"use client"

import React, { useEffect, useRef, useState } from "react"

export default function InstructorSignaturePad({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isDrawingRef = useRef(false)
  const [hasDrawn, setHasDrawn] = useState(Boolean(value))

  const resizeCanvas = () => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const rect = container.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.max(Math.floor(rect.width * ratio), 1)
    canvas.height = Math.max(Math.floor(180 * ratio), 1)
    canvas.style.width = `${Math.floor(rect.width)}px`
    canvas.style.height = "180px"
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#0f172a"
    ctx.lineWidth = 2.2
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, Math.floor(rect.width), 180)
  }

  useEffect(() => {
    resizeCanvas()
    const onResize = () => resizeCanvas()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const getPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const point = getPosition(event)
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    isDrawingRef.current = true
    setHasDrawn(true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const point = getPosition(event)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL("image/png"))
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, rect.width, rect.height)
    setHasDrawn(false)
    onChange("")
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${disabled ? "opacity-55" : ""}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Instructor Signature</p>
        <button
          type="button"
          onClick={clearSignature}
          disabled={disabled || !hasDrawn}
          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>
      </div>
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          className={`w-full h-[180px] rounded-xl border border-dashed border-slate-300 bg-white touch-none ${disabled ? "cursor-not-allowed" : "cursor-crosshair"}`}
        />
      </div>
      <p className="mt-2 text-[11px] font-medium text-slate-400">
        {disabled ? "Visible only. Instructor signs this section before submission." : "Sign above before submitting the debriefing."}
      </p>
    </div>
  )
}
