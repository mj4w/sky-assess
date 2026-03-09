"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils" // Ensure you have this standard shadcn utility

interface Props {
  title: string
  value: string
  sub: string
  variant: "blue" | "red" | "white"
}

export function StatCard({ title, value, sub, variant }: Props) {
  const variants = {
    // Professional Aviation Blue
    blue: "bg-[#1E3A8A] text-white border-transparent shadow-sm",
    // Alert/Action Red
    red: "bg-red-600 text-white border-transparent shadow-sm",
    // Clean White
    white: "bg-white text-slate-900 border-slate-200 shadow-sm"
  }

  const labelColors = {
    blue: "text-blue-200/70",
    red: "text-red-100/70",
    white: "text-slate-400"
  }

  return (
    <Card className={cn(
      "border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 rounded-sm",
      variants[variant]
    )}>
      <CardContent className="p-5 space-y-1.5 relative overflow-hidden">
        {/* Subtle background accent for color cards */}
        {variant !== "white" && (
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8" />
        )}
        
        <p className={cn(
          "text-[10px] font-bold uppercase tracking-[0.2em]",
          labelColors[variant]
        )}>
          {title}
        </p>
        
        <div className="text-3xl font-black tracking-tighter italic uppercase">
          {value}
        </div>
        
        <div className="flex items-center gap-2">
           <div className={cn(
             "h-[1px] w-4", 
             variant === 'white' ? "bg-slate-200" : "bg-white/20"
           )} />
           <p className={cn(
             "text-[9px] font-medium uppercase tracking-wider",
             labelColors[variant]
           )}>
             {sub}
           </p>
        </div>
      </CardContent>
    </Card>
  )
}