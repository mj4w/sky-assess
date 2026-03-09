export interface Pilot {
  today_count: string
  pending_count: string
  id: string
  email: string
  role: 'student' | 'instructor' | 'admin'
  full_name?: string | null
  instructor_id?: string | null
  student_id?: string | null
  total_hours?: string
  last_eval?: number
  next_flight?: string
  phase?: string
}
