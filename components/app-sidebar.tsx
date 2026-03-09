"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  BarChart3, 
  MessageSquare,
  Plane,
  LogOut,
  Settings,
  Loader2,
  Users,
  Calendar,
  FileText,
  Bell
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar"

// Role-based navigation data matching the requirement images
const navConfig = {
  student: [
    { title: "DASHBOARD", url: "/dashboard", icon: LayoutDashboard },
    { title: "MY PERFORMANCE", url: "/dashboard/performance", icon: BarChart3 },
    { title: "FLIGHT RECORDS", url: "/dashboard/records", icon: FileText },
    { title: "TASKS", url: "/dashboard/tasks", icon: ClipboardCheck },
    { title: "NOTIFICATIONS", url: "/dashboard/notifications", icon: Bell },
  ],
  instructor: [
    { title: "DASHBOARD", url: "/dashboard", icon: LayoutDashboard },
    { title: "EVALUATE", url: "/dashboard/evaluate", icon: ClipboardCheck },
    { title: "DEBRIEF PAGE", url: "/dashboard/debrief", icon: MessageSquare },
    { title: "STUDENT PROFILES", url: "/dashboard/profiles", icon: Users },
    { title: "SCHEDULES", url: "/dashboard/schedules", icon: Calendar },
  ]
}

export function AppSidebar({ userRole = 'student', ...props }: { userRole?: 'student' | 'instructor' } & React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = navConfig[userRole]

  return (
    <Sidebar collapsible="icon" className="border-r-4 border-black" {...props}>
      <SidebarHeader className="h-18 bg-[#FFD700] border-b-4 border-black p-4 flex flex-row items-center gap-3">
        <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-red-600 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <Plane className="text-white size-5" />
        </div>
        <div className="flex flex-col justify-center">
          <span className="font-black text-black italic text-base tracking-tighter leading-none">SKYASSESS</span>
          <span className="text-[9px] font-bold text-red-600 uppercase tracking-tighter">WCC AERONAUTICAL</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        <SidebarMenu className="p-3 gap-3">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                tooltip={item.title} 
                asChild
                className="h-11 border-2 border-transparent hover:border-black hover:bg-[#FFD700] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group"
              >
                <a href={item.url} className="flex items-center">
                  <item.icon className="group-hover:text-red-600 transition-colors" />
                  <span className="font-black text-xs italic tracking-widest ml-3">{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="bg-slate-50 border-t-4 border-black p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="hover:bg-slate-200 transition-colors">
              <Settings className="size-4" />
              <span className="font-bold text-xs uppercase">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="text-red-600 hover:bg-red-600 hover:text-white transition-all font-black italic uppercase"
            >
              {isLoggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              <span>{isLoggingOut ? "Ejecting..." : "Log Out"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}