-- Adds per-item detailed rating columns (1-4 scale arrays) for instructor evaluation
ALTER TABLE student_instructor_feedback
ADD COLUMN IF NOT EXISTS attr_instructional_planning_details JSONB NOT NULL DEFAULT '[3,3,3,3,3,3,3]'::jsonb,
ADD COLUMN IF NOT EXISTS attr_pedagogical_competence_details JSONB NOT NULL DEFAULT '[3,3,3,3,3,3,3]'::jsonb,
ADD COLUMN IF NOT EXISTS attr_training_policy_details JSONB NOT NULL DEFAULT '[3,3,3,3,3,3,3]'::jsonb,
ADD COLUMN IF NOT EXISTS attr_tech_adaptability_details JSONB NOT NULL DEFAULT '[3,3,3,3,3,3,3]'::jsonb,
ADD COLUMN IF NOT EXISTS attr_professional_development_details JSONB NOT NULL DEFAULT '[3,3,3,3,3,3,3]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sif_instructional_planning_details_len_chk') THEN
    ALTER TABLE student_instructor_feedback
    ADD CONSTRAINT sif_instructional_planning_details_len_chk
    CHECK (jsonb_typeof(attr_instructional_planning_details) = 'array' AND jsonb_array_length(attr_instructional_planning_details) = 7);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sif_pedagogical_competence_details_len_chk') THEN
    ALTER TABLE student_instructor_feedback
    ADD CONSTRAINT sif_pedagogical_competence_details_len_chk
    CHECK (jsonb_typeof(attr_pedagogical_competence_details) = 'array' AND jsonb_array_length(attr_pedagogical_competence_details) = 7);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sif_training_policy_details_len_chk') THEN
    ALTER TABLE student_instructor_feedback
    ADD CONSTRAINT sif_training_policy_details_len_chk
    CHECK (jsonb_typeof(attr_training_policy_details) = 'array' AND jsonb_array_length(attr_training_policy_details) = 7);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sif_tech_adaptability_details_len_chk') THEN
    ALTER TABLE student_instructor_feedback
    ADD CONSTRAINT sif_tech_adaptability_details_len_chk
    CHECK (jsonb_typeof(attr_tech_adaptability_details) = 'array' AND jsonb_array_length(attr_tech_adaptability_details) = 7);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sif_professional_development_details_len_chk') THEN
    ALTER TABLE student_instructor_feedback
    ADD CONSTRAINT sif_professional_development_details_len_chk
    CHECK (jsonb_typeof(attr_professional_development_details) = 'array' AND jsonb_array_length(attr_professional_development_details) = 7);
  END IF;
END $$;
