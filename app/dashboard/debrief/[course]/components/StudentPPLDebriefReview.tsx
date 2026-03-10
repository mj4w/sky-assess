"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { X, Download, Loader2, CheckCircle2 } from "lucide-react"
import { jsPDF } from "jspdf"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

interface DebriefItem {
  section_title: string
  item_name: string
  grade: string | null
  remark: string | null
}

interface DebriefRecord {
  id: string
  lesson_no: string
  op_date: string
  rpc: string
  duration: string
  time_label: string | null
  flight_type: string | null
  student_name_snapshot: string | null
  instructor_name_snapshot: string | null
  instructor_signature_path: string
  student_signature_path: string | null
  student_signed_at: string | null
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export default function StudentPPLDebriefReview({
  open,
  onClose,
  record,
  onSigned,
}: {
  open: boolean
  onClose: () => void
  record: DebriefRecord | null
  onSigned?: (payload: { id: string; studentSignaturePath: string; studentSignedAt: string }) => void
}) {
  const [items, setItems] = useState<DebriefItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<string>("")
  const [instructorSignatureUrl, setInstructorSignatureUrl] = useState("")
  const [studentSignatureUrl, setStudentSignatureUrl] = useState("")
  const signCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const signContainerRef = useRef<HTMLDivElement | null>(null)
  const isDrawingRef = useRef(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  const groupedItems = useMemo(() => {
    const grouped: Record<string, DebriefItem[]> = {}
    items.forEach((item) => {
      if (!grouped[item.section_title]) grouped[item.section_title] = []
      grouped[item.section_title].push(item)
    })
    return grouped
  }, [items])

  useEffect(() => {
    if (!open || !record) return
    const load = async () => {
      setLoading(true)
      setNotice("")
      const [{ data: itemRows }, instructorUrlResponse, studentUrlResponse] = await Promise.all([
        supabase
          .from("ppl_debrief_items")
          .select("section_title, item_name, grade, remark")
          .eq("debrief_id", record.id),
        supabase.storage.from("debrief-signatures").createSignedUrl(record.instructor_signature_path, 60 * 60),
        record.student_signature_path
          ? supabase.storage.from("debrief-signatures").createSignedUrl(record.student_signature_path, 60 * 60)
          : Promise.resolve({ data: null, error: null }),
      ])

      setItems((itemRows || []) as DebriefItem[])
      setInstructorSignatureUrl(instructorUrlResponse.data?.signedUrl || "")
      setStudentSignatureUrl(studentUrlResponse.data?.signedUrl || "")
      setHasDrawn(Boolean(record.student_signature_path))
      setLoading(false)
    }

    load()
  }, [open, record])

  useEffect(() => {
    if (!open || !record || record.student_signature_path) return
    const resizeCanvas = () => {
      const canvas = signCanvasRef.current
      const container = signContainerRef.current
      if (!canvas || !container) return
      const rect = container.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.max(Math.floor(rect.width * ratio), 1)
      canvas.height = Math.max(Math.floor(120 * ratio), 1)
      canvas.style.width = `${Math.floor(rect.width)}px`
      canvas.style.height = "120px"
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.strokeStyle = "#0f172a"
      ctx.lineWidth = 2.2 * ratio
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [open, record])

  const getSignPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY }
  }

  const startDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!record || Boolean(record.student_signature_path)) return
    const ctx = signCanvasRef.current?.getContext("2d")
    if (!ctx) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = getSignPoint(event)
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    isDrawingRef.current = true
    setHasDrawn(true)
  }

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !record || Boolean(record.student_signature_path)) return
    const ctx = signCanvasRef.current?.getContext("2d")
    if (!ctx) return
    const point = getSignPoint(event)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }

  const stopDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId)
    isDrawingRef.current = false
  }

  const clearDraw = () => {
    const canvas = signCanvasRef.current
    if (!canvas || !record || Boolean(record.student_signature_path)) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.beginPath()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    setStudentSignatureUrl("")
  }

  const downloadPdf = async (studentSignatureUrlOverride?: string) => {
    if (!record) return
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 36
    let y = margin

    const ensureSpace = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        pdf.addPage()
        y = margin
      }
    }

    const urlToDataUrl = async (url: string) => {
      const response = await fetch(url)
      const blob = await response.blob()
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result || ""))
        reader.onerror = () => reject(new Error("Unable to read signature image."))
        reader.readAsDataURL(blob)
      })
    }

    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(20)
    pdf.text("Private Pilot License Course", margin, y)
    y += 24
    pdf.setFontSize(12)
    pdf.text("PPL Grading Sheet", margin, y)
    y += 22

    pdf.setDrawColor(180)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 18

    const contentWidth = pageWidth - margin * 2
    const fieldGap = 20
    const fieldWidth = (contentWidth - fieldGap) / 2
    const fieldValueOffset = 74
    const drawFieldPair = (left: [string, string], right: [string, string]) => {
      ensureSpace(18)
      pdf.setFontSize(10)
      pdf.setFont("helvetica", "bold")
      pdf.text(`${left[0]}:`, margin, y)
      pdf.text(`${right[0]}:`, margin + fieldWidth + fieldGap, y)
      pdf.setFont("helvetica", "normal")
      pdf.text(String(left[1] || "N/A"), margin + fieldValueOffset, y, { maxWidth: fieldWidth - fieldValueOffset })
      pdf.text(String(right[1] || "N/A"), margin + fieldWidth + fieldGap + fieldValueOffset, y, { maxWidth: fieldWidth - fieldValueOffset })
      y += 15
    }

    drawFieldPair(["Student Pilot", record.student_name_snapshot || "N/A"], ["Date", formatDateLabel(record.op_date)])
    drawFieldPair(["Flight Instructor", record.instructor_name_snapshot || "N/A"], ["RPC", record.rpc || "N/A"])
    drawFieldPair(["Lesson No.", record.lesson_no || "N/A"], ["Duration", record.duration || "N/A"])
    y += 8

    Object.entries(groupedItems).forEach(([sectionTitle, sectionItems]) => {
      ensureSpace(36)
      pdf.setFillColor(241, 245, 249)
      pdf.rect(margin, y, pageWidth - margin * 2, 18, "F")
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(10)
      pdf.text(sectionTitle.toUpperCase(), margin + 6, y + 12)
      y += 20

      const itemX = margin + 6
      const gradeX = margin + contentWidth * 0.60
      const remarkX = margin + contentWidth * 0.70
      const itemWidth = gradeX - itemX - 8
      const remarkWidth = pageWidth - margin - remarkX - 4

      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(9)
      pdf.text("ITEM", itemX, y + 10)
      pdf.text("GRADE", gradeX, y + 10)
      pdf.text("REMARK", remarkX, y + 10)
      pdf.setDrawColor(220)
      pdf.line(margin, y + 13, pageWidth - margin, y + 13)
      y += 16

      sectionItems.forEach((item) => {
        const itemLines = pdf.splitTextToSize(item.item_name || "-", itemWidth)
        const remarkLines = pdf.splitTextToSize(item.remark || "-", remarkWidth)
        const lineCount = Math.max(itemLines.length, remarkLines.length, 1)
        const rowHeight = Math.max(16, lineCount * 10 + 4)
        ensureSpace(rowHeight + 2)
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9.5)
        pdf.text(itemLines, itemX, y + 10)
        pdf.setFont("helvetica", "bold")
        pdf.text(item.grade || "-", gradeX, y + 10)
        pdf.setFont("helvetica", "normal")
        pdf.text(remarkLines, remarkX, y + 10)
        pdf.setDrawColor(235)
        pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight)
        y += rowHeight + 2
      })
      y += 8
    })

    ensureSpace(120)
    const signatureTop = y + 8
    const signatureWidth = (pageWidth - margin * 2 - 20) / 2
    const signatureHeight = 70

    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(10)
    pdf.text("Student Pilot Signature", margin, signatureTop - 6)
    pdf.text("Flight Instructor Signature", margin + signatureWidth + 20, signatureTop - 6)
    pdf.setDrawColor(203, 213, 225)
    pdf.rect(margin, signatureTop, signatureWidth, signatureHeight)
    pdf.rect(margin + signatureWidth + 20, signatureTop, signatureWidth, signatureHeight)

    const effectiveStudentSignatureUrl = studentSignatureUrlOverride || studentSignatureUrl
    if (effectiveStudentSignatureUrl) {
      const studentDataUrl = await urlToDataUrl(effectiveStudentSignatureUrl)
      pdf.addImage(studentDataUrl, "PNG", margin + 4, signatureTop + 4, signatureWidth - 8, signatureHeight - 8)
    }
    if (instructorSignatureUrl) {
      const instructorDataUrl = await urlToDataUrl(instructorSignatureUrl)
      pdf.addImage(instructorDataUrl, "PNG", margin + signatureWidth + 24, signatureTop + 4, signatureWidth - 8, signatureHeight - 8)
    }

    pdf.save(`PPL-Debrief-${record.lesson_no || record.id}.pdf`)
  }

  const handleSubmit = async () => {
    if (!record || record.student_signature_path) return
    if (!hasDrawn || !signCanvasRef.current) {
      setNotice("Student signature is required.")
      return
    }
    setSubmitting(true)
    setNotice("")
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) throw new Error("You must be logged in.")
      const dataUrl = signCanvasRef.current.toDataURL("image/png")
      const blob = await (await fetch(dataUrl)).blob()
      const filePath = `${authData.user.id}/${Date.now()}-${crypto.randomUUID()}.png`
      const { error: uploadError } = await supabase.storage
        .from("debrief-signatures")
        .upload(filePath, blob, { contentType: "image/png", upsert: false })
      if (uploadError) throw uploadError

      const signedAt = new Date().toISOString()
      const { error: updateError } = await supabase
        .from("ppl_debriefs")
        .update({
          student_signature_path: filePath,
          student_signed_at: signedAt,
        })
        .eq("id", record.id)
      if (updateError) throw updateError

      const { data: signedUrlResult } = await supabase.storage.from("debrief-signatures").createSignedUrl(filePath, 60 * 60)
      const latestSignedUrl = signedUrlResult?.signedUrl || ""
      setStudentSignatureUrl(latestSignedUrl)
      onSigned?.({
        id: record.id,
        studentSignaturePath: filePath,
        studentSignedAt: signedAt,
      })
      setNotice("Debrief acknowledged. PDF is ready for download.")
      await downloadPdf(latestSignedUrl)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to complete student acknowledgment.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open || !record) return null

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-5xl max-h-[95vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Student Debrief Review</p>
            <h2 className="text-lg font-black text-slate-900">PPL Grading Sheet</h2>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg border border-slate-300 hover:bg-slate-50">
            <X size={14} className="mx-auto" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-sm font-semibold text-slate-500">Loading debrief details...</div>
          ) : (
            <div id="student-ppl-debrief-pdf" className="mx-auto max-w-4xl bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="text-center border-b border-slate-200 pb-4">
                <h3 className="text-2xl font-black text-slate-900">Private Pilot License Course</h3>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">PPL Grading Sheet</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <p><span className="font-black text-slate-700">Student Pilot:</span> {record.student_name_snapshot || "N/A"}</p>
                <p><span className="font-black text-slate-700">Date:</span> {formatDateLabel(record.op_date)}</p>
                <p><span className="font-black text-slate-700">Flight Instructor:</span> {record.instructor_name_snapshot || "N/A"}</p>
                <p><span className="font-black text-slate-700">RPC:</span> {record.rpc}</p>
                <p><span className="font-black text-slate-700">Lesson No.:</span> {record.lesson_no}</p>
                <p><span className="font-black text-slate-700">Duration:</span> {record.duration}</p>
              </div>

              <div className="space-y-4">
                {Object.entries(groupedItems).map(([sectionTitle, sectionItems]) => (
                  <div key={sectionTitle} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700">{sectionTitle}</div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left px-3 py-2 font-black text-slate-600">Item</th>
                          <th className="text-left px-3 py-2 font-black text-slate-600 w-20">Grade</th>
                          <th className="text-left px-3 py-2 font-black text-slate-600">Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionItems.map((item) => (
                          <tr key={item.item_name} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-800">{item.item_name}</td>
                            <td className="px-3 py-2 font-black text-slate-900">{item.grade || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">{item.remark || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Student Pilot Signature</p>
                  {studentSignatureUrl ? (
                    <Image src={studentSignatureUrl} alt="Student signature" width={720} height={220} unoptimized className="h-28 w-full object-contain border border-slate-300 rounded-lg bg-white" />
                  ) : (
                    <div ref={signContainerRef} className="w-full">
                      <canvas
                        ref={signCanvasRef}
                        onPointerDown={startDraw}
                        onPointerMove={draw}
                        onPointerUp={stopDraw}
                        onPointerLeave={stopDraw}
                        className="w-full h-[120px] rounded-lg border border-dashed border-slate-300 bg-white touch-none cursor-crosshair"
                      />
                    </div>
                  )}
                  {!studentSignatureUrl ? (
                    <button type="button" onClick={clearDraw} className="mt-2 h-8 px-3 rounded-lg border border-slate-300 text-xs font-bold text-slate-600">
                      Clear Signature
                    </button>
                  ) : null}
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Flight Instructor Signature</p>
                  {instructorSignatureUrl ? (
                    <Image src={instructorSignatureUrl} alt="Instructor signature" width={720} height={220} unoptimized className="h-28 w-full object-contain border border-slate-300 rounded-lg bg-white" />
                  ) : (
                    <div className="h-28 rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-500">
                      Signature unavailable
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <p className={`text-xs font-semibold ${notice.includes("Unable") || notice.includes("required") ? "text-red-700" : "text-blue-700"}`}>
            {notice}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={downloadPdf} className="h-10 px-4 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 inline-flex items-center gap-2">
              <Download size={14} />
              Download PDF
            </button>
            {!record.student_signature_path ? (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="h-10 px-4 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm font-black inline-flex items-center gap-2 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {submitting ? "Submitting..." : "Submit & Generate PDF"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
