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

function monthStart(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-01`
}

function ratingInput(value: number, onChange: (v: number) => void) {
  return (
    <input
      type="number"
      min={1}
      max={5}
      value={value}
      onChange={(e) => onChange(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
      className="h-10 w-20 rounded-lg border border-slate-300 px-2 text-sm font-bold"
    />
  )
}

export default function InstructorEvaluationPage() {
  const router = useRouter()
  const { pilotData, loading } = usePilotData()
  const [instructors, setInstructors] = useState<InstructorOption[]>([])
  const [selectedInstructorId, setSelectedInstructorId] = useState("")
  const [message, setMessage] = useState("")
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)

  const [profileExperience, setProfileExperience] = useState(3)
  const [profileTrainingCert, setProfileTrainingCert] = useState(3)
  const [profileLicenses, setProfileLicenses] = useState(3)
  const [profileInstructionType, setProfileInstructionType] = useState(3)

  const [attrPlanning, setAttrPlanning] = useState(3)
  const [attrPedagogy, setAttrPedagogy] = useState(3)
  const [attrPolicy, setAttrPolicy] = useState(3)
  const [attrTechAdapt, setAttrTechAdapt] = useState(3)
  const [attrDevelopment, setAttrDevelopment] = useState(3)

  const [influenceExperience, setInfluenceExperience] = useState(3)
  const [influenceTraining, setInfluenceTraining] = useState(3)
  const [influenceEnvironment, setInfluenceEnvironment] = useState(3)
  const [influencePolicy, setInfluencePolicy] = useState(3)
  const [notes, setNotes] = useState("")
  const currentEvalMonth = monthStart(new Date())

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
      if (!studentId) return
      const studentCandidates = [...new Set([studentId, studentId.toUpperCase(), studentId.toLowerCase()])]

      const { data } = await supabase
        .from("flight_ops_assignments")
        .select("instructor_id")
        .in("student_id", studentCandidates)

      const instructorIds = [...new Set((data || []).map((r) => String(r.instructor_id || "").trim()).filter(Boolean))]
      if (instructorIds.length === 0) {
        setInstructors([])
        return
      }

      const instructorCandidates = [...new Set(instructorIds.flatMap((id) => [id, id.toUpperCase(), id.toLowerCase()]))]
      const { data: infoRows } = await supabase
        .from("instructor_info")
        .select("instructor_id, full_name")
        .in("instructor_id", instructorCandidates)

      const nameMap: Record<string, string> = {}
      ;(infoRows || []).forEach((row) => {
        const key = String(row.instructor_id || "").toLowerCase()
        const fullName = String(row.full_name || "").trim()
        if (key && fullName) nameMap[key] = fullName
      })

      const options = instructorIds.map((id) => ({
        id: id.toLowerCase(),
        label: nameMap[id.toLowerCase()] || id,
      }))
      setInstructors(options)
      if (!selectedInstructorId && options[0]) setSelectedInstructorId(options[0].id)
    }

    loadInstructors()
  }, [pilotData, selectedInstructorId])

  useEffect(() => {
    const loadSubmissionStatus = async () => {
      if (!pilotData || pilotData.role !== "student") return
      const studentId = String(pilotData.student_id || "").trim()
      if (!studentId || !selectedInstructorId) {
        setAlreadySubmitted(false)
        return
      }

      const studentCandidates = [...new Set([studentId, studentId.toUpperCase(), studentId.toLowerCase()])]
      const normalizedInstructorId = selectedInstructorId.toLowerCase()
      const instructorCandidates = [...new Set([normalizedInstructorId, normalizedInstructorId.toUpperCase()])]
      const { data } = await supabase
        .from("student_instructor_feedback")
        .select("id")
        .in("student_id", studentCandidates)
        .in("instructor_id", instructorCandidates)
        .eq("eval_month", currentEvalMonth)
        .limit(1)

      setAlreadySubmitted(Boolean(data?.length))
    }

    loadSubmissionStatus()
  }, [currentEvalMonth, pilotData, selectedInstructorId])

  const totalScore = useMemo(
    () =>
      profileExperience +
      profileTrainingCert +
      profileLicenses +
      profileInstructionType +
      attrPlanning +
      attrPedagogy +
      attrPolicy +
      attrTechAdapt +
      attrDevelopment +
      influenceExperience +
      influenceTraining +
      influenceEnvironment +
      influencePolicy,
    [
      profileExperience,
      profileTrainingCert,
      profileLicenses,
      profileInstructionType,
      attrPlanning,
      attrPedagogy,
      attrPolicy,
      attrTechAdapt,
      attrDevelopment,
      influenceExperience,
      influenceTraining,
      influenceEnvironment,
      influencePolicy,
    ]
  )

  const handleSubmit = async () => {
    if (!pilotData || pilotData.role !== "student") return
    const studentId = String(pilotData.student_id || "").trim()
    if (!studentId || !selectedInstructorId) {
      setMessage("Select an instructor first.")
      return
    }
    if (alreadySubmitted) {
      setMessage("You already submitted this instructor evaluation for the current month.")
      return
    }

    const normalizedInstructorId = selectedInstructorId.toLowerCase()
    const payload = {
      student_id: studentId,
      instructor_id: normalizedInstructorId,
      eval_month: currentEvalMonth,
      notify: null,
      profile_experience: profileExperience,
      profile_training_certificate: profileTrainingCert,
      profile_licenses: profileLicenses,
      profile_instruction_type: profileInstructionType,
      attr_instructional_planning: attrPlanning,
      attr_pedagogical_competence: attrPedagogy,
      attr_training_policy: attrPolicy,
      attr_tech_adaptability: attrTechAdapt,
      attr_professional_development: attrDevelopment,
      influence_professional_experience: influenceExperience,
      influence_instructional_training: influenceTraining,
      influence_work_environment: influenceEnvironment,
      influence_institutional_policies: influencePolicy,
      notes: notes.trim() || null,
    }

    const { error } = await supabase
      .from("student_instructor_feedback")
      .insert(payload)

    if (error) {
      setMessage(
        error.code === "42P01"
          ? "Missing table: create student_instructor_feedback first."
          : error.code === "23505"
          ? "You already submitted this instructor evaluation for the current month."
          : error.message
      )
      return
    }
    setAlreadySubmitted(true)
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
            <p className="mt-1 text-xs font-semibold text-blue-100/80">Rate each area from 1 to 5 based on your learning experience</p>
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-blue-900">Flight Instructor&apos;s Profile</p>
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Length of Professional Experience</span>{ratingInput(profileExperience, setProfileExperience)}</div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Training Certificate</span>{ratingInput(profileTrainingCert, setProfileTrainingCert)}</div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Licenses</span>{ratingInput(profileLicenses, setProfileLicenses)}</div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Type of Flight Instruction Handled</span>{ratingInput(profileInstructionType, setProfileInstructionType)}</div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-blue-900">Dominant Teaching Approach Attributes</p>
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Instructional Planning</span>{ratingInput(attrPlanning, setAttrPlanning)}</div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Pedagogical Competence</span>{ratingInput(attrPedagogy, setAttrPedagogy)}</div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Institutional Training Policy</span>{ratingInput(attrPolicy, setAttrPolicy)}</div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Technological Adaptability</span>{ratingInput(attrTechAdapt, setAttrTechAdapt)}</div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Continuous Professional Development</span>{ratingInput(attrDevelopment, setAttrDevelopment)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-blue-900">Influence the Teaching Approaches</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Professional Experience</span>{ratingInput(influenceExperience, setInfluenceExperience)}</div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Instructional Training</span>{ratingInput(influenceTraining, setInfluenceTraining)}</div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Work Environment</span>{ratingInput(influenceEnvironment, setInfluenceEnvironment)}</div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Institutional Policies</span>{ratingInput(influencePolicy, setInfluencePolicy)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Overall Score</p>
                <p className="text-xl font-black text-blue-900 flex items-center gap-1"><Star size={16} /> {totalScore} / 65</p>
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
                disabled={alreadySubmitted}
                className="h-10 px-4 rounded-lg bg-blue-900 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {alreadySubmitted ? "Submitted This Month" : "Submit Evaluation"}
              </button>
              {alreadySubmitted ? (
                <p className="text-xs font-semibold text-amber-700">
                  Anti-spam rule: one evaluation per instructor per month.
                </p>
              ) : null}
              {message ? <p className="text-xs font-semibold text-blue-700">{message}</p> : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
