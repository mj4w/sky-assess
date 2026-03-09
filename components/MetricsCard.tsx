"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, ShieldCheck } from "lucide-react"

interface Props {
  role: string
}

export function MetricsCard({ role }: Props) {
  return (
    <Card className="border-4 border-black shadow-none bg-white">
      <CardHeader className="border-b-4 border-black flex flex-row items-center justify-between bg-slate-50 py-3">
        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="h-3 w-3 text-red-600" />
          Performance Metrics
        </CardTitle>
        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
          <ShieldCheck className="h-3 w-3" /> RA 10173 Protected
        </div>
      </CardHeader>
      <CardContent className="h-64 flex items-center justify-center border-dashed border-2 border-slate-100 m-4 rounded-lg bg-slate-50/30">
        <p className="text-[10px] font-black uppercase text-slate-300 italic tracking-widest">
          Visualization Active for {role}
        </p>
      </CardContent>
    </Card>
  )
}