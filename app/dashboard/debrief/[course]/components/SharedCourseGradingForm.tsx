"use client"

import React, { useEffect, useState } from "react"
import {
  Plane,
  X,
  User,
  Calendar,
  Clock,
  Hash,
  PenTool,
  ClipboardCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import InstructorSignaturePad from "./InstructorSignaturePad"

const GRADES = ["S+", "S", "S-", "NP"]

interface InitialSession {
  assignmentId?: string
  lessonNo?: string
  date: string
  rpc: string
  duration: string
  flightType: string
  timeLabel: string
  studentId?: string
  instructorId?: string
}

interface CourseSection {
  title: string
  items: string[]
}

interface SharedCourseGradingFormProps {
  onClose: () => void
  onSubmitted?: () => void
  instructorName: string
  role: string
  initialSession?: InitialSession
  courseCode: string
  courseTitle: string
  courseSubtitle: string
  accent: {
    iconBg: string
    headingText: string
    headingBorder: string
    buttonBg: string
    buttonHover: string
    focusRing: string
    gradeActive: string
    gradeHover: string
  }
  sections: CourseSection[]
  studentLabel?: string
  lessonPlaceholder?: string
  submitHandler?: (payload: {
    authUserId: string
    signaturePath: string
    lessonNo: string
    date: string
    rpc: string
    duration: string
    assignmentId?: string
    flightType: string
    timeLabel: string
    studentId: string
    studentName: string
    instructorId: string
    instructorName: string
    sections: CourseSection[]
    formData: Record<string, { grade: string; remark: string }>
    courseCode: string
  }) => Promise<{ type: "success" | "warning" | "error"; message: string }>
}

export default function SharedCourseGradingForm({
  onClose,
  onSubmitted,
  instructorName,
  role,
  initialSession,
  courseCode,
  courseTitle,
  courseSubtitle,
  accent,
  sections,
  studentLabel = "Student Pilot",
  lessonPlaceholder = "e.g. 01",
  submitHandler,
}: SharedCourseGradingFormProps) {
  const [studentPilotLabel, setStudentPilotLabel] = useState(initialSession?.studentId || "N/A")
  const [resolvedInstructorName, setResolvedInstructorName] = useState(instructorName)
  const [lessonNo, setLessonNo] = useState(initialSession?.lessonNo || "")
  const [rpc] = useState(initialSession?.rpc || "")
  const [duration] = useState(initialSession?.duration || "")
  const [date] = useState(initialSession?.date || new Date().toISOString().split("T")[0])
  const [formData, setFormData] = useState<Record<string, { grade: string; remark: string }>>({})
  const [signatureDataUrl, setSignatureDataUrl] = useState("")
  const [resolvedStudentId, setResolvedStudentId] = useState(String(initialSession?.studentId || "").trim())
  const [resolvedInstructorId, setResolvedInstructorId] = useState(String(initialSession?.instructorId || "").trim())
  const [submitNotice, setSubmitNotice] = useState<{ type: "success" | "warning" | "error"; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState("")

  const isInstructor = role?.toLowerCase() === "instructor"
  const canEditLessonNo = !isInstructor
  const canEditInstructorSection = isInstructor

  useEffect(() => {
    const resolveActors = async () => {
      let resolvedStudentId = String(initialSession?.studentId || "").trim()
      let resolvedStudentLabel = resolvedStudentId

      if (!isInstructor) {
        const { data: authData } = await supabase.auth.getUser()
        if (!authData.user) return

        const { data } = await supabase
          .from("profiles")
          .select("student_id, email")
          .eq("id", authData.user.id)
          .single()

        if (data) {
          resolvedStudentId = String(data.student_id || "").trim()
          resolvedStudentLabel = resolvedStudentId || String(data.email || "").trim()
        }
      }

      if (resolvedStudentId) {
        const studentCandidates = [...new Set([resolvedStudentId, resolvedStudentId.toUpperCase(), resolvedStudentId.toLowerCase()])]
        const { data: studentRows } = await supabase
          .from("student_info")
          .select("student_id, full_name")
          .in("student_id", studentCandidates)
          .limit(1)

        const fullName = String(studentRows?.[0]?.full_name || "").trim()
      if (fullName) resolvedStudentLabel = fullName
      }
      setStudentPilotLabel(resolvedStudentLabel || resolvedStudentId || "N/A")
      setResolvedStudentId(resolvedStudentId)

      const rawInstructorId = String(initialSession?.instructorId || "").trim()
      if (!rawInstructorId) {
        setResolvedInstructorName(instructorName)
        return
      }

      const instructorCandidates = [...new Set([rawInstructorId, rawInstructorId.toUpperCase(), rawInstructorId.toLowerCase()])]
      const { data } = await supabase
        .from("instructor_info")
        .select("full_name, instructor_id")
        .in("instructor_id", instructorCandidates)
        .limit(1)

      if (data?.[0]?.full_name) setResolvedInstructorName(data[0].full_name)
      else setResolvedInstructorName(rawInstructorId || instructorName)
      setResolvedInstructorId(rawInstructorId)
    }

    resolveActors()
  }, [initialSession, instructorName, isInstructor])

  const handleUpdate = (item: string, field: "grade" | "remark", value: string) => {
    if (!canEditInstructorSection) return
    setFormData((prev) => ({
      ...prev,
      [item]: { ...prev[item], [field]: value },
    }))
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitNotice(null)
    if (!signatureDataUrl) {
      setSubmitNotice({ type: "error", message: "Instructor signature is required before submitting." })
      return
    }
    if (!lessonNo.trim()) {
      setSubmitNotice({ type: "error", message: "Lesson number is required before submitting." })
      return
    }
    if (!resolvedStudentId.trim() || !resolvedInstructorId.trim()) {
      setSubmitNotice({ type: "error", message: "Student ID or instructor ID is missing for this session." })
      return
    }

    setSubmitting(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData.user) throw new Error("You must be logged in to submit this debriefing.")

      setSubmitProgress("Uploading instructor signature...")
      const signatureBlob = await (await fetch(signatureDataUrl)).blob()
      const filePath = `${authData.user.id}/${Date.now()}-${crypto.randomUUID()}.png`
      const uploadResult = await supabase.storage
        .from("debrief-signatures")
        .upload(filePath, signatureBlob, { contentType: "image/png", upsert: false })

      if (uploadResult.error) throw uploadResult.error

      if (submitHandler) {
        setSubmitProgress("Saving debrief record...")
        const result = await submitHandler({
          authUserId: authData.user.id,
          signaturePath: filePath,
          lessonNo: lessonNo.trim(),
          date,
          rpc,
          duration,
          assignmentId: initialSession?.assignmentId,
          flightType: initialSession?.flightType || null || "",
          timeLabel: initialSession?.timeLabel || null || "",
          studentId: resolvedStudentId.trim().toLowerCase(),
          studentName: studentPilotLabel,
          instructorId: resolvedInstructorId.trim().toLowerCase(),
          instructorName: resolvedInstructorName,
          sections,
          formData,
          courseCode,
        })
        setSubmitNotice(result)
      } else {
        setSubmitProgress("Saving debrief record...")
        const { data: debriefRow, error: debriefError } = await supabase
          .from("course_debriefs")
          .insert([
            {
              course_code: courseCode,
              assignment_id: initialSession?.assignmentId || null,
              student_id: resolvedStudentId.trim().toLowerCase(),
              student_name_snapshot: studentPilotLabel,
              instructor_id: resolvedInstructorId.trim().toLowerCase(),
              instructor_name_snapshot: resolvedInstructorName,
              lesson_no: lessonNo.trim(),
              op_date: date,
              rpc,
              duration,
              flight_type: initialSession?.flightType || null,
              time_label: initialSession?.timeLabel || null,
              instructor_signature_path: filePath,
              notify: false,
              created_by: authData.user.id,
            },
          ])
          .select("id")
          .single()

        if (debriefError) throw debriefError

        const itemRows = sections.flatMap((section) =>
          section.items.map((item) => ({
            debrief_id: debriefRow.id,
            section_title: section.title,
            item_name: item,
            grade: formData[item]?.grade || null,
            remark: (formData[item]?.remark || "").trim() || null,
          }))
        )

        const { error: itemError } = await supabase.from("course_debrief_items").insert(itemRows)
        if (itemError) throw itemError

        if (initialSession?.assignmentId) {
          const { error: assignmentUpdateError } = await supabase
            .from("flight_ops_assignments")
            .update({ notification_read_instructor: true })
            .eq("id", initialSession.assignmentId)

          if (assignmentUpdateError) throw assignmentUpdateError
        }

        setSubmitNotice({ type: "success", message: `${courseCode} debrief submitted successfully.` })
      }

      setSubmitProgress("Submission completed.")
      setTimeout(() => {
        onSubmitted?.()
        onClose()
      }, 900)
    } catch (error) {
      setSubmitNotice({
        type: "error",
        message: error instanceof Error ? error.message : `Failed to submit ${courseCode} debriefing.`,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} className="relative w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className={`${accent.iconBg} p-2 rounded-lg text-white`}><Plane className="size-5 -rotate-45" /></div>
            <div>
              <h2 className="text-xl font-black italic uppercase text-slate-900">{courseTitle}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{courseSubtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#FDFDFD]">
          <div className="space-y-8">
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-opacity ${canEditLessonNo ? "opacity-100" : "opacity-55"}`}>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><User size={12} /> {studentLabel}</label>
                <input disabled value={studentPilotLabel} className="w-full p-2 rounded-lg text-sm font-bold text-slate-500 cursor-not-allowed bg-slate-100" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><PenTool size={12} /> Flight Instructor</label>
                <input disabled value={resolvedInstructorName} className="w-full p-2 rounded-lg text-sm font-bold text-slate-500 cursor-not-allowed bg-slate-100" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Hash size={12} /> Lesson No.</label>
                <input
                  disabled={!canEditLessonNo}
                  type="text"
                  value={lessonNo}
                  onChange={(e) => setLessonNo(e.target.value)}
                  placeholder={lessonPlaceholder}
                  className={`w-full p-2 rounded-lg border-none text-sm font-bold ${!canEditLessonNo ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-slate-50"}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Calendar size={12} /> Date</label>
                <input disabled type="date" value={date} className="w-full p-2 rounded-lg border-none text-sm font-bold bg-slate-100 cursor-not-allowed text-slate-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Plane size={12} /> RP-C</label>
                <input disabled type="text" value={rpc} className="w-full p-2 rounded-lg border-none text-sm font-bold bg-slate-100 cursor-not-allowed text-slate-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Clock size={12} /> Duration</label>
                <input disabled type="text" value={duration} className="w-full p-2 rounded-lg border-none text-sm font-bold bg-slate-100 cursor-not-allowed text-slate-500" />
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-100 p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Grading Legend: S+ (Very Satisfactory), S (Satisfactory), S- (Below Satisfactory), NP (Not Performed)
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {courseCode} uses the same grading instruction and remark flow as the other debriefing courses.
              </p>
            </div>

            {sections.map((section) => (
              <section key={section.title} className="space-y-4">
                <h3 className={`text-xs font-black uppercase tracking-[0.2em] border-l-4 pl-3 ${accent.headingText} ${accent.headingBorder}`}>{section.title}</h3>
                <div className={`space-y-3 transition-opacity ${canEditInstructorSection ? "opacity-100" : "opacity-55"}`}>
                  {section.items.map((item) => (
                    <div key={item} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between p-4 gap-4">
                        <span className="text-sm font-bold text-slate-700 w-full xl:w-[34%]">{item}</span>
                        <div className="flex gap-1 shrink-0 flex-wrap">
                          {GRADES.map((grade) => (
                            <button
                              key={grade}
                              type="button"
                              onClick={() => handleUpdate(item, "grade", grade)}
                              disabled={!canEditInstructorSection}
                              className={`min-w-10 h-9 px-2 rounded-lg text-[10px] font-black border-2 transition-all ${
                                formData[item]?.grade === grade
                                  ? `${accent.gradeActive} text-white`
                                  : `bg-white border-slate-100 text-slate-400 ${accent.gradeHover}`
                              } ${!canEditInstructorSection ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              {grade}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Remarks..."
                          disabled={!canEditInstructorSection}
                          value={formData[item]?.remark || ""}
                          className={`flex-1 rounded-lg border-none text-[11px] p-2 ${accent.focusRing} ${
                            !canEditInstructorSection ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-slate-50"
                          }`}
                          onChange={(e) => handleUpdate(item, "remark", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <div className={`transition-opacity ${canEditInstructorSection ? "opacity-100" : "opacity-55"}`}>
              <InstructorSignaturePad
                value={signatureDataUrl}
                onChange={setSignatureDataUrl}
                disabled={!canEditInstructorSection}
              />
            </div>

            {submitNotice ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                  submitNotice.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : submitNotice.type === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  {submitNotice.type === "success" ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertTriangle size={16} className="mt-0.5" />}
                  <span>{submitNotice.message}</span>
                </div>
              </div>
            ) : null}

            <div className="pt-8 pb-4 flex justify-end gap-4 border-t border-slate-200 mt-8">
              {submitting ? (
                <div className="mr-auto inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg">
                  <Loader2 size={14} className="animate-spin" />
                  {submitProgress || "Submitting..."}
                </div>
              ) : null}
              <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                {canEditLessonNo ? "Close Sheet" : "Cancel"}
              </button>
              {canEditInstructorSection && (
                <button
                  type="button"
                  disabled={submitting}
                  className={`px-6 py-3 rounded-xl font-black ${accent.buttonBg} ${accent.buttonHover} text-white transition-colors flex items-center gap-2 uppercase tracking-wide disabled:opacity-60`}
                  onClick={handleSubmit}
                >
                  <ClipboardCheck size={18} />
                  {submitting ? "Submitting..." : "Submit Debriefing"}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
