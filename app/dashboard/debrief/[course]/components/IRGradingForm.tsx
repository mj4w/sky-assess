"use client"

import SharedCourseGradingForm from "./SharedCourseGradingForm"

const IR_SECTIONS = [
  {
    title: "Preflight Preparation",
    items: ["Pilot Qualifications", "Weather Information", "Cross-Country Flight Planning"],
  },
  {
    title: "Preflight Procedures",
    items: [
      "Aircraft Systems Related to IFR Operations",
      "Aircraft Flight Instruments and Navigation Equipment",
      "Instrument Cockpit Check",
    ],
  },
  {
    title: "ATC Clearances and Procedures",
    items: [
      "Air Traffic Control Clearances",
      "Compliance with Departure, En route, and Arrival Procedures and Clearances",
      "Holding Procedures",
    ],
  },
  {
    title: "Flight by Reference to Instruments",
    items: ["Basic Instrument Flight Maneuvers", "Recovery from Unusual Flight Attitudes"],
  },
  {
    title: "Navigation Systems",
    items: ["Intercepting and Tracking Navigational Systems"],
  },
  {
    title: "Instrument Approach Procedures",
    items: [
      "Non-precision Approach (NPA)",
      "Precision Approach (PA)",
      "Missed Approach",
      "Circling Approach",
      "Landing from a Straight-in or Circling Approach",
    ],
  },
  {
    title: "Emergency Procedures",
    items: [
      "Loss of Communications",
      "One Engine Inoperative During Straight-and-Level Flight and Turns (Multiengine Airplane)",
      "One Engine Inoperative - Instrument Approach (Multiengine Airplane)",
      "Loss of Primary Flight Instrument Indicators",
    ],
  },
  {
    title: "Post Flight Procedures",
    items: ["Checklist Usage", "Checking Instruments and Equipment"],
  },
]

export default function IRGradingForm(props: {
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
      courseCode="IR"
      courseTitle="IR Grading Sheet"
      courseSubtitle="Instrument Rating Course"
      studentLabel="F.I. Trainee"
      lessonPlaceholder="e.g. IR-04"
      accent={{
        iconBg: "bg-orange-600",
        headingText: "text-orange-700",
        headingBorder: "border-orange-600",
        buttonBg: "bg-orange-600",
        buttonHover: "hover:bg-orange-500",
        focusRing: "focus:ring-1 focus:ring-orange-600",
        gradeActive: "bg-orange-600 border-orange-600",
        gradeHover: "hover:border-orange-500",
      }}
      sections={IR_SECTIONS}
    />
  )
}
