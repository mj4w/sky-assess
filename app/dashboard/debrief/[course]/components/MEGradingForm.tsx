"use client"

import SharedCourseGradingForm from "./SharedCourseGradingForm"

const ME_SECTIONS = [
  {
    title: "Preflight Items",
    items: ["Preflight Inspection", "Engine Starting", "Taxiing", "Before Takeoff Check"],
  },
  {
    title: "Traffic Pattern",
    items: [
      "Normal Takeoff and Climb",
      "Normal Approach and Landing",
      "Short Field Takeoff and Max Performance Climb",
      "Short Field Approach and Landing",
      "Go-Around / Missed Approach Procedure",
    ],
  },
  {
    title: "Aerial Maneuvers",
    items: [
      "Straight and Level",
      "Climbs and Descents",
      "Steep Turns",
      "Climbing and Descending Turns",
      "Slow Flight (Clean and Dirty)",
      "Power-Off Stalls",
      "Vmc Demo",
      "Aerodrome Entry and Exit Procedures",
    ],
  },
  {
    title: "Navigation",
    items: ["Flight Planning", "Radio Navigation", "Lost Com. Procedures", "Lost and Diversion Procedures"],
  },
  {
    title: "Emergency Procedures",
    items: [
      "Single Engine (during TO Roll, TO, Upwind)",
      "Single Engine During Flight (Inflight Restart)",
      "Single Engine Emergency Approach and Landing",
      "Electrical Fire",
      "Engine Fire",
      "Emergency Descent",
    ],
  },
  {
    title: "Postflight Procedures",
    items: ["After Landing, Parking, and Securing"],
  },
  {
    title: "General Items",
    items: [
      "Checklist Usage",
      "Radio Communication",
      "Cockpit Management",
      "Airport Runway, Taxiway, Markings",
      "CFIT Avoidance",
      "Aeronautical Decision Making",
    ],
  },
]

export default function MEGradingForm(props: {
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
      courseCode="ME"
      courseTitle="Multi-Engine Grading Sheet"
      courseSubtitle="Multi-Engine Rating Course"
      lessonPlaceholder="e.g. ME-02"
      accent={{
        iconBg: "bg-violet-700",
        headingText: "text-violet-700",
        headingBorder: "border-violet-700",
        buttonBg: "bg-violet-700",
        buttonHover: "hover:bg-violet-600",
        focusRing: "focus:ring-1 focus:ring-violet-700",
        gradeActive: "bg-violet-700 border-violet-700",
        gradeHover: "hover:border-violet-500",
      }}
      sections={ME_SECTIONS}
    />
  )
}
