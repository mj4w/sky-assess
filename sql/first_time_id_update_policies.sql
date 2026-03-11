-- Allow first-time ID setup/update from dashboard modal
-- for instructor_info and student_info under RLS.

ALTER TABLE instructor_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instructor first-time id update" ON instructor_info;
CREATE POLICY "instructor first-time id update"
ON instructor_info
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'instructor'
      AND (
        COALESCE(profiles.login_first_time, false) = false
        OR lower(COALESCE(profiles.instructor_id, '')) = lower(COALESCE(instructor_info.instructor_id, ''))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'instructor'
  )
);

DROP POLICY IF EXISTS "instructor first-time id insert" ON instructor_info;
CREATE POLICY "instructor first-time id insert"
ON instructor_info
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'instructor'
      AND COALESCE(profiles.login_first_time, false) = false
  )
);

DROP POLICY IF EXISTS "student first-time id update" ON student_info;
CREATE POLICY "student first-time id update"
ON student_info
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
      AND (
        COALESCE(profiles.login_first_time, false) = false
        OR lower(COALESCE(profiles.student_id, '')) = lower(COALESCE(student_info.student_id, ''))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
  )
);

DROP POLICY IF EXISTS "student first-time id insert" ON student_info;
CREATE POLICY "student first-time id insert"
ON student_info
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
      AND COALESCE(profiles.login_first_time, false) = false
  )
);
