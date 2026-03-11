-- Allow multiple evaluations per instructor within the same month.
-- Keep evaluation volume controlled by UI "remaining evaluations" logic tied to daily schedules.

DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'student_instructor_feedback'::regclass
      AND contype = 'u'
      AND conname IN (
        'student_instructor_feedback_student_id_instructor_id_eval_month_key',
        'sif_student_instructor_eval_month_key',
        'uq_student_instructor_month'
      )
  LOOP
    EXECUTE format('ALTER TABLE student_instructor_feedback DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS student_instructor_feedback_student_id_instructor_id_eval_month_key;
DROP INDEX IF EXISTS sif_student_instructor_eval_month_key;
