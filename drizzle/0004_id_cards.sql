ALTER TABLE "user" ADD COLUMN "blood_group" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "member_code" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "verify_token" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_member_code_unique" UNIQUE("member_code");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_verify_token_unique" UNIQUE("verify_token");--> statement-breakpoint
-- Member IDs (BBA-<year>-<seq>) are issued by the database the first time an
-- account becomes active, so every path that activates someone (inbox approval,
-- re-activation, promotion, admin creation, renewals, seed) gets one without
-- having to remember to. The ID never changes afterwards. verify_token is the
-- unguessable secret in the ID card's QR link; setting it to NULL (card reissue)
-- makes the trigger mint a new one, which invalidates the old card.
CREATE SEQUENCE IF NOT EXISTS "member_code_seq";--> statement-breakpoint
CREATE OR REPLACE FUNCTION "issue_member_code"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.member_code IS NOT NULL THEN
    NEW.member_code := OLD.member_code;
  END IF;
  IF NEW.status = 'active' AND NEW.member_code IS NULL THEN
    NEW.member_code := 'BBA-' || to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYY') || '-' || lpad(nextval('member_code_seq')::text, 5, '0');
  END IF;
  IF NEW.member_code IS NOT NULL AND NEW.verify_token IS NULL THEN
    NEW.verify_token := replace(gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "user_issue_member_code"
  BEFORE INSERT OR UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION "issue_member_code"();--> statement-breakpoint
-- Backfill everyone already approved: active members, and inactive members who
-- once held a membership (approved, then lapsed). Numbered in approval order,
-- with the year each was approved.
WITH approved AS (
  SELECT u.id,
         coalesce(u.status_updated_at, u.created_at) AS approved_at,
         row_number() OVER (ORDER BY coalesce(u.status_updated_at, u.created_at), u.created_at, u.id) AS n
  FROM "user" u
  WHERE u.member_code IS NULL
    AND (u.status = 'active' OR (u.status = 'inactive' AND EXISTS (SELECT 1 FROM "memberships" m WHERE m.user_id = u.id)))
)
UPDATE "user" u
SET member_code = 'BBA-' || to_char(a.approved_at AT TIME ZONE 'Asia/Kolkata', 'YYYY') || '-' || lpad(a.n::text, 5, '0'),
    verify_token = replace(gen_random_uuid()::text, '-', '')
FROM approved a
WHERE u.id = a.id;--> statement-breakpoint
SELECT setval('member_code_seq', greatest((SELECT count(*) FROM "user" WHERE member_code IS NOT NULL), 1), (SELECT count(*) FROM "user" WHERE member_code IS NOT NULL) > 0);
