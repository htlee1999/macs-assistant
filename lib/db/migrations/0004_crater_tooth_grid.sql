-- DROP TABLE IF EXISTS "Record";
DROP TABLE IF EXISTS "Headlines";

CREATE TABLE IF NOT EXISTS "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(64) NOT NULL,
	"password" varchar(64)
);

-- Create the "Record" table
CREATE TABLE IF NOT EXISTS "Record" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "case_description" text NOT NULL,
  "section_code" text NOT NULL,
  "action_officer1" uuid NOT NULL,
  "action_officer2" uuid,
  "creation_officer" uuid,
  "case_type_descr" text NOT NULL,
  "channel_descr" text NOT NULL,
  "business_descr" text NOT NULL,
  "detailed_business_descr" text,
  "decision_descr" text,
  "final_reply_date_time" timestamp,
  "reply_content" text,
  "planning_area_descr" text,
  "location" text,
  "location_x" text,
  "location_y" text,
  "draft" jsonb,
  "summary" text,
  "reasoning" text,
  "creation_date_time" timestamp NOT NULL,
  "receive_date_time" timestamp NOT NULL
);

-- Add foreign key constraint for userId (assuming "User" table exists)
DO $$ BEGIN
  ALTER TABLE "Record" 
  ADD CONSTRAINT "Record_actionofficer1_User_id_fk" 
  FOREIGN KEY ("action_officer1") REFERENCES "public"."User"("id") 
  ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Record" ADD COLUMN "relevantChunks" jsonb;
ALTER TABLE "Record" ADD COLUMN "relatedEmails" text; 
ALTER TABLE "Record" ADD COLUMN "evergreen_topics" text;

CREATE TABLE IF NOT EXISTS "Headlines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "match_percent" text NOT NULL,
  "desc" text NOT NULL,
  "entities" text NOT NULL,
  "examples" text NOT NULL,
  "category" text NOT NULL,
  "date_processed" timestamp NOT NULL,
  "type" text NOT NULL
);

-- Create the Preferences table
CREATE TABLE IF NOT EXISTS "Preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, 
  "userId" uuid NOT NULL,  
  "alwaysRetrieveDrafts" boolean NOT NULL DEFAULT false,  
  "greetings" text NOT NULL, 
  "closing" text NOT NULL, 
  "name" text NOT NULL, 
  "role" text NOT NULL,  
  "position" text NOT NULL,  
  "department" text NOT NULL,  
  "telephone" text NOT NULL,  
  "links" jsonb NOT NULL,  
  "closingMessage" text NOT NULL,  
  "confidentialityMessage" text NOT NULL,  
  "createdAt" timestamp NOT NULL,  
  "updatedAt" timestamp NOT NULL  
);

DO $$ BEGIN
  ALTER TABLE "Preferences" 
  ADD CONSTRAINT "Preferences_userId_User_id_fk" 
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_userId ON "Preferences"("userId");
