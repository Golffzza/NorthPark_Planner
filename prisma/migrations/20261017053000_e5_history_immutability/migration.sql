-- E5.5 append-only audit and revision history.
-- New migration: do not change the already-applied E5.4 migration.
CREATE FUNCTION "reject_e5_evidence_history_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'E5_EVIDENCE_HISTORY_IMMUTABLE'
    USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER "e5_audit_immutable_rows"
BEFORE UPDATE OR DELETE ON "ParkEvidenceAuditEvent"
FOR EACH ROW EXECUTE FUNCTION "reject_e5_evidence_history_mutation"();

CREATE TRIGGER "e5_revision_immutable_rows"
BEFORE UPDATE OR DELETE ON "ParkEvidenceRevision"
FOR EACH ROW EXECUTE FUNCTION "reject_e5_evidence_history_mutation"();

CREATE TRIGGER "e5_audit_no_truncate"
BEFORE TRUNCATE ON "ParkEvidenceAuditEvent"
FOR EACH STATEMENT EXECUTE FUNCTION "reject_e5_evidence_history_mutation"();

CREATE TRIGGER "e5_revision_no_truncate"
BEFORE TRUNCATE ON "ParkEvidenceRevision"
FOR EACH STATEMENT EXECUTE FUNCTION "reject_e5_evidence_history_mutation"();
