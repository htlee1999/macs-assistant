DROP TABLE IF EXISTS "Record"; 
DROP TABLE IF EXISTS "Headlines"; 
DROP TABLE IF EXISTS "faq_chunks"; 

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(64) NOT NULL,
	"password" varchar(64)
);

-- Create the "Record" table
CREATE TABLE IF NOT EXISTS "Record" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message" text NOT NULL,
  "sectionCode" text NOT NULL,
  "actionOfficer1" uuid NOT NULL,
  "actionOfficer2" uuid,
  "creationOfficer" uuid,
  "caseType" text NOT NULL,
  "channel" text NOT NULL,
  "category" text NOT NULL,
  "subcategory" text,
  "outcome" text NOT NULL,
  "replyDate" timestamp,
  "reply" text,
  "planningArea" text,
  "location" text,
  "locationX" text,
  "locationY" text,
  "draft" jsonb,
  "summary" text,
  "reasoning" text,
  "creationDate" timestamp NOT NULL,
  "receiveDate" timestamp NOT NULL,
  "relevantChunks" jsonb,
  "relatedEmails" text,
  "evergreenTopics" text
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
  "type" text NOT NULL, 
  "topic" text,
  "score" text
);

-- Create the "preferences" table (lowercase to match your code)
CREATE TABLE IF NOT EXISTS "preferences" (
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
  ALTER TABLE "preferences"
   ADD CONSTRAINT "preferences_userId_User_id_fk"
   FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
   ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_userId ON "preferences"("userId");

-- Create pgvector extension if it doesn't exist
