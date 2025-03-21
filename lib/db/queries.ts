import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { desc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { JSONContent } from 'novel';
import { randomUUID } from 'crypto';
import { embed } from 'ai';
import { generateEmbedding } from '../ai/custom-embedding-model';

import {
  user,
  record, // NEWLY ADDED
  type User,
  headline,
  preferencesTable,
  faqChunks,
  type FAQChunk,
} from './schema';
import { generateMultipleCustomerMessages } from './randomGenerator';
import { select } from 'ts-pattern';
import { Description } from '@radix-ui/react-dialog';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.

// Near the top of your queries.ts file
console.log("Database URL available:", !!process.env.POSTGRES_URL);
console.log("Database URL partial:", process.env.POSTGRES_URL?.substring(0, 10) + "...");

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);



interface DatabaseRecord {
  id: string;
  message: string;
  sectionCode: string;
  actionOfficer1: string;
  actionOfficer2: string | null;
  creationOfficer: string | null;
  caseType: string;
  channel: string;
  category: string;
  subcategory: string | null;
  outcome: string;
  replyDate: Date | null;
  reply: string | null;
  planningArea: string | null;
  location: string | null;
  locationX: string | null;
  locationY: string | null;
  creationDate: Date;
  receiveDate: Date;
  draft: object | null;
  summary: string | null;
  evergreen_topics: string[] | null;
  reasoning: string | null;
  relevantChunks: FAQChunk[] | null;
  relatedEmails: string[] | null;
}

export async function getUser(email: string): Promise<Array<User>> {
  try {
    console.log('Getting user from database:', email);
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    console.log('Creating user in database:', email);
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

// Function to delete a draft by record ID
export async function deleteDraftById({ recordId }: { recordId: string }) {
  try {
    console.log('Deleting draft for recordId:', recordId);
    
    // Update the record to set the draft to null/empty
    await db.update(record)
      .set({ draft: null, outcome: "Open" })
      .where(eq(record.id, recordId));
    
    console.log('Draft deleted successfully');
    
    return { 
      success: true, 
      message: "Draft deleted successfully" 
    };
  } catch (error) {
    console.error('Failed to delete record\'s draft:', error);
    throw error;
  }
}

export async function saveRecordsByUserId({ id, samples }: { id: string, samples: number }) {
  try {
    // Get customer messages
    const customerMessages = await generateMultipleCustomerMessages(samples);

    // Loop through each message and create a record
    for (let i = 0; i < customerMessages.length; i++) {
      const msgData = customerMessages[i];
      
      // Create a record with fields that match your schema exactly
      // Note: 'message' is required, NOT 'case_description'
      const recordValues = {
        message: msgData.message, // This is the correct field name required by your schema
        sectionCode: ['CX', 'QA', 'NU', 'MK', 'OP', 'PR'][Math.floor(Math.random() * 6)],
        actionOfficer1: id,
        actionOfficer2: Math.random() > 0.7 ? `officer-${Math.random().toString(36).substring(2, 8)}` : null,
        creationOfficer: id,
        caseType: ['Inquiry', 'Complaint', 'Feedback', 'Question'][Math.floor(Math.random() * 4)],
        channel: ['Email', 'Web Form', 'Mobile App', 'Social Media', 'Call Center'][Math.floor(Math.random() * 5)],
        category: msgData.category,
        subcategory: msgData.section,
        outcome: 'Open',
        replyDate: null,
        reply: null,
        planningArea: ['North Region', 'South Region', 'East Region', 'West Region', 'Central Region'][Math.floor(Math.random() * 5)],
        location: ['North Region', 'South Region', 'East Region', 'West Region', 'Central Region'][Math.floor(Math.random() * 5)],
        locationX: null,
        locationY: null,
        creationDate: new Date(),
        receiveDate: new Date(Date.now() - Math.floor(Math.random() * 12) * 60 * 60 * 1000),
        draft: null,
        summary: null,
        reasoning: null,
        evergreen_topics: [msgData.category, msgData.section],
        relevantChunks: JSON.stringify([]),
        relatedEmails: []
      };

      // Try inserting the record
      try {
        await db.insert(record).values(recordValues);
        console.log(`Successfully inserted record ${i+1}/${customerMessages.length}`);
      } catch (insertError) {
        console.error(`Error inserting record ${i+1}:`, insertError);
      }
    }
    
    console.log('Record insertion process completed');
  } catch (error) {
    console.error('Failed to process records:', error);
    throw error;
  }
}

export async function insertDocument({
  relevantChunks,
  recordId,
  topMatches
}: {
  relevantChunks: FAQChunk[];
  recordId: string;
  topMatches: Array<string>;
}) {
  try {
    // First, get the record to ensure it exists
    const [existingRecord] = await db
      .select()
      .from(record)
      .where(eq(record.id, recordId));

    if (!existingRecord) {
      throw new Error(`Record with id ${recordId} not found`);
    }

    // Update the record with the relevant chunks and related emails
    await db
      .update(record)
      .set({
        relevantChunks: JSON.stringify(relevantChunks), // Ensure it's a stringified JSON array
        relatedEmails: topMatches // Ensure it's a stringified JSON array
      })
      .where(eq(record.id, recordId));
  } catch (error) {
    console.error('Failed to insert document chunks:', error);
    throw error;
  }
}


//This will in the future retrieve all records by UserID
export async function getRecordsByUserId({ id }: { id: string }): Promise<DatabaseRecord[]> {
  try {
    let records = await db
      .select()
      .from(record)
      .where(eq(record.actionOfficer1, id))
      .orderBy(desc(record.creationDate));

    if (records.length === 0) {
      console.log('No records found, saving new records...');
      await saveRecordsByUserId({ id, samples: 20 });
      records = await db
        .select()
        .from(record)
        .where(eq(record.actionOfficer1, id))
        .orderBy(desc(record.creationDate));
    }

    // Convert records to properly typed DatabaseRecords
    return records.map((rawRecord): DatabaseRecord => ({
      id: rawRecord.id,
      message: rawRecord.message,
      sectionCode: rawRecord.sectionCode,
      actionOfficer1: rawRecord.actionOfficer1 || '-',
      actionOfficer2: rawRecord.actionOfficer2,
      creationOfficer: rawRecord.creationOfficer,
      caseType: rawRecord.caseType,
      channel: rawRecord.channel,
      category: rawRecord.category,
      subcategory: rawRecord.subcategory,
      outcome: rawRecord.outcome,
      replyDate: rawRecord.replyDate,
      reply: rawRecord.reply,
      planningArea: rawRecord.planningArea,
      location: rawRecord.location,
      locationX: rawRecord.locationX,
      locationY: rawRecord.locationY,
      creationDate: rawRecord.creationDate,
      receiveDate: rawRecord.receiveDate,
      draft: rawRecord.draft as JSONContent || null,
      summary: rawRecord.summary,
      evergreen_topics: Array.isArray(rawRecord.evergreen_topics) 
      ? rawRecord.evergreen_topics 
      : [],
      reasoning:rawRecord.reasoning,
      relevantChunks: Array.isArray(rawRecord.relevantChunks) 
      ? rawRecord.relevantChunks 
      : [],
      relatedEmails: Array.isArray(rawRecord.relatedEmails) 
      ? rawRecord.relatedEmails
      : []
    }));
  } catch (error) {
    console.error('Failed to get records by user from database', error);
    throw error;
  }
}

export async function getAllRecords(): Promise<DatabaseRecord[]> {
  try {
    let records = await db
      .select()
      .from(record)
      .orderBy(desc(record.creationDate));

    if (records.length === 0) {
      console.log('No records found.');
      return [];
    }

    // Convert records to properly typed DatabaseRecords
    return records.map((rawRecord): DatabaseRecord => ({
      id: rawRecord.id,
      message: rawRecord.message,
      sectionCode: rawRecord.sectionCode,
      actionOfficer1: rawRecord.actionOfficer1 || '-',
      actionOfficer2: rawRecord.actionOfficer2,
      creationOfficer: rawRecord.creationOfficer,
      caseType: rawRecord.caseType,
      channel: rawRecord.channel,
      category: rawRecord.category,
      subcategory: rawRecord.subcategory,
      outcome: rawRecord.outcome,
      replyDate: rawRecord.replyDate,
      reply: rawRecord.reply,
      planningArea: rawRecord.planningArea,
      location: rawRecord.location,
      locationX: rawRecord.locationX,
      locationY: rawRecord.locationY,
      creationDate: rawRecord.creationDate,
      receiveDate: rawRecord.receiveDate,
      draft: rawRecord.draft as JSONContent || null,
      summary: rawRecord.summary,
      evergreen_topics: Array.isArray(rawRecord.evergreen_topics) 
      ? rawRecord.evergreen_topics 
      : [],
      reasoning: rawRecord.reasoning,
      relevantChunks: Array.isArray(rawRecord.relevantChunks) 
        ? rawRecord.relevantChunks 
        : [],
      relatedEmails: Array.isArray(rawRecord.relatedEmails) 
        ? rawRecord.relatedEmails
        : []
    }));
  } catch (error) {
    console.error('Failed to get all records from database', error);
    throw error;
  }
}

export async function getRecordById({ id }: { id: string }): Promise<DatabaseRecord | null> {
  try {
    const records = await db.select().from(record).where(eq(record.id, id));
    if (!records.length) return null;

    // Cast the raw record and handle type conversions
    const selectedRecord = records[0];

    // Create a properly typed record with new parameters
    const chosenRecord: DatabaseRecord = {
      id: selectedRecord.id,
      message: selectedRecord.message,
      sectionCode: selectedRecord.sectionCode,
      actionOfficer1: selectedRecord.actionOfficer1 || '-',
      actionOfficer2: selectedRecord.actionOfficer2,
      creationOfficer: selectedRecord.creationOfficer,
      caseType: selectedRecord.caseType,
      channel: selectedRecord.channel,
      category: selectedRecord.category,
      subcategory: selectedRecord.subcategory,
      outcome: selectedRecord.outcome,
      replyDate: selectedRecord.replyDate,
      reply: selectedRecord.reply,
      planningArea: selectedRecord.planningArea,
      location: selectedRecord.location,
      locationX: selectedRecord.locationX,
      locationY: selectedRecord.locationY,
      creationDate: selectedRecord.creationDate,
      receiveDate: selectedRecord.receiveDate,
      draft: selectedRecord.draft as JSONContent || null,
      summary: selectedRecord.summary,
      evergreen_topics: Array.isArray(selectedRecord.evergreen_topics) 
        ? selectedRecord.evergreen_topics 
        : [],
      reasoning: selectedRecord.reasoning,
      relevantChunks: Array.isArray(selectedRecord.relevantChunks) 
        ? selectedRecord.relevantChunks 
        : [],
      relatedEmails: Array.isArray(selectedRecord.relatedEmails)
        ? selectedRecord.relatedEmails
        : [],
    };

    // Parse the draft if it exists and is a string
    if (chosenRecord.draft) {
      if (typeof chosenRecord.draft === 'string') {
        try {
          chosenRecord.draft = JSON.parse(chosenRecord.draft);
        } catch (e) {
          console.error('Error parsing draft from database:', e);
          chosenRecord.draft = null;
        }
      } else {
        chosenRecord.draft = chosenRecord.draft as JSONContent;
      }
    }

    return chosenRecord;
  } catch (error) {
    console.error('Failed to get record by id from database');
    throw error;
  }
}

export async function saveDraftAndReasoning({ 
  recordId, 
  reasoning,
  draft
}: { 
  recordId: string;
  reasoning?: string;
  draft?: JSONContent;
}) {
  try {
    // First check if the record exists
    const [existingRecord] = await db
      .select()
      .from(record)
      .where(eq(record.id, recordId));

    if (!existingRecord) {
      throw new Error(`Record with id ${recordId} not found`);
    }

    // Prepare the update data based on what was provided
    const updateData: any = {};
    
    if (reasoning !== undefined) {
      updateData.reasoning = reasoning;
    }
    
    if (draft !== undefined) {
      updateData.draft = JSON.stringify(draft);
      updateData.outcome = "Draft";
    }

    // Only proceed with update if we have data to update
    if (Object.keys(updateData).length > 0) {
      await db
        .update(record)
        .set(updateData)
        .where(eq(record.id, recordId));
      
      console.log('Record updated successfully with draft and/or reasoning.');
    }

    // Return a success response
    return { 
      success: true, 
      message: "Record updated successfully",
      updatedFields: Object.keys(updateData)
    };
  } catch (error) {
    console.error('Failed to update record:', error);
    throw error;
  }
}

export async function createDraftById({ recordId, draft }: { recordId: string, draft: JSONContent }) {
  try {
    console.log('Updating draft for recordId:', recordId);
    
    // Perform the update operation
    await db.update(record)
      .set({ draft: JSON.stringify(draft), outcome: "Draft" })
      .where(eq(record.id, recordId));  // Ensure eq is imported correctly
    
    console.log('Draft updated successfully.');
    
    // Return a success message or any relevant data after the update
    return { success: true, message: "Draft updated successfully" };  // Return a result
  } catch (error) {
    console.error('Failed to update record\'s draft:', error);
    throw error;  // Throw the error so it can be caught in the POST handler
  }
}

export async function updateDraftById({ recordId, draft }: { recordId: string, draft: JSONContent }) {
  try {
    console.log('Updating draft for recordId:', recordId);
    
    // Perform the update operation
    await db.update(record)
      .set({ draft: JSON.stringify(draft)})
      .where(eq(record.id, recordId));  // Ensure eq is imported correctly
    
    console.log('Draft updated successfully.');
    
    // Return a success message or any relevant data after the update
    return { success: true, message: "Draft updated successfully" };  // Return a result
  } catch (error) {
    console.error('Failed to update record\'s draft:', error);
    throw error;  // Throw the error so it can be caught in the POST handler
  }
}

export async function updateRecordTopics({ recordId, evergreen_topics }: { recordId: string, evergreen_topics: string[] }) {
  try {
    console.log('Updating topics for recordId:', recordId);
    
    // Perform the update operation
    await db.update(record)
      .set({ evergreen_topics })  // Store evergreen_topics as a list
      .where(eq(record.id, recordId));  // Ensure eq is imported correctly

    console.log('Topics updated successfully.'); 
    
    // Return a success message or any relevant data after the update
    return { success: true, message: "Topics updated successfully" };
  } catch (error) {
    console.error('Failed to update record\'s evergreen topics:', error);
    throw error;  // Throw the error so it can be caught in the handler
  }
}

export async function updateRecordSummary({ recordId, summary }: { recordId: string, summary: string }) {
  try {
    console.log('Updating summary for recordId:', recordId);
    
    // Perform the update operation
    await db.update(record)
      .set({ summary: JSON.stringify(summary) })
      .where(eq(record.id, recordId));  // Ensure eq is imported correctly
    
    console.log('Summary updated successfully.');
    
    // Return a success message or any relevant data after the update
    return { success: true, message: "Summary updated successfully" };  // Return a result
  } catch (error) {
    console.error('Failed to update record\'s summary:', error);
    throw error;  // Throw the error so it can be caught in the POST handler
  }
}

export async function saveHeadlines(newHeadlines: {
  title: string;
  match_percent: string;
  desc: string;
  entities: string;
  examples: string;
  category: string;
  date_processed: Date;
  type: string;
}[]) {
  try {
    // Delete all existing headlines
    await db.delete(headline);

    // Insert new headlines
    await db.insert(headline).values(newHeadlines);

    return { message: 'Headlines saved successfully' };
  } catch (error) {
    throw error;
  }
}

export async function getHeadlines() {
  try {
    // Retrieve headlines sorted by date_processed, assuming you want today's headlines or all headlines
    const currentHeadlines = await db.select().from(headline);

    return currentHeadlines;
  } catch (error) {
    throw error;
  }
}

export async function getPreferencesByUserId({ id }: { id: string }) {
  try {
    // Fetch the preferences from the database by userId
    const preferences = await db
      .select()
      .from(preferencesTable) // Replace `preferencesTable` with the actual table name
      .where(eq(preferencesTable.userId, id)); // Make sure `userId` exists in the preferences table

    if (preferences.length === 0) {
      console.log(`No preferences found for user with id ${id}.`);
      return null; // Return null or a default value indicating no preferences found
    }

    // Assuming there's only one record per user, return the first one
    const [userPreferences] = preferences;

    // Returning preferences object (modify based on your actual structure)
    return {
      id: userPreferences.id,
      userId: userPreferences.userId,
      alwaysRetrieveDrafts: userPreferences.alwaysRetrieveDrafts,
      greetings: userPreferences.greetings,
      closing: userPreferences.closing,
      name: userPreferences.name,
      role: userPreferences.role,
      position: userPreferences.position,
      department: userPreferences.department,
      telephone: userPreferences.telephone,
      links: Array.isArray(userPreferences.links) 
      ? userPreferences.links 
      : typeof userPreferences.links === 'string' 
      ? JSON.parse(userPreferences.links || '[]')
      : [],
      closingMessage: userPreferences.closingMessage,
      confidentialityMessage: userPreferences.confidentialityMessage,
    };
  } catch (error) {
    console.error('Failed to get preferences by user ID:', error);
    throw error;
  }
}

export async function savePreferencesByUserId({
  userId,
  preferences,
}: {
  userId: string;
  preferences: {
    alwaysRetrieveDrafts: boolean;
    greetings: string;
    closing: string;
    name: string;
    role: string;
    position: string;
    department: string;
    telephone: string;
    links: Array<{ type: string; url: string }>;
    closingMessage: string;
    confidentialityMessage: string;
  };
}) {
  try {
    // Check if preferences already exist for the user
    const [existingPreferences] = await db
      .select()
      .from(preferencesTable) // Replace `preferencesTable` with the actual table name
      .where(eq(preferencesTable.userId, userId));

    if (existingPreferences) {
      // Update existing preferences if found
      await db
        .update(preferencesTable)
        .set({
          alwaysRetrieveDrafts: preferences.alwaysRetrieveDrafts,
          greetings: preferences.greetings,
          closing: preferences.closing,
          name: preferences.name,
          role: preferences.role,
          position: preferences.position,
          department: preferences.department,
          telephone: preferences.telephone,
          links: JSON.stringify(preferences.links),
          closingMessage: preferences.closingMessage,
          confidentialityMessage: preferences.confidentialityMessage,
        })
        .where(eq(preferencesTable.userId, userId));

      console.log(`Preferences updated for user with ID ${userId}`);
    } else {
      // Insert new preferences if none exist
      await db
        .insert(preferencesTable)
        .values({
          userId,
          alwaysRetrieveDrafts: preferences.alwaysRetrieveDrafts,
          greetings: preferences.greetings,
          closing: preferences.closing,
          name: preferences.name,
          role: preferences.role,
          position: preferences.position,
          department: preferences.department,
          telephone: preferences.telephone,
          links: JSON.stringify(preferences.links),
          closingMessage: preferences.closingMessage,
          confidentialityMessage: preferences.confidentialityMessage,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      console.log(`Preferences saved for user with ID ${userId}`);
    }
  } catch (error) {
    console.error('Failed to save preferences by user ID:', error);
    throw error;
  }
}

export async function updateOutcomeById({ 
  recordId, 
  outcome 
}: { 
  recordId: string, 
  outcome: string 
}) {
  try {
    console.log('Updating outcome for recordId:', recordId, 'to:', outcome);
    
    // First, select the existing record to verify it exists
    const existingRecords = await db
      .select()
      .from(record)
      .where(eq(record.id, recordId));
    
    if (existingRecords.length === 0) {
      console.error(`No record found with ID: ${recordId}`);
      throw new Error(`Record not found: ${recordId}`);
    }
    
    // Perform the update operation with more verbose logging
    const updateResult = await db.update(record)
      .set({ outcome })
      .where(eq(record.id, recordId))
      .returning(); // Return the updated record
    
    // console.log('Outcome update results:', updateResult);
    
    // Verify the update by directly querying the record
    const verificationRecords = await db
      .select()
      .from(record)
      .where(eq(record.id, recordId));
    
    // console.log('Verification after update:', verificationRecords[0]);
    
    // Return a success message
    return { 
      success: true, 
      message: "Status updated successfully",
      updatedRecord: updateResult[0] || null
    };
  } catch (error) {
    console.error('Failed to update record\'s outcome:', error);
    throw error;
  }
}

export async function getOutcomeById({ id }: { id: string }): Promise<string | null> {
  try {
    // Select only the outcome field to minimize data transfer
    const results = await db
      .select({ outcome: record.outcome })
      .from(record)
      .where(eq(record.id, id));
    
    // Check if record exists
    if (results.length === 0) {
      console.log(`No record found with ID: ${id}`);
      return null;
    }
    
    // Return the outcome
    return results[0].outcome;
  } catch (error) {
    console.error(`Failed to get outcome for record ID ${id}:`, error);
    throw error;
  }
}

export async function getSomeRecordsById({ ids }: { ids: string[] }): Promise<DatabaseRecord[]> {
  try {
    // Create an array to store the results
    const results: DatabaseRecord[] = [];
    
    // For each ID in the provided array, fetch the record
    for (const id of ids) {
      const records = await db.select().from(record).where(eq(record.id, id));
      
      // If a record is found, process and add it to results
      if (records.length > 0) {
        const selectedRecord = records[0];
        
        // Create a properly typed record with the needed parameters
        const typedRecord: DatabaseRecord = {
          id: selectedRecord.id,
          message: selectedRecord.message,
          sectionCode: selectedRecord.sectionCode,
          actionOfficer1: selectedRecord.actionOfficer1 || '-',
          actionOfficer2: selectedRecord.actionOfficer2,
          creationOfficer: selectedRecord.creationOfficer,
          caseType: selectedRecord.caseType,
          channel: selectedRecord.channel,
          category: selectedRecord.category,
          subcategory: selectedRecord.subcategory,
          outcome: selectedRecord.outcome,
          replyDate: selectedRecord.replyDate,
          reply: selectedRecord.reply,
          planningArea: selectedRecord.planningArea,
          location: selectedRecord.location,
          locationX: selectedRecord.locationX,
          locationY: selectedRecord.locationY,
          creationDate: selectedRecord.creationDate,
          receiveDate: selectedRecord.receiveDate,
          draft: selectedRecord.draft as JSONContent || null,
          summary: selectedRecord.summary,
          evergreen_topics: Array.isArray(selectedRecord.evergreen_topics) 
            ? selectedRecord.evergreen_topics 
            : [],
          reasoning: selectedRecord.reasoning,
          relevantChunks: Array.isArray(selectedRecord.relevantChunks) 
            ? selectedRecord.relevantChunks 
            : [],
          relatedEmails: Array.isArray(selectedRecord.relatedEmails)
            ? selectedRecord.relatedEmails
            : [],
        };

        // Parse the draft if it exists and is a string
        if (typedRecord.draft) {
          if (typeof typedRecord.draft === 'string') {
            try {
              typedRecord.draft = JSON.parse(typedRecord.draft);
            } catch (e) {
              console.error(`Error parsing draft for record ID ${id}:`, e);
              typedRecord.draft = null;
            }
          } else {
            typedRecord.draft = typedRecord.draft as JSONContent;
          }
        }

        // Add the processed record to results
        results.push(typedRecord);
      }
    }

    console.log(`Retrieved ${results.length} out of ${ids.length} requested records`);
    return results;
  } catch (error) {
    console.error('Failed to get records by ids from database:', error);
    throw error;
  }
}

export async function storeFAQChunks(items: Array<{
  faq_id: string;
  category: string;
  section: string;
  heading: string;
  content: string;
  embedding: number[]; // Embedding is required
}>): Promise<number> {
  try {
    console.log(`Storing ${items.length} FAQ chunks in database`);
    
    // Insert items in batches
    let insertedCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      try {
        // Insert each item individually for now to work around the vector type issue
        for (const item of batch) {
          // Create the vector string in PostgreSQL format
          const vectorString = `[${item.embedding.join(',')}]`;
          
          await db.execute(sql`
            INSERT INTO faq_chunks (
              id, 
              faq_id, 
              category, 
              section, 
              heading, 
              content, 
              embedding
            ) VALUES (
              ${randomUUID()}, 
              ${item.faq_id}, 
              ${item.category}, 
              ${item.section}, 
              ${item.heading}, 
              ${item.content}, 
              ${vectorString}::vector 
            )
          `);
          
          insertedCount++;
        }
      } catch (error) {
        console.error('Failed to insert batch:', error);
        throw error;
      }
    }
    
    console.log(`Successfully stored ${insertedCount} FAQ chunks`);
    return insertedCount;
  } catch (error) {
    console.error('Failed to store FAQ chunks in database:', error);
    throw error;
  }
}

// Keep your existing text-based search


export async function searchFAQChunks(query: string, limit: number = 5): Promise<any[]> {
  let client = null;
  
  try {
    console.log(`Performing text search for: "${query}"`);
    
    // Prepare the search term
    const searchTerm = `%${query.toLowerCase()}%`;
    
    // Connect to database
    client = postgres(process.env.POSTGRES_URL!);
    
    // Execute the text search query
    const results = await client`
      SELECT * FROM faq_chunks 
      WHERE 
        LOWER(heading) LIKE ${searchTerm} OR 
        LOWER(content) LIKE ${searchTerm} OR
        LOWER(category) LIKE ${searchTerm} OR
        LOWER(section) LIKE ${searchTerm}
      ORDER BY 
        CASE
          WHEN LOWER(heading) LIKE ${searchTerm} THEN 1
          WHEN LOWER(content) LIKE ${searchTerm} THEN 2
          ELSE 3
        END
      LIMIT ${limit}
    `;
    
    console.log(`Text search found ${results.length} results`);
    
    return results;
  } catch (error) {
    console.error('Text search failed:', error);
    return []; // Return empty array if search fails
  } finally {
    // Close client connection if it was opened
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        console.warn('Error closing database connection:', closeError);
      }
    }
  }
}

// New function to find relevant chunks for email responses
// lib/db/queries.ts - Fixed findRelevantChunks function

export async function findRelevantChunks(
  message: string,
  similarityThreshold: number = 0.86,
  limit: number = 5
): Promise<Array<{ content: string; heading: string; category?: string; section?: string; similarity: number }>> {
  try {
    console.log(`Performing vector search for: "${message}"`);
    
    // Clean up message text
    const searchText = message.replaceAll('\n', ' ');
    
    // First verify if vector search capabilities are available
    const hasVectorSupport = await checkVectorSupport();
    
    if (!hasVectorSupport) {
      console.log('Vector search not supported, falling back to text search');
    }
    
    // Generate embedding for the message
    const embedding = await generateEmbedding(searchText);
    
    if (!embedding || !Array.isArray(embedding)) {
      console.warn('Invalid embedding generated for findRelevantChunks');
    }

    try {
        const results = await db.execute(sql `
          SELECT heading, content, category, section,
          (embedding <=> ${sql.raw(`'[${embedding. join(', ')}]'::vector`)}) AS similarity
          FROM faq_chunks
          ORDER BY similarity ASC
          LIMIT ${limit};`);

          // const results = await db.execute(
          //   sql`SELECT heading, content, category, section
          //       FROM faq_chunks
          //       LIMIT 5;`
          // );
      

      if (results && results.length > 0) {
        return results.map((row: any) => ({
          heading: row.heading || 'General Information',
          content: row.content?.trim() || '',
          category: row.category || 'General',
          section: row.section || 'Information',
          similarity: Math.round(row.similarity * 100) / 100
        }));
      }
    } catch (sqlError) {
      console.error('Vector search failed:', sqlError);
    }
    
    // If we got here, vector search returned no results above the threshold
    // Fall back to text search with reduced threshold
    console.log('No vector search results above threshold, falling back to text search');
    return [];
  } catch (error) {
    console.error('Vector search error in findRelevantChunks:', error);
    // Fall back to text search in case of any errors
    return [];
  }
}




// Helper function to check if vector search is available
async function checkVectorSupport(): Promise<boolean> {
  try {
    // Check if pgvector extension is enabled
    const extensionResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM pg_extension WHERE extname = 'vector'
    `);
    
    const hasExtension = (extensionResult as any[])[0]?.count > 0;
    
    if (!hasExtension) {
      return false;
    }
    
    // Check if our table has an embedding column
    const columnResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_name = 'faq_chunks' 
        AND column_name = 'embedding'
    `);
    
    return (columnResult as any[])[0]?.count > 0;
  } catch (error) {
    console.error('Error checking vector support:', error);
    return false;
  }
}

// Add this function to your queries.ts file
export async function testEmbedding(faqId: string) {
  try {
    console.log(`Testing embedding for FAQ ID: ${faqId}`);
    
    // 1. Get the original item and its embedding
    const results = await db
      .select()
      .from(faqChunks)
      .where(eq(faqChunks.faq_id, faqId))
      .limit(1);
    
    if (!results.length) {
      return { success: false, message: `FAQ item with ID ${faqId} not found` };
    }
    
    const item = results[0];
    
    if (!item.embedding) {
      return { success: false, message: 'Item has no embedding' };
    }
    
    // 2. Perform a vector search with the item's own embedding
    try {
      const similarItemsResult = await db.execute(sql`
        SELECT 
          faq_id, 
          heading, 
          1 - (embedding <=> ${item.embedding}::vector) AS similarity 
        FROM faq_chunks 
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${item.embedding}::vector 
        LIMIT 5
      `);
      
      // 3. The first result should be the original item (with similarity ≈ 1.0)
      const similarItems = similarItemsResult as any[];
      
      return { 
        success: true, 
        selfMatch: similarItems[0]?.faq_id === faqId,
        similarity: similarItems[0]?.similarity, 
        results: similarItems 
      };
    } catch (vectorError) {
      console.error('Vector search error during embedding test:', vectorError);
      
      // Try alternative syntax if the first attempt failed
      try {
        const similarItemsResult = await db.execute(sql`
          SELECT 
            faq_id, 
            heading, 
            1 - (embedding <=> ${JSON.stringify(item.embedding)}::vector) AS similarity 
          FROM faq_chunks 
          WHERE embedding IS NOT NULL
          ORDER BY embedding <=> ${JSON.stringify(item.embedding)}::vector 
          LIMIT 5
        `);
        
        const similarItems = similarItemsResult as any[];
        
        return { 
          success: true, 
          selfMatch: similarItems[0]?.faq_id === faqId,
          similarity: similarItems[0]?.similarity, 
          results: similarItems 
        };
      } catch (altError) {
        console.error('Alternative vector search also failed during test:', altError);
        return { 
          success: false, 
          message: 'Vector search failed during test',
          error: altError instanceof Error ? altError.message : String(altError)
        };
      }
    }
  } catch (error) {
    console.error('Error testing embedding:', error);
    return { 
      success: false, 
      message: 'Error testing embedding',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
