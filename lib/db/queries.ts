import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { JSONContent } from 'novel';

import {
  user,
  record, // NEWLY ADDED
  type User,
  headline,
  preferencesTable
} from './schema';
import { randomRecordGenerator } from './randomGenerator';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.

// Near the top of your queries.ts file
console.log("Database URL available:", !!process.env.POSTGRES_URL);
console.log("Database URL partial:", process.env.POSTGRES_URL?.substring(0, 10) + "...");

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

interface RelevantChunk {
  content: string;
  heading: string;
  similarity: number;
}

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
  relevantChunks: RelevantChunk[] | null;
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
    // Fake records to simulate database data
    const fakeRecords = randomRecordGenerator(id, samples)

    // Simulate ordering by createdAt (descending order)
    const orderedRecords = fakeRecords.sort((a, b) => b.creationDate.getTime() - a.creationDate.getTime());

    // Save each record to the Record table in the database
    for (const recordData of orderedRecords) {
      await db.insert(record).values({
        message: recordData.message,
        sectionCode: recordData.sectionCode,
        actionOfficer1: recordData.actionOfficer1,
        actionOfficer2: recordData.actionOfficer2,
        creationOfficer: recordData.creationOfficer,
        caseType: recordData.caseType,
        channel: recordData.channel,
        category: recordData.category,
        subcategory: recordData.subcategory,
        outcome: recordData.outcome,
        replyDate: recordData.replyDate,
        reply: recordData.reply,
        planningArea: recordData.planningArea,
        location: recordData.location,
        locationX: recordData.locationX,
        locationY: recordData.locationY,
        creationDate: recordData.creationDate,
        receiveDate: recordData.receiveDate,
        draft: recordData.draft,
        summary: recordData.summary,
        evergreen_topics: recordData.evergreen_topics,
        relevantChunks: recordData.relevantChunks,
        relatedEmails: recordData.relatedEmails,
      });
    }
    console.log('All records saved successfully!');
  } catch (error) {
    console.error('Failed to save records in database', error);
    throw error;
  }
}

export async function insertDocument({
  relevantChunks,
  recordId,
  topMatches
}: {
  relevantChunks: Array<RelevantChunk>;
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