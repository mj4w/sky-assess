"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertTriangle, Plane, Plus, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

const flightTypeOptions = [
  { code: "PS", label: "Pre-Solo Simulator", colorClass: "bg-violet-100 border-violet-300" },
  { code: "TAXI", label: "Taxi-Exercise", colorClass: "bg-amber-100 border-amber-300" },
  { code: "LCL", label: "Local Flight", colorClass: "bg-lime-100 border-lime-300" },
  { code: "XC", label: "Cross Country Flight", colorClass: "bg-sky-100 border-sky-300" },
  { code: "IRS", label: "Instrument Simulator", colorClass: "bg-orange-100 border-orange-300" },
  { code: "CAAP", label: "CAAP Checkride", colorClass: "bg-emerald-100 border-emerald-300" },
  { code: "CF", label: "Company Flight", colorClass: "bg-teal-100 border-teal-300" },
  { code: "OTS", label: "Out of Service", colorClass: "bg-rose-100 border-rose-300" },
  { code: "TBD", label: "To Be Determined", colorClass: "bg-slate-100 border-slate-300" },
  { code: "CT", label: "Cross Trainees", colorClass: "bg-cyan-100 border-cyan-300" },
  { code: "UPRT", label: "Upset Prevention and Recovery Training", colorClass: "bg-red-100 border-red-300" },
] as const

type SlotType = (typeof flightTypeOptions)[number]["code"]

interface Booking {
  start: number
  span: number
  studentId: string
  instructorId: string
  type: SlotType
}

interface AircraftRow {
  registry: string
  maintenance?: string
  bookings?: Booking[]
}

interface FleetGroup {
  type: string
  rows: AircraftRow[]
}

interface CrewOption {
  id: string
  fullName: string | null
}

interface CreateModalState {
  fleetType: string
  registry: string
  slotIndex: number
  slotSpan: number
}

interface WarningModalState {
  fleetType: string
  registry: string
}

const timeSlots = ["6-7AM", "7-8AM", "8-9AM", "9-10AM", "10-11AM", "11-12PM", "12-1PM", "1-2PM", "2-3PM", "3-4PM", "4-5PM"]
const warningOptions = ["100-HOUR INSPECTION", "ENGINE OVERHAUL", "SCHEDULED MAINTENANCE", "GROUNDED", "CUSTOM"] as const

const flightSchedule: FleetGroup[] = [
  {
    type: "C152",
    rows: [
      { registry: "RP-C1028" },
      { registry: "RP-C1032" },
      { registry: "RP-C1883" },
      { registry: "RP-C1884" },
    ],
  },
  {
    type: "C172",
    rows: [
      { registry: "RP-C1029" },
      { registry: "RP-C2284" },
    ],
  },
  {
    type: "P2002J",
    rows: [
      { registry: "RP-C1886" },
      { registry: "RP-C1971" },
      { registry: "RP-C1972" },
      { registry: "RP-C1975" },
      { registry: "RP-C1984" },
      { registry: "RP-C1993" },
      { registry: "RP-C2384" },
      { registry: "RP-C2386" },
      { registry: "RP-C2387" },
      { registry: "RP-C2389" },
      { registry: "RP-C4604" },
      { registry: "RP-C4605" },
    ],
  },
  {
    type: "P-MENTO",
    rows: [
      { registry: "RP-C2381" },
      { registry: "RP-C2382" },
    ]
  },
  {
    type: "P-2006T",
    rows: [
      { registry: "RP-C1973" },
      { registry: "RP-C1991" },
    ]
  },
  {
    type: "Alsim ALX",
    rows: [
      { registry: "ALX-35" },
    ]
  },
  {
    type: "Redbird Simulator",
    rows: [
      { registry: "" },
    ]
  },
  {
    type: "8KCAB",
    rows: [
      { registry: "RP-C983" },
    ]
  }
]

function toDateInput(date: Date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, "0")
  const d = `${date.getDate()}`.padStart(2, "0")
  return `${y}-${m}-${d}`
}

function addDays(dateStr: string, days: number) {
  const dt = new Date(`${dateStr}T00:00:00`)
  dt.setDate(dt.getDate() + days)
  return toDateInput(dt)
}

function isSlotOccupied(bookings: Booking[], slotIndex: number) {
  return bookings.some((booking) => slotIndex >= booking.start && slotIndex < booking.start + booking.span)
}

function canPlaceRange(bookings: Booking[], start: number, end: number) {
  const min = Math.min(start, end)
  const max = Math.max(start, end)
  for (let slot = min; slot <= max; slot += 1) {
    if (isSlotOccupied(bookings, slot)) return false
  }
  return true
}

function getRangeText(startIndex: number, span: number) {
  const safeStart = Math.max(0, Math.min(timeSlots.length - 1, startIndex))
  const safeEnd = Math.max(0, Math.min(timeSlots.length - 1, safeStart + span - 1))
  if (safeStart === safeEnd) return timeSlots[safeStart]
  return `${timeSlots[safeStart]} to ${timeSlots[safeEnd]}`
}

export default function DispatchCalendar() {
  const router = useRouter()
  const [dateValue, setDateValue] = useState(toDateInput(new Date()))
  const [studentOptions, setStudentOptions] = useState<CrewOption[]>([])
  const [instructorOptions, setInstructorOptions] = useState<CrewOption[]>([])
  const [assignmentsByRegistry, setAssignmentsByRegistry] = useState<Record<string, Booking[]>>({})
  const [warningsByRegistry, setWarningsByRegistry] = useState<Record<string, string>>({})
  const [createModal, setCreateModal] = useState<CreateModalState | null>(null)
  const [warningModal, setWarningModal] = useState<WarningModalState | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedInstructorId, setSelectedInstructorId] = useState("")
  const [selectedType, setSelectedType] = useState<SlotType>("PS")
  const [dragSelection, setDragSelection] = useState<{ fleetType: string; registry: string; start: number; end: number } | null>(null)
  const [selectedWarning, setSelectedWarning] = useState<(typeof warningOptions)[number]>("100-HOUR INSPECTION")
  const [customWarning, setCustomWarning] = useState("")
  const [savingBooking, setSavingBooking] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [loadingDayData, setLoadingDayData] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const guardFlightOpsRoute = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user

      if (!user) {
        router.replace("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role !== "flightops") {
        if (profile?.role === "admin") {
          router.replace("/dashboard/admin")
        } else {
          router.replace(`/dashboard/${profile?.role || "student"}/${user.id}`)
        }
        return
      }

      setCurrentUserId(user.id)
      setCheckingAccess(false)
    }

    guardFlightOpsRoute()
  }, [router])

  useEffect(() => {
    if (checkingAccess) return
    const loadCrewOptions = async () => {
      const [studentsResponse, instructorsResponse] = await Promise.all([
        supabase.from("student_info").select("student_id, full_name").order("student_id", { ascending: true }),
        supabase.from("instructor_info").select("instructor_id, full_name").order("instructor_id", { ascending: true }),
      ])

      if (!studentsResponse.error) {
        setStudentOptions(
          (studentsResponse.data || [])
            .map((row) => ({ id: row.student_id as string, fullName: (row.full_name as string | null) || null }))
            .filter((row) => row.id)
        )
      }

      if (!instructorsResponse.error) {
        setInstructorOptions(
          (instructorsResponse.data || [])
            .map((row) => ({ id: row.instructor_id as string, fullName: (row.full_name as string | null) || null }))
            .filter((row) => row.id)
        )
      }
    }

    loadCrewOptions()
  }, [checkingAccess])

  const displayDate = useMemo(() => {
    return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }, [dateValue])

  useEffect(() => {
    if (checkingAccess) return

    const loadDayData = async () => {
      setLoadingDayData(true)
      const [assignmentsResponse, warningsResponse] = await Promise.all([
        supabase
          .from("flight_ops_assignments")
          .select("aircraft_registry, slot_index, slot_span, flight_type, student_id, instructor_id")
          .eq("op_date", dateValue),
        supabase
          .from("flight_ops_day_warnings")
          .select("aircraft_registry, warning_text")
          .eq("op_date", dateValue),
      ])

      if (!assignmentsResponse.error) {
        const grouped: Record<string, Booking[]> = {}
        for (const row of assignmentsResponse.data || []) {
          const flightType = (flightTypeOptions.find((option) => option.code === row.flight_type)?.code || "TBD") as SlotType
          const registry = row.aircraft_registry as string
          if (!grouped[registry]) grouped[registry] = []
          grouped[registry].push({
            start: Number(row.slot_index) || 0,
            span: Number(row.slot_span) || 1,
            studentId: (row.student_id as string) || "",
            instructorId: (row.instructor_id as string) || "",
            type: flightType,
          })
        }
        Object.keys(grouped).forEach((registry) => {
          grouped[registry] = grouped[registry].sort((left, right) => left.start - right.start)
        })
        setAssignmentsByRegistry(grouped)
      }

      if (!warningsResponse.error) {
        const warningMap: Record<string, string> = {}
        for (const row of warningsResponse.data || []) {
          warningMap[row.aircraft_registry as string] = row.warning_text as string
        }
        setWarningsByRegistry(warningMap)
      }
      setLoadingDayData(false)
    }

    loadDayData()
  }, [checkingAccess, dateValue])

  const openCreateModal = (fleetType: string, registry: string, slotIndex: number, slotSpan = 1) => {
    setCreateModal({ fleetType, registry, slotIndex, slotSpan })
    setSelectedStudentId((prev) => prev || studentOptions[0]?.id || "")
    setSelectedInstructorId((prev) => prev || instructorOptions[0]?.id || "")
    setSelectedType("PS")
    setModalError(null)
  }

  const closeCreateModal = () => {
    setCreateModal(null)
    setSavingBooking(false)
    setModalError(null)
  }

  const openWarningModal = (fleetType: string, registry: string) => {
    const existing = warningsByRegistry[registry]
    const existingChoice = warningOptions.find((option) => option === existing)
    setWarningModal({ fleetType, registry })
    setSelectedWarning(existingChoice || "100-HOUR INSPECTION")
    setCustomWarning(existingChoice ? "" : existing || "")
    setModalError(null)
  }

  const closeWarningModal = () => {
    setWarningModal(null)
    setModalError(null)
  }

  const submitCreateBooking = async (event: FormEvent) => {
    event.preventDefault()
    if (!createModal || savingBooking) return

    if (!selectedStudentId || !selectedInstructorId) {
      setModalError("Student ID and Instructor ID are required.")
      return
    }

    setSavingBooking(true)
    setModalError(null)

    const student = studentOptions.find((option) => option.id === selectedStudentId)
    const instructor = instructorOptions.find((option) => option.id === selectedInstructorId)

    const existingBookings = assignmentsByRegistry[createModal.registry] || []
    const slotEnd = createModal.slotIndex + createModal.slotSpan - 1
    if (!canPlaceRange(existingBookings, createModal.slotIndex, slotEnd)) {
      setModalError("Selected time range is already occupied.")
      setSavingBooking(false)
      return
    }

    if (selectedType === "OTS") {
      const warningResult = await supabase
        .from("flight_ops_day_warnings")
        .upsert(
          [
            {
              op_date: dateValue,
              aircraft_registry: createModal.registry,
              aircraft_type: createModal.fleetType,
              warning_text: "OUT OF SERVICE",
              created_by: currentUserId,
            },
          ],
          { onConflict: "op_date,aircraft_registry" }
        )

      if (warningResult.error) {
        setModalError(warningResult.error.message)
        setSavingBooking(false)
        return
      }

      await supabase
        .from("flight_ops_assignments")
        .delete()
        .eq("op_date", dateValue)
        .eq("aircraft_registry", createModal.registry)

      setWarningsByRegistry((prev) => ({ ...prev, [createModal.registry]: "OUT OF SERVICE" }))
      setAssignmentsByRegistry((prev) => ({ ...prev, [createModal.registry]: [] }))
      closeCreateModal()
      return
    }

    const insertResult = await supabase.from("flight_ops_assignments").insert([
      {
        op_date: dateValue,
        aircraft_registry: createModal.registry,
        aircraft_type: createModal.fleetType,
        slot_index: createModal.slotIndex,
        slot_span: createModal.slotSpan,
        flight_type: selectedType,
        student_id: student?.id || selectedStudentId,
        instructor_id: instructor?.id || selectedInstructorId,
        created_by: currentUserId,
      },
    ])
    if (insertResult.error) {
      setModalError(insertResult.error.message)
      setSavingBooking(false)
      return
    }

    const nextBooking: Booking = {
      start: createModal.slotIndex,
      span: createModal.slotSpan,
      studentId: student?.id || selectedStudentId,
      instructorId: instructor?.id || selectedInstructorId,
      type: selectedType,
    }
    setAssignmentsByRegistry((prev) => ({
      ...prev,
      [createModal.registry]: [...(prev[createModal.registry] || []), nextBooking].sort((left, right) => left.start - right.start),
    }))

    closeCreateModal()
  }

  const submitWarning = async (event: FormEvent) => {
    event.preventDefault()
    if (!warningModal) return

    const warningText = selectedWarning === "CUSTOM" ? customWarning.trim() : selectedWarning
    if (!warningText) {
      setModalError("Warning text is required.")
      return
    }

    setSavingBooking(true)
    const saveResult = await supabase
      .from("flight_ops_day_warnings")
      .upsert(
        [
          {
            op_date: dateValue,
            aircraft_registry: warningModal.registry,
            aircraft_type: warningModal.fleetType,
            warning_text: warningText,
            created_by: currentUserId,
          },
        ],
        { onConflict: "op_date,aircraft_registry" }
      )
    if (saveResult.error) {
      setModalError(saveResult.error.message)
      setSavingBooking(false)
      return
    }

    await supabase
      .from("flight_ops_assignments")
      .delete()
      .eq("op_date", dateValue)
      .eq("aircraft_registry", warningModal.registry)

    setWarningsByRegistry((prev) => ({ ...prev, [warningModal.registry]: warningText }))
    setAssignmentsByRegistry((prev) => ({ ...prev, [warningModal.registry]: [] }))
    setSavingBooking(false)
    closeWarningModal()
  }

  const startDragSelection = (fleetType: string, registry: string, slotIndex: number, rowMaintenance: string | undefined, bookings: Booking[]) => {
    if (rowMaintenance || isSlotOccupied(bookings, slotIndex)) return
    setDragSelection({ fleetType, registry, start: slotIndex, end: slotIndex })
  }

  const updateDragSelection = (registry: string, slotIndex: number, rowMaintenance: string | undefined, bookings: Booking[]) => {
    if (!dragSelection) return
    if (dragSelection.registry !== registry) return
    if (rowMaintenance) return
    if (!canPlaceRange(bookings, dragSelection.start, slotIndex)) return
    setDragSelection((prev) => (prev ? { ...prev, end: slotIndex } : prev))
  }

  const finalizeDragSelection = (fleetType: string, registry: string, rowMaintenance: string | undefined, bookings: Booking[]) => {
    if (!dragSelection) return
    if (dragSelection.registry !== registry) return
    if (rowMaintenance) {
      setDragSelection(null)
      return
    }
    const start = Math.min(dragSelection.start, dragSelection.end)
    const end = Math.max(dragSelection.start, dragSelection.end)
    if (!canPlaceRange(bookings, start, end)) {
      setDragSelection(null)
      return
    }
    openCreateModal(fleetType, registry, start, end - start + 1)
    setDragSelection(null)
  }

  const clearWarning = () => {
    if (!warningModal) return
    const clearWarningRow = async () => {
      setSavingBooking(true)
      const { error } = await supabase
        .from("flight_ops_day_warnings")
        .delete()
        .eq("op_date", dateValue)
        .eq("aircraft_registry", warningModal.registry)
      if (error) {
        setModalError(error.message)
        setSavingBooking(false)
        return
      }
      setWarningsByRegistry((prev) => {
        const next = { ...prev }
        delete next[warningModal.registry]
        return next
      })
      setSavingBooking(false)
      closeWarningModal()
    }

    clearWarningRow()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Checking Access...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 lg:p-8">
      <div className="max-w-425 mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 lg:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-900 p-2 rounded-lg">
              <Plane className="size-4 text-white -rotate-45" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">Flight Ops Board</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operations Dispatch</p>
              {loadingDayData && <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Syncing schedule...</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setDateValue((d) => addDays(d, -1))} className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center">
              <ChevronLeft size={16} />
            </button>
            <div className="h-9 px-3 rounded-lg border border-slate-200 bg-white flex items-center gap-2 text-sm font-bold text-slate-700">
              <CalendarIcon size={14} className="text-blue-900" />
              {displayDate}
            </div>
            <button onClick={() => setDateValue((d) => addDays(d, 1))} className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center">
              <ChevronRight size={16} />
            </button>
            <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 text-sm" />
            <button
              type="button"
              onClick={handleLogout}
              className="h-9 px-3 rounded-lg border border-slate-300 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100"
            >
              Log Out
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-387.5 border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="w-28 border border-slate-200 px-3 py-2 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Type</th>
                  <th className="w-40 border border-slate-200 px-3 py-2 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Registry</th>
                  {timeSlots.map((t) => (
                    <th key={t} className="min-w-27.5 border border-slate-200 px-2 py-2 text-center text-[11px] font-black uppercase tracking-widest text-slate-600">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flightSchedule.map((group) =>
                  group.rows.map((row, idx) => (
                    <tr key={`${group.type}-${row.registry}`} className="h-17">
                      {idx === 0 && (
                        <td rowSpan={group.rows.length} className="border border-slate-200 bg-slate-50 px-3 py-2 align-middle text-2xl font-black tracking-tight text-slate-700">
                          {group.type}
                        </td>
                      )}

                      <td className="border border-slate-200 px-3 py-2 font-black text-slate-800">
                        <div className="flex items-center justify-between gap-2">
                          <span>{row.registry}</span>
                          <button
                            type="button"
                            onClick={() => openWarningModal(group.type, row.registry)}
                            className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-all"
                            title="Set whole-day warning"
                          >
                            <AlertTriangle size={14} className="mx-auto" />
                          </button>
                        </div>
                      </td>

                      <td colSpan={timeSlots.length} className="border border-slate-200 p-0">
                        {(() => {
                          const combinedBookings = [...(row.bookings || []), ...(assignmentsByRegistry[row.registry] || [])]
                          const rowMaintenance = warningsByRegistry[row.registry] || row.maintenance
                          const dragStart =
                            dragSelection?.registry === row.registry
                              ? Math.min(dragSelection.start, dragSelection.end)
                              : null
                          const dragEnd =
                            dragSelection?.registry === row.registry
                              ? Math.max(dragSelection.start, dragSelection.end)
                              : null

                          return (
                            <div className="relative h-17 grid grid-cols-11 divide-x divide-slate-100">
                          {Array.from({ length: 11 }).map((_, i) => {
                            const isInDragRange =
                              dragSelection?.registry === row.registry &&
                              i >= Math.min(dragSelection.start, dragSelection.end) &&
                              i <= Math.max(dragSelection.start, dragSelection.end)

                            return (
                              <div key={`${row.registry}-${i}`} className="h-full flex items-center justify-center">
                                {!rowMaintenance && !isSlotOccupied(combinedBookings, i) ? (
                                  <button
                                    type="button"
                                    onMouseDown={() => startDragSelection(group.type, row.registry, i, rowMaintenance, combinedBookings)}
                                    onMouseEnter={() => updateDragSelection(row.registry, i, rowMaintenance, combinedBookings)}
                                    onMouseUp={() => finalizeDragSelection(group.type, row.registry, rowMaintenance, combinedBookings)}
                                    className={`h-6 w-6 rounded-full border transition-all ${
                                      isInDragRange
                                        ? "border-blue-900 text-blue-900 bg-blue-100"
                                        : "border-slate-200 text-slate-400 hover:text-blue-900 hover:border-blue-900 hover:bg-blue-50"
                                    }`}
                                    title={`Click or drag from ${timeSlots[i]}`}
                                  >
                                    <Plus size={14} className="mx-auto" />
                                  </button>
                                ) : null}
                              </div>
                            )
                          })}

                          {rowMaintenance ? (
                            <div className="absolute inset-1 rounded-md bg-red-600 text-white flex items-center justify-center gap-2">
                              <AlertTriangle size={14} className="opacity-90" />
                              <span className="text-[11px] font-black uppercase tracking-wider">{rowMaintenance}</span>
                            </div>
                          ) : (
                            <>
                              {dragStart !== null && dragEnd !== null && (
                                <div
                                  className="absolute top-1 bottom-1 rounded-md border border-blue-500/70 bg-blue-200/60 px-2 py-1 pointer-events-none"
                                  style={{
                                    left: `${(dragStart / timeSlots.length) * 100}%`,
                                    width: `${((dragEnd - dragStart + 1) / timeSlots.length) * 100}%`,
                                  }}
                                >
                                  <p className="text-[10px] font-black text-blue-900 leading-tight truncate">
                                    Selecting {dragEnd - dragStart + 1} hour{dragEnd - dragStart + 1 > 1 ? "s" : ""}
                                  </p>
                                </div>
                              )}
                              {combinedBookings.map((b, i) => {
                                const left = (b.start / timeSlots.length) * 100
                                const width = (b.span / timeSlots.length) * 100
                                const typeMeta = flightTypeOptions.find((option) => option.code === b.type)
                                const colorClass = typeMeta?.colorClass || "bg-slate-100 border-slate-300"
                                const studentLabel = studentOptions.find((option) => option.id === b.studentId)?.fullName || b.studentId
                                const instructorLabel = instructorOptions.find((option) => option.id === b.instructorId)?.fullName || b.instructorId

                                return (
                                  <div
                                    key={`${row.registry}-booking-${i}`}
                                    className={`absolute top-1 bottom-1 rounded-md border px-2 py-1 overflow-hidden ${colorClass}`}
                                    style={{ left: `${left}%`, width: `${width}%` }}
                                  >
                                    <p className="text-[10px] font-black leading-tight truncate">{b.type}</p>
                                    <p className="text-[11px] font-bold leading-tight truncate">{studentLabel}</p>
                                    <p className="text-[11px] italic leading-tight truncate">{instructorLabel}</p>
                                  </div>
                                )
                              })}
                            </>
                          )}
                            </div>
                          )
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-200 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">Legend</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-170 border-collapse">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-black bg-violet-100">PS</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-semibold">PRE-SOLO SIMULATOR</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-black bg-teal-100">CF</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-semibold">COMPANY FLIGHT</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-black bg-amber-100">TAXI</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-semibold">TAXI-EXERCISE</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-black bg-rose-100">OTS</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-semibold">OUT OF SERVICE</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-black bg-lime-100">LCL</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-semibold">LOCAL FLIGHT</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-black bg-slate-100">TBD</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-semibold">TO BE DETERMINED</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-black bg-sky-100">XC</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-semibold">CROSS COUNTRY FLIGHT</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-black bg-cyan-100">CT</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-semibold">CROSS TRAINEES</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-black bg-orange-100">IRS</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-semibold">INSTRUMENT SIMULATOR</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-black bg-red-100">UPRT</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-semibold">UPSET PREVENTION AND RECOVERY TRAINING</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-black bg-emerald-100">CAAP</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-semibold">CAAP CHECKRIDE</td>
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-black bg-white" />
                    <td className="border border-slate-300 px-2 py-1 text-[10px] font-semibold" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {createModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Create Assignment</p>
                <h2 className="text-lg font-black text-slate-900">
                  {createModal.fleetType} - {createModal.registry} - {getRangeText(createModal.slotIndex, createModal.slotSpan)}
                </h2>
                <p className="text-[11px] font-semibold text-slate-500">
                  Duration: {createModal.slotSpan} hour{createModal.slotSpan > 1 ? "s" : ""}
                </p>
              </div>
              <button type="button" onClick={closeCreateModal} className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50">
                <X size={14} className="mx-auto" />
              </button>
            </div>

            <form onSubmit={submitCreateBooking} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Student ID</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  required
                >
                  <option value="" disabled>Select student</option>
                  {studentOptions.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.id}{student.fullName ? ` - ${student.fullName}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Instructor ID</label>
                <select
                  value={selectedInstructorId}
                  onChange={(e) => setSelectedInstructorId(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  required
                >
                  <option value="" disabled>Select instructor</option>
                  {instructorOptions.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.id}{instructor.fullName ? ` - ${instructor.fullName}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Flight Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as SlotType)}
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                >
                  {flightTypeOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.code} - {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {modalError && <p className="text-xs font-semibold text-red-600">{modalError}</p>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={closeCreateModal} className="h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBooking}
                  className="h-10 px-4 rounded-lg bg-blue-900 text-white text-sm font-bold disabled:opacity-60"
                >
                  {savingBooking ? "Saving..." : "Add Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {warningModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Whole-Day Warning</p>
                <h2 className="text-lg font-black text-slate-900">
                  {warningModal.fleetType} · {warningModal.registry}
                </h2>
              </div>
              <button type="button" onClick={closeWarningModal} className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50">
                <X size={14} className="mx-auto" />
              </button>
            </div>

            <form onSubmit={submitWarning} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Warning Type</label>
                <select
                  value={selectedWarning}
                  onChange={(e) => setSelectedWarning(e.target.value as (typeof warningOptions)[number])}
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                >
                  {warningOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {selectedWarning === "CUSTOM" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Custom Warning</label>
                  <input
                    value={customWarning}
                    onChange={(e) => setCustomWarning(e.target.value)}
                    placeholder="Enter whole-day warning"
                    className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    required
                  />
                </div>
              )}

              {modalError && <p className="text-xs font-semibold text-red-600">{modalError}</p>}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button type="button" onClick={clearWarning} className="h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold">
                  Clear Warning
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={closeWarningModal} className="h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold">
                    Cancel
                  </button>
                  <button type="submit" className="h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-bold">
                    Save Warning
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
