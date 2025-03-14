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
} from 'drizzle-orm/pg-core';

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
  message: text('case_description').notNull(),  
  sectionCode: text('section_code').notNull(),
  actionOfficer1: uuid('action_officer1'),          
  actionOfficer2: uuid('action_officer2'),
  creationOfficer: uuid('creation_officer'),
  caseType: text('case_type_descr').notNull(),
  channel: text('channel_descr').notNull(),
  category: text('business_descr').notNull(),
  subcategory: text('detailed_business_descr'),
  outcome: text('decision_descr').notNull(),
  replyDate: timestamp('final_reply_date_time'),
  reply: text('reply_content'),
  planningArea: text('planning_area_descr'),
  location: text('location'),
  locationX: text('location_x'),
  locationY: text('location_y'),
  creationDate: timestamp('creation_date_time').notNull(),
  receiveDate: timestamp('receive_date_time').notNull(),
  draft: jsonb('draft'),
  summary: text('summary'),
  evergreen_topics: text('evergreen_topics').array(),
  reasoning: text('reasoning'),
  relevantChunks: jsonb('relevantChunks'), 
  relatedEmails: text('relatedEmails').array(),  
});


export type Record = InferSelectModel<typeof record>;

// NEW: Data type for Email
export const email = pgTable('Email', {
  content: json('content').notNull(),
}
)

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
