'use client'
import { createContext, useState, useContext, ReactNode } from 'react';
import { Record, Headline } from "@/lib/db/schema";

interface ProcessorContextType {
    records: Record[];
    headlines: Headline[];
    fetchRecords: () => Promise<void>;
    triggerDailyProcess: () => Promise<void>;
    isProcessing: boolean;
}

const ProcessorContext = createContext<ProcessorContextType | undefined>(undefined);

export const useProcessorContext = () => {
    const context = useContext(ProcessorContext);
    if (!context) {
        throw new Error("useProcessorContext must be used within a ProcessorProvider");
    }
    return context;
}   

interface ProcessorProviderProps {
    children: ReactNode;
}

export const ProcessorProvider = ({ children }: ProcessorProviderProps) => {
    const [records, setRecords] = useState<Record[]>([]);
    const [headlines, setHeadlines] = useState<Headline[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
    // Function to fetch records
    const fetchRecords = async () => {
        try {
            const res = await fetch('/api/records', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        
            if (res.ok) {
                const fetchedRecords: Record[] = await res.json();
                setRecords(fetchedRecords);  // Store the fetched records
            } else {
                console.error('Failed to fetch records');
            }
        } catch (error) {
            console.error('Error fetching records:', error);
        }
    };
  
    // Function to process records
    const processRecords = async () => {
        setIsProcessing(true);
        try {
            // Filter out records with no summaries
            const recordsToProcess = records.filter(record => !record.summary);
            // If there are records to process, send them to the summary endpoint
            if (recordsToProcess.length > 0) {
                try {
                    const res = await fetch('/api/summary', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            records: recordsToProcess,  // Send the filtered records
                        }),
                    });

                    if (res.ok) {
                        const processedData = await res.json();
                        console.log('Processed data:', processedData);
                    } else {
                        console.error('Failed to process records');
                    }
                } catch (error) {
                    console.error('Error processing records:', error);
                }
            } else {
                console.log('No records to process');
            }
            let headlines = await fetchHeadlines();
            console.log('Headlines:', headlines);
            const todayMidnight = new Date();
            todayMidnight.setHours(0, 0, 0, 0); // Set the time to 00:00:00.000
            
            // Filter out the headlines that are older than today (before midnight)
            let oldHeadlines = headlines.filter((headline) => {
              const headlineDate = new Date(headline.date_processed);
              return headlineDate < todayMidnight; // Check if the headline's date is before midnight today
            });
            if(oldHeadlines.length > 0){
                console.log('deleteheadlines is running now');
                await deleteHeadlines();
                await generateHeadlines();
                headlines = await fetchHeadlines();
            }
            if(headlines.length===0){
                console.log('generateHeadlines is running now');
                await generateHeadlines();
                headlines = await fetchHeadlines();
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // New function to trigger daily process with confirmation
    const triggerDailyProcess = async () => {
        // This will be called from the UI button
        // Confirmation is handled in the UI component
        await fetchRecords(); // Make sure we have the latest records
        await processRecords();
    };

    const generateHeadlines = async () => {
        try {
            const res = await fetch('/api/headlines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (res.ok) {
                const headlinesData = await res.json();
                console.log('Generated headlines:', headlinesData.headlines);
            } else {
                console.error(`Failed to generate headlines`);
            }
        } catch (error) {
            console.error('Error generating headlines:', error);
        }
    };
        
    const fetchHeadlines = async (): Promise<Headline[]> => {
        try {
            const res = await fetch('/api/headlines', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (res.ok) {
                const headlines = await res.json();
                setHeadlines(headlines); // Update state with fetched headlines
                return headlines; // Return fetched headlines
            } else {
                console.error(`Failed to fetch headlines`);
                return []; // Return an empty array on failure
            }
        } catch (error) {
            console.error('Error fetching headlines:', error);
            return []; // Return an empty array on error
        }
    };

    const deleteHeadlines = async () => {
        try {
            const res = await fetch('/api/headlines', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (res.ok) {
                console.log('Deletion successful')
            } else {
                console.error(`Failed to delete headlines`);
            }
        } catch (error) {
            console.error('Error deleting headlines:', error);
        }
    };

    return (
        <ProcessorContext.Provider value={{ 
            records, 
            headlines, 
            fetchRecords, 
            triggerDailyProcess,
            isProcessing 
        }}>
            {children}
        </ProcessorContext.Provider>
    );
};