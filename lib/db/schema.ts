import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  jsonb,
  uuid,
  text,
  numeric,
  primaryKey,
  foreignKey,
  boolean,
  customType,
} from 'drizzle-orm/pg-core';

// Define pgVector custom type directly in schema file
// You can also import this from a separate file if you prefer
const pgVectorColumn = (name: string, { dimensions }: { dimensions: number }) => 
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dimensions})`;
    },
  })(name);

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

// I'm going to point to you some variables, tell me if needed or no longer

export type User = InferSelectModel<typeof user>;

// NEW: Data type for Record
export const record = pgTable('Record', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  message: text('message').notNull(),  
  sectionCode: text('sectionCode').notNull(), 
  actionOfficer1: uuid('actionOfficer1').notNull(), 
  actionOfficer2: uuid('actionOfficer2'), 
  creationOfficer: uuid('creationOfficer'), 
  caseType: text('caseType').notNull(), 
  channel: text('channel').notNull(), 
  category: text('category').notNull(), 
  subcategory: text('subcategory'), 
  outcome: text('outcome').notNull().default('Open'), 
  replyDate: timestamp('replyDate'), 
  reply: text('reply'), 
  planningArea: text('planningArea'), 
  location: text('location'),
  locationX: text('locationX'), 
  locationY: text('locationY'), 
  draft: jsonb('draft'),
  summary: text('summary'),
  reasoning: text('reasoning'),
  creationDate: timestamp('creationDate').notNull(), 
  receiveDate: timestamp('receiveDate').notNull(), 
  relevantChunks: jsonb('relevantChunks'),
  relatedEmails: text('relatedEmails').array(),
  evergreen_topics: text('evergreen_topics').array(),
});


export type Record = InferSelectModel<typeof record>;

// NEW: Data type for Email
export const email = pgTable('Email', {
  content: json('content').notNull(),
});

// NEW: Data type for FAQ Chunks
export const faqChunks = pgTable('faq_chunks', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  faq_id: varchar('faq_id', { length: 50 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  section: varchar('section', { length: 100 }).notNull(),
  heading: text('heading').notNull(),
  content: text('content').notNull(),
  embedding: pgVectorColumn('embedding', { dimensions: 153 }), // Vector column is now properly defined
  
});

export type FAQChunk = InferSelectModel<typeof faqChunks>;

export const headline = pgTable(
  'Headlines',
  {
    id: uuid('id').notNull().defaultRandom(),
    title: text('title').notNull(),
    match_percent: numeric('match_percent').notNull(),
    desc: text('desc').notNull(),
    entities: text('entities').notNull(),
    examples: text('examples').notNull(),
    category: text('category').notNull(),
    date_processed: timestamp('date_processed').notNull(),
    type: text('type').notNull()
  }
);

export type Headline = InferSelectModel<typeof headline>;


export const preferencesTable = pgTable(
  'Preferences', // The name of the table
  {
    id: uuid('id').notNull().defaultRandom(), // Unique identifier for the preferences record
    userId: uuid('userId') // Foreign key to link the preferences to a user
      .notNull()
      .references(() => user.id), // Assuming there's a `user` table with `id` as the primary key
    alwaysRetrieveDrafts: boolean('alwaysRetrieveDrafts').notNull().default(false), // User's setting for draft retrieval
    greetings: text('greetings').notNull(), // User's preferred greetings
    closing: text('closing').notNull(), // User's preferred closing message
    name: text('name').notNull(), // User's name
    role: text('role').notNull(), // User's role
    position: text('position').notNull(), // User's position
    department: text('department').notNull(), // User's department
    telephone: text('telephone').notNull(), // User's telephone number
    links: json('links').notNull(), // JSON field to store links
    closingMessage: text('closingMessage').notNull(), // Closing message for the user
    confidentialityMessage: text('confidentialityMessage').notNull(), // Confidentiality message
    createdAt: timestamp('createdAt').notNull(), // Timestamp for when the preferences were created
    updatedAt: timestamp('updatedAt').notNull(), // Timestamp for when the preferences were last updated
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }), // Primary key on `id`
    userRef: foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id], // Foreign key reference to `user` table
    }),
  }),
);

export type Preferences = InferSelectModel<typeof preferencesTable>;

// Add utility function to search FAQ chunks 
export async function searchFAQChunks(db: any, query: string, limit: number = 5) {
  // For now, this is a simple text search
  // In production, you might want to use more advanced search features like full-text search
  
  // This uses a basic LIKE query with the query text
  const searchTerm = `%${query.toLowerCase()}%`;
  
  const results = await db.execute(
    `SELECT * FROM faq_chunks 
     WHERE 
       LOWER(heading) LIKE $1 OR 
       LOWER(content) LIKE $1 OR
       LOWER(category) LIKE $1 OR
       LOWER(section) LIKE $1
     ORDER BY 
       CASE
         WHEN LOWER(heading) LIKE $1 THEN 1
         WHEN LOWER(content) LIKE $1 THEN 2
         ELSE 3
       END
     LIMIT $2`,
    [searchTerm, limit]
  );
  
  return results.rows;
}