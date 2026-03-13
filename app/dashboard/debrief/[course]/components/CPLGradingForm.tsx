"use client"

import SharedCourseGradingForm from "./SharedCourseGradingForm"

const CPL_SECTIONS = [
  {
    title: "Commercial Flight Training",
    items: [
      "CP1 Review Basic Maneuvers / Landings",
      "CP2 Turn Around a Point / S-Turns / Landings",
      "CP3 Power-Off Landings (90, 180, 360)",
      "CP4 Steep Turns / Lazy Eight / Chandelles",
      "CP5 Soft Field and Short Field Takeoff and Landing",
      "CP6 Advanced Maneuvers Review",
      "CP7 Crosswind Takeoff / Landing / Forward-Side Slip",
      "CP8 Slow Flight / Eights on Pylon / Eights Along Road",
      "CP9 Emergency Procedures",
      "CP10 Soft and Short Field with Distance Limit",
      "CP11 Advanced Maneuvers (Slow Flight and Eights)",
      "CP12 Cross Country / Lost Comms / Diversion / Navigation",
      "CP13 Company Check / Advanced / Emergency / Landings",
    ],
  },
]

export default function CPLGradingForm(props: {
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
      courseCode="CPL"
      courseTitle="CPL Grading Sheet"
      courseSubtitle="Commercial Pilot License"
      lessonPlaceholder="e.g. CP8"
      accent={{
        iconBg: "bg-emerald-600",
        headingText: "text-emerald-700",
        headingBorder: "border-emerald-600",
        buttonBg: "bg-emerald-600",
        buttonHover: "hover:bg-emerald-500",
        focusRing: "focus:ring-1 focus:ring-emerald-600",
        gradeActive: "bg-emerald-600 border-emerald-600",
        gradeHover: "hover:border-emerald-500",
      }}
      sections={CPL_SECTIONS}
    />
  )
}
