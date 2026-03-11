"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePilotData } from "@/hooks/usePilotData"
import { supabase } from "@/lib/supabase"

interface InstructorOption {
  id: string
  label: string
}

type DetailSectionKey =
  | "Instructional Planning"
  | "Pedagogical Competence"
  | "Institutional Training Policy"
  | "Technological Adaptability"
  | "Continuous Professional Development"

function monthStart(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-01`
}

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`
}

function averageScore(scores: number[]) {
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2))
}

function roundedAverage(scores: number[]) {
  return Math.round(averageScore(scores))
}

function ratingScale(value: number, onChange: (v: number) => void) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {[4, 3, 2, 1].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          className={`h-8 rounded border text-[11px] font-black transition-colors ${
            value === score ? "bg-blue-900 border-blue-900 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-blue-400"
          }`}
        >
          {score}
        </button>
      ))}
    </div>
  )
}

export default function InstructorEvaluationPage() {
  const router = useRouter()
  const { pilotData, loading } = usePilotData()
  const [instructors, setInstructors] = useState<InstructorOption[]>([])
  const [selectedInstructorId, setSelectedInstructorId] = useState("")
  const [message, setMessage] = useState("")
  const [availabilityMessage, setAvailabilityMessage] = useState("")
  const [requiredEvaluationsCount, setRequiredEvaluationsCount] = useState(0)
  const [submittedEvaluationsCount, setSubmittedEvaluationsCount] = useState(0)
  const profileDefaultRating = 3

  const [detailedRatings, setDetailedRatings] = useState<Record<DetailSectionKey, number[]>>({
    "Instructional Planning": [3, 3, 3, 3, 3, 3, 3],
    "Pedagogical Competence": [3, 3, 3, 3, 3, 3, 3],
    "Institutional Training Policy": [3, 3, 3, 3, 3, 3, 3],
    "Technological Adaptability": [3, 3, 3, 3, 3, 3, 3],
    "Continuous Professional Development": [3, 3, 3, 3, 3, 3, 3],
  })

  const [influenceExperience, setInfluenceExperience] = useState(3)
  const [influenceTraining, setInfluenceTraining] = useState(3)
  const [influenceEnvironment, setInfluenceEnvironment] = useState(3)
  const [influencePolicy, setInfluencePolicy] = useState(3)
  const [notes, setNotes] = useState("")
  const currentEvalMonth = monthStart(new Date())

  const competencyDetails: Record<DetailSectionKey, string[]> = {
    "Instructional Planning": [
      "My instructor prepares lessons in a clear and organized manner.",
      "I am aware of the objectives for each flight session.",
      "My flight lessons follow a logical and effective sequence.",
      "My instructor provides clear briefings before practical exercises.",
      "My lessons are planned to address both my strengths and weaknesses.",
      "My instructor anticipates possible challenges during flight training.",
      "I feel the time in each flight session is well-utilized.",
    ],
    "Pedagogical Competence": [
      "I understand concepts better because my instructor explains them clearly.",
      "My instructor adjusts teaching methods to my learning style.",
      "I feel encouraged to ask questions and receive constructive feedback.",
      "My instructor demonstrates patience and professionalism during lessons.",
      "I learn better because my instructor applies strategies effectively in flight situations.",
      "I feel motivated to improve my skills due to my instructor's guidance.",
      "I believe my learning is enhanced by my instructor's teaching style.",
    ],
    "Institutional Training Policy": [
      "My instructor follows school flight standards and guidelines.",
      "My instructor emphasizes the importance of following flight procedures.",
      "I am consistently reminded about safety regulations during training.",
      "My instructor ensures compliance with school policies.",
      "My lessons align with the institution's learning objectives.",
      "I feel institutional policies positively influence my instructor's teaching.",
      "I perceive my instructor maintains expected professional conduct.",
    ],
    "Technological Adaptability": [
      "My instructor uses simulators or training technology effectively.",
      "Technology helps me study better during lessons.",
      "My instructor can fix issues with flight training equipment.",
      "I am encouraged to use technology to support my learning.",
      "My instructor adapts lessons based on available tools.",
      "Technology helps me gain new skills in training.",
      "My instructor's use of technology improves my learning.",
    ],
    "Continuous Professional Development": [
      "My instructor participates in training to improve instructional skills.",
      "My instructor shares new knowledge or techniques during lessons.",
      "My instructor encourages me to pursue continuous improvement.",
      "My instructor demonstrates up-to-date aviation knowledge.",
      "My lessons reflect my instructor's ongoing professional development.",
      "My instructor seeks feedback to improve teaching.",
      "My instructor's skills remain current and relevant.",
    ],
  }

  useEffect(() => {
    if (!pilotData) return
    if (pilotData.role === "student") return
    if (pilotData.role === "admin") {
      router.replace("/dashboard/admin")
      return
    }
    router.replace(`/dashboard/${pilotData.role}/${pilotData.id}`)
  }, [pilotData, router])

  useEffect(() => {
    const loadInstructors = async () => {
      if (!pilotData || pilotData.role !== "student") return
      const studentId = String(pilotData.student_id || "").trim()
      if (!studentId) {
        setInstructors([])
        setAvailabilityMessage("No student ID found in your profile.")
        return
      }

      const { data: infoRows, error } = await supabase
        .from("instructor_info")
        .select("instructor_id, full_name")
        .order("full_name", { ascending: true })
        .order("instructor_id", { ascending: true })

      if (error) {
        setInstructors([])
        setAvailabilityMessage("Unable to load instructors.")
        return
      }

      const options = (infoRows || [])
        .map((row) => {
          const instructorId = String(row.instructor_id || "").trim()
          const fullName = String(row.full_name || "").trim()
          if (!instructorId) return null
          return { id: instructorId.toLowerCase(), label: fullName || instructorId }
        })
        .filter((item): item is InstructorOption => Boolean(item))
      setInstructors(options)
      setSelectedInstructorId((previous) => (options.some((item) => item.id === previous) ? previous : options[0]?.id || ""))

      const studentCandidates = [...new Set([studentId, studentId.toUpperCase(), studentId.toLowerCase()])]
      const todayDate = toDateInput(new Date())
      const { data: assignmentRows, error: assignmentError } = await supabase
        .from("flight_ops_assignments")
        .select("id")
        .in("student_id", studentCandidates)
        .eq("op_date", todayDate)

      if (assignmentError) {
        setRequiredEvaluationsCount(0)
        setSubmittedEvaluationsCount(0)
        setAvailabilityMessage("Unable to load today's flight schedule count.")
        return
      }

      const requiredCount = (assignmentRows || []).length
      setRequiredEvaluationsCount(requiredCount)

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(startOfDay)
      endOfDay.setDate(endOfDay.getDate() + 1)
      const { data: submittedRows, error: submittedError } = await supabase
        .from("student_instructor_feedback")
        .select("id")
        .in("student_id", studentCandidates)
        .gte("created_at", startOfDay.toISOString())
        .lt("created_at", endOfDay.toISOString())

      const submittedCountRaw = submittedError ? 0 : (submittedRows || []).length
      const submittedCountCapped = requiredCount > 0 ? Math.min(submittedCountRaw, requiredCount) : submittedCountRaw
      setSubmittedEvaluationsCount(submittedCountCapped)

      if (requiredCount === 0) {
        setAvailabilityMessage("No flight schedule today. Instructor evaluation is unavailable.")
        return
      }

      const remainingCount = Math.max(requiredCount - submittedCountCapped, 0)
      setAvailabilityMessage(`Today: ${requiredCount} scheduled flight${requiredCount > 1 ? "s" : ""} • ${remainingCount} evaluation${remainingCount > 1 ? "s" : ""} remaining.`)
      if (options.length === 0) {
        setInstructors([])
        setSelectedInstructorId("")
      }
    }

    loadInstructors()
  }, [currentEvalMonth, pilotData])

  const totalScore = useMemo(
    () =>
      roundedAverage(detailedRatings["Instructional Planning"]) +
      roundedAverage(detailedRatings["Pedagogical Competence"]) +
      roundedAverage(detailedRatings["Institutional Training Policy"]) +
      roundedAverage(detailedRatings["Technological Adaptability"]) +
      roundedAverage(detailedRatings["Continuous Professional Development"]) +
      influenceExperience +
      influenceTraining +
      influenceEnvironment +
      influencePolicy,
    [
      detailedRatings,
      influenceExperience,
      influenceTraining,
      influenceEnvironment,
      influencePolicy,
    ]
  )

  const influenceRows = [
    { label: "Professional Experience Influence", value: influenceExperience, setValue: setInfluenceExperience },
    { label: "Instructional Training Influence", value: influenceTraining, setValue: setInfluenceTraining },
    { label: "Work Environment Influence", value: influenceEnvironment, setValue: setInfluenceEnvironment },
    { label: "Institutional Policies Influence", value: influencePolicy, setValue: setInfluencePolicy },
  ]

  const detailedAttributeSections = Object.entries(competencyDetails) as [DetailSectionKey, string[]][]

  const handleSubmit = async () => {
    if (!pilotData || pilotData.role !== "student") return
    if (requiredEvaluationsCount === 0) {
      setMessage("No scheduled flight today. Evaluation is disabled.")
      return
    }
    const studentId = String(pilotData.student_id || "").trim()
    if (!studentId || !selectedInstructorId) {
      setMessage("Select an instructor first.")
      return
    }

    const normalizedInstructorId = selectedInstructorId.toLowerCase()
    const payloadBase = {
      student_id: studentId,
      instructor_id: normalizedInstructorId,
      eval_month: currentEvalMonth,
      notify: null,
      profile_experience: profileDefaultRating,
      profile_training_certificate: profileDefaultRating,
      profile_licenses: profileDefaultRating,
      profile_instruction_type: profileDefaultRating,
      attr_instructional_planning: roundedAverage(detailedRatings["Instructional Planning"]),
      attr_pedagogical_competence: roundedAverage(detailedRatings["Pedagogical Competence"]),
      attr_training_policy: roundedAverage(detailedRatings["Institutional Training Policy"]),
      attr_tech_adaptability: roundedAverage(detailedRatings["Technological Adaptability"]),
      attr_professional_development: roundedAverage(detailedRatings["Continuous Professional Development"]),
      influence_professional_experience: influenceExperience,
      influence_instructional_training: influenceTraining,
      influence_work_environment: influenceEnvironment,
      influence_institutional_policies: influencePolicy,
      notes: notes.trim() || null,
    }

    const payloadWithDetailedRatings = {
      ...payloadBase,
      attr_instructional_planning_details: detailedRatings["Instructional Planning"],
      attr_pedagogical_competence_details: detailedRatings["Pedagogical Competence"],
      attr_training_policy_details: detailedRatings["Institutional Training Policy"],
      attr_tech_adaptability_details: detailedRatings["Technological Adaptability"],
      attr_professional_development_details: detailedRatings["Continuous Professional Development"],
    }

    let { error } = await supabase
      .from("student_instructor_feedback")
      .insert(payloadWithDetailedRatings)

    if (
      error &&
      (error.code === "PGRST204" ||
        error.message.includes("attr_instructional_planning_details") ||
        error.message.includes("attr_pedagogical_competence_details") ||
        error.message.includes("attr_training_policy_details") ||
        error.message.includes("attr_tech_adaptability_details") ||
        error.message.includes("attr_professional_development_details"))
    ) {
      const retry = await supabase
        .from("student_instructor_feedback")
        .insert(payloadBase)
      error = retry.error
      if (!error) {
        setSubmittedEvaluationsCount((previous) =>
          requiredEvaluationsCount > 0 ? Math.min(previous + 1, requiredEvaluationsCount) : previous + 1
        )
        setMessage("Evaluation submitted. Run the SQL migration to save per-item ratings.")
        return
      }
    }

    if (error) {
      setMessage(
        error.code === "42P01"
          ? "Missing table: create student_instructor_feedback first."
          : error.message
      )
      return
    }
    setSubmittedEvaluationsCount((previous) =>
      requiredEvaluationsCount > 0 ? Math.min(previous + 1, requiredEvaluationsCount) : previous + 1
    )
    setMessage("Instructor evaluation submitted.")
  }

  if (loading || !pilotData) return <div className="p-8 text-sm text-slate-500">Loading...</div>
  if (pilotData.role !== "student") return <div className="p-8 text-sm text-slate-500">Redirecting...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-8 lg:p-12 space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          href={`/dashboard/${pilotData.role}/${pilotData.id}`}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-900 transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
        >
          <ArrowLeft size={14} /> Back to Terminal
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="px-6 py-6 md:px-8 md:py-8 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100">Student Feedback</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white">Instructor Evaluation</h1>
            <p className="mt-1 text-xs font-semibold text-blue-100/80">Rate each area from 1 to 4 based on your recent flight training</p>
          </div>

          <div className="p-6 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Selected Instructor</p>
              <select
                value={selectedInstructorId}
                onChange={(e) => setSelectedInstructorId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold"
              >
                {instructors.length === 0 ? (
                  <option value="">No assigned instructor yet</option>
                ) : (
                  instructors.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))
                )}
              </select>
              {availabilityMessage ? <p className="mt-2 text-xs font-semibold text-slate-600">{availabilityMessage}</p> : null}
              <p className="mt-1 text-xs text-slate-500">
                Required today: <span className="font-semibold text-slate-700">{requiredEvaluationsCount}</span> • Submitted today:{" "}
                <span className="font-semibold text-slate-700">{submittedEvaluationsCount}</span> • Remaining:{" "}
                <span className="font-semibold text-slate-700">{Math.max(requiredEvaluationsCount - submittedEvaluationsCount, 0)}</span>
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-blue-900 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">Instructor Competency Evaluation</p>
              </div>
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 grid gap-2 sm:grid-cols-2 text-xs font-semibold text-slate-700">
                <p><span className="font-black text-slate-900">Instructor:</span> {instructors.find((item) => item.id === selectedInstructorId)?.label || "N/A"}</p>
                <p><span className="font-black text-slate-900">Evaluation Month:</span> {new Date(`${currentEvalMonth}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
              </div>
              <div className="px-4 py-2 border-b border-slate-200 bg-white">
                <div className="grid grid-cols-[1fr_220px] gap-3 items-center">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Competency Rating</p>
                  <div className="grid grid-cols-4 gap-1 text-[10px] font-black uppercase text-slate-500 text-center">
                    <span>4</span>
                    <span>3</span>
                    <span>2</span>
                    <span>1</span>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-slate-200">
                <div className="px-4 py-2 bg-slate-100">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-700">Dominant Teaching Approach Attributes</p>
                </div>
                {detailedAttributeSections.map(([sectionTitle, detailList]) => (
                  <div key={sectionTitle} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">{sectionTitle}</p>
                      <p className="text-[11px] font-black uppercase tracking-widest text-blue-800">
                        Section Average: {averageScore(detailedRatings[sectionTitle]).toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {detailList.map((detail, index) => (
                        <div key={`${sectionTitle}-${index}`} className="grid grid-cols-[1fr_220px] gap-3 items-start">
                          <p className="text-[11px] text-slate-500 leading-snug">
                            {index + 1}. {detail}
                          </p>
                          {ratingScale(detailedRatings[sectionTitle][index], (value) => {
                            setDetailedRatings((previous) => ({
                              ...previous,
                              [sectionTitle]: previous[sectionTitle].map((entry, entryIndex) => (entryIndex === index ? value : entry)),
                            }))
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="px-4 py-2 bg-slate-100">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-700">Influence the Teaching Approaches</p>
                </div>
                {influenceRows.map((row) => (
                  <div key={row.label} className="px-4 py-2 grid grid-cols-[1fr_220px] gap-3 items-start">
                    <p className="text-sm font-semibold text-slate-700">{row.label}</p>
                    {ratingScale(row.value, row.setValue)}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Overall Score</p>
                <p className="text-xl font-black text-blue-900 flex items-center gap-1"><Star size={16} /> {totalScore} / 36</p>
              </div>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional feedback (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleSubmit}
                disabled={!selectedInstructorId || requiredEvaluationsCount === 0 || submittedEvaluationsCount >= requiredEvaluationsCount}
                className="h-10 px-4 rounded-lg bg-blue-900 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requiredEvaluationsCount === 0
                  ? "No Scheduled Flight Today"
                  : submittedEvaluationsCount >= requiredEvaluationsCount
                  ? "Required Evaluations Completed"
                  : "Submit Evaluation"}
              </button>
              {message ? <p className="text-xs font-semibold text-blue-700">{message}</p> : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
