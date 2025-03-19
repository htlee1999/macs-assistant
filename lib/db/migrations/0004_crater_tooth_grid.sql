DROP TABLE IF EXISTS "Record"; DROP TABLE IF EXISTS "Headlines"; DROP TABLE IF EXISTS "faq_chunks"; 

CREATE TABLE IF NOT EXISTS "User" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(64) NOT NULL,
  "password" varchar(64)
);

CREATE TABLE IF NOT EXISTS "faq_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "faq_id" varchar(50) NOT NULL,
  "category" varchar(100) NOT NULL, 
  "section" varchar(100) NOT NULL,
  "heading" text NOT NULL,
  "content" text NOT NULL,
  "embedding" vector(768), -- Add vector embedding column
  "created_at" timestamp DEFAULT NOW() NOT NULL
);

-- Create vector search index if it doesn't exist
CREATE INDEX IF NOT EXISTS faq_chunks_embedding_idx ON "faq_chunks" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create the "record" table (lowercase to match your code)
CREATE TABLE IF NOT EXISTS "Record" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message" text NOT NULL, -- Renamed from case_description
  "sectionCode" text NOT NULL, -- Renamed from section_code
  "actionOfficer1" uuid NOT NULL, -- Changed to camelCase
  "actionOfficer2" uuid,
  "creationOfficer" uuid,
  "caseType" text NOT NULL, -- Renamed from case_type_descr
  "channel" text NOT NULL, -- Renamed from channel_descr
  "category" text NOT NULL, -- Renamed from business_descr
  "subcategory" text, -- Renamed from detailed_business_descr
  "outcome" text NOT NULL DEFAULT 'Open', -- Renamed from decision_descr
  "replyDate" timestamp, -- Renamed from final_reply_date_time
  "reply" text, -- Renamed from reply_content
  "planningArea" text, -- Renamed from planning_area_descr
  "location" text,
  "locationX" text,
  "locationY" text,
  "draft" jsonb,
  "summary" text,
  "reasoning" text,
  "creationDate" timestamp NOT NULL, -- Renamed from creation_date_time
  "receiveDate" timestamp NOT NULL, -- Renamed from receive_date_time
  "relevantChunks" jsonb,
  "relatedEmails" text[],
  "evergreen_topics" text[]
);

-- Add foreign key constraint for userId
DO $$ BEGIN
  ALTER TABLE "record"
   ADD CONSTRAINT "record_actionOfficer1_User_id_fk"
   FOREIGN KEY ("actionOfficer1") REFERENCES "public"."User"("id")
   ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create the "headline" table (lowercase to match your code)
CREATE TABLE IF NOT EXISTS "Headline" (
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
CREATE EXTENSION IF NOT EXISTS vector;