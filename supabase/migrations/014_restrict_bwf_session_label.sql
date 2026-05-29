-- Prevent renaming sessions:
--   • only admins can change the label column at all
--   • nobody can change the label on a BWF-linked session

CREATE OR REPLACE FUNCTION restrict_bwf_session_label()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.label IS DISTINCT FROM OLD.label THEN
    IF NOT is_admin() THEN
      RAISE EXCEPTION 'Only admins can rename sessions.';
    END IF;
    IF OLD.bwf_tournament_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot rename a session that is linked to a BWF tournament.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_bwf_session_label ON sessions;

CREATE TRIGGER trg_restrict_bwf_session_label
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION restrict_bwf_session_label();
