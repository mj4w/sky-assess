"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronRight, X } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  assignmentId?: string
}

const debriefCourses = [
  { code: "PPL", name: "Private Pilot License", color: "bg-blue-600" },
  { code: "CPL", name: "Commercial Pilot License", color: "bg-emerald-600" },
  { code: "IR", name: "Instrument Rating", color: "bg-orange-600" },
  { code: "ME", name: "Multi-Engine Rating", color: "bg-purple-600" },
]

export function DebriefCourseModal({ open, onClose, assignmentId }: Props) {
  if (!open) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="p-8 space-y-6">

          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 italic uppercase">
                Select Course
              </h3>
              <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-black">
                Debriefing Terminal
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid gap-3">

            {debriefCourses.map((course) => {
              const assignmentQuery = assignmentId ? `?assignment_id=${encodeURIComponent(assignmentId)}` : ""
              return (
              <Link
                key={course.code}
                href={`/dashboard/debrief/${course.code.toLowerCase()}${assignmentQuery}`}
                onClick={onClose}
                className="group flex items-center justify-between p-5 rounded-2xl border border-slate-100 hover:border-blue-900 hover:bg-blue-50/30 transition-all"
              >

                <div className="flex items-center gap-4">

                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs ${course.color}`}>
                    {course.code}
                  </div>

                  <div>
                    <p className="font-bold text-slate-900 text-sm">
                      {course.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Click to view session logs
                    </p>
                  </div>

                </div>

                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-900" />

              </Link>
              )
            })}

          </div>
        </div>

        <div className="bg-slate-50 p-4 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            WCC Aeronautical & Technological College • Flight Operations
          </p>
        </div>

      </motion.div>
    </motion.div>
  )
}
