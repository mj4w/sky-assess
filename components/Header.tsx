"use client"

import { Pilot } from ".././app/dashboard/types/pilot"

interface Props {
  pilotData: Pilot
  role: string
  id: string
}

export function Header({ pilotData, role, id }: Props) {
  const displayId = pilotData?.role === "instructor" ? pilotData?.instructor_id : pilotData?.student_id
  const displayName = pilotData?.full_name || displayId || "N/A"

  return (
    <div className="flex flex-col gap-1 border-b-2 border-black pb-4">
      <div className="flex items-center gap-2">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter">{role} Command</h2>
        <span className="bg-black text-white text-[8px] px-2 py-0.5 font-black uppercase rounded-full">
          ID: {id.slice(0,8)}...
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Pilot: {displayName} | {pilotData?.role === "instructor" ? "Commanding Officer" : "Cadet"}
        </p>
      </div>
    </div>
  )
}
