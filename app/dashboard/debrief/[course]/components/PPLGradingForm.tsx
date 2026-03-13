"use client"

import SharedCourseGradingForm from "./SharedCourseGradingForm"
import { supabase } from "@/lib/supabase"

const PPL_SECTIONS = [
  {
    title: "Preflight Items",
    items: ["Pre-flight Inspection", "Engine Starting", "Taxiing", "Before Takeoff Check"],
  },
  {
    title: "Traffic Pattern",
    items: [
      "Normal Takeoff and Climb",
      "Normal Approach and Landing",
      "Power-Off Landings (90 / 180 / 360)",
      "Landings with Flap Settings",
      "Go-Around / Missed Approach Procedure",
    ],
  },
  {
    title: "Aerial Maneuvers",
    items: [
      "Straight and Level",
      "Climbs and Descents",
      "Turns",
      "Climbing and Descending Turns",
      "Slow Flight (Clean and Dirty)",
      "Power-On Stalls",
      "Power-Off Stalls",
      "Spin Awareness (Discussion)",
      "Aerodrome Entry and Exit Procedures",
    ],
  },
]

export default function PPLGradingForm(props: {
  onClose: () => void
  onSubmitted?: () => void
  instructorName: string
  role: string
  initialSession?: {
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
}) {
  return (
    <SharedCourseGradingForm
      {...props}
      courseCode="PPL"
      courseTitle="PPL Grading Sheet"
      courseSubtitle="Private Pilot License Course"
      lessonPlaceholder="e.g. 18"
      accent={{
        iconBg: "bg-blue-900",
        headingText: "text-blue-900",
        headingBorder: "border-blue-900",
        buttonBg: "bg-blue-900",
        buttonHover: "hover:bg-blue-800",
        focusRing: "focus:ring-1 focus:ring-blue-900",
        gradeActive: "bg-blue-900 border-blue-900",
        gradeHover: "hover:border-blue-500",
      }}
      sections={PPL_SECTIONS}
      submitHandler={async ({
        authUserId,
        signaturePath,
        lessonNo,
        date,
        rpc,
        duration,
        assignmentId,
        flightType,
        timeLabel,
        studentId,
        studentName,
        instructorId,
        instructorName,
        sections,
        formData,
      }) => {
        const { data: legacyRow, error: legacyError } = await supabase
          .from("ppl_debriefs")
          .insert([
            {
              assignment_id: assignmentId || null,
              student_id: studentId,
              student_name_snapshot: studentName,
              instructor_id: instructorId,
              instructor_name_snapshot: instructorName,
              lesson_no: lessonNo,
              op_date: date,
              rpc,
              duration,
              flight_type: flightType || null,
              time_label: timeLabel || null,
              instructor_signature_path: signaturePath,
              notify: false,
              created_by: authUserId,
            },
          ])
          .select("id")
          .single()

        if (legacyError) throw legacyError

        const legacyItemRows = sections.flatMap((section) =>
          section.items.map((item) => ({
            debrief_id: legacyRow.id,
            section_title: section.title,
            item_name: item,
            grade: formData[item]?.grade || null,
            remark: (formData[item]?.remark || "").trim() || null,
          }))
        )

        const { error: legacyItemsError } = await supabase.from("ppl_debrief_items").insert(legacyItemRows)
        if (legacyItemsError) throw legacyItemsError

        const { data: genericRow, error: genericError } = await supabase
          .from("course_debriefs")
          .insert([
            {
              course_code: "PPL",
              assignment_id: assignmentId || null,
              student_id: studentId,
              student_name_snapshot: studentName,
              instructor_id: instructorId,
              instructor_name_snapshot: instructorName,
              lesson_no: lessonNo,
              op_date: date,
              rpc,
              duration,
              flight_type: flightType || null,
              time_label: timeLabel || null,
              instructor_signature_path: signaturePath,
              notify: false,
              created_by: authUserId,
            },
          ])
          .select("id")
          .single()

        if (genericError) throw genericError

        const genericItemRows = sections.flatMap((section) =>
          section.items.map((item) => ({
            debrief_id: genericRow.id,
            section_title: section.title,
            item_name: item,
            grade: formData[item]?.grade || null,
            remark: (formData[item]?.remark || "").trim() || null,
          }))
        )

        const { error: genericItemsError } = await supabase.from("course_debrief_items").insert(genericItemRows)
        if (genericItemsError) throw genericItemsError

        if (assignmentId) {
          const { error: assignmentUpdateError } = await supabase
            .from("flight_ops_assignments")
            .update({ notification_read_instructor: true })
            .eq("id", assignmentId)

          if (assignmentUpdateError) throw assignmentUpdateError
        }

        let warningMessage = ""
        const { data: studentProfileRows, error: studentProfileError } = await supabase
          .from("profiles")
          .select("email")
          .ilike("student_id", studentId)
          .limit(1)

        if (studentProfileError) throw studentProfileError
        const studentEmail = String(studentProfileRows?.[0]?.email || "").trim()
        if (studentEmail && typeof window !== "undefined") {
          const notifyResponse = await fetch("/api/reminders/debrief-complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: studentEmail,
              studentName,
              instructorName,
              courseCode: "PPL",
              lessonNo,
              debriefUrl: `${window.location.origin}/debrief-access?debrief_id=${encodeURIComponent(legacyRow.id)}`,
            }),
          })
          if (!notifyResponse.ok) {
            const payload = await notifyResponse.json().catch(() => ({}))
            warningMessage = `Debrief saved, but student email notification failed: ${payload?.error || "Unknown error."}`
          }
        } else {
          warningMessage = "Debrief saved, but student has no registered email to notify."
        }

        return warningMessage
          ? { type: "warning" as const, message: warningMessage }
          : { type: "success" as const, message: "PPL debrief submitted successfully." }
      }}
    />
  )
}
