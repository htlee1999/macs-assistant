'use client'

import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { DraftHeader } from '@/components/editor/draft-header';
import { generateEditorContent } from '@/lib/editor/content';
import EmailPreview from './email-preview';
import { NovelEditor } from './noveleditor';
import { JSONContent } from 'novel';
import { type RecordStatus } from './status-selector';

// Create a minimal type that includes only what EmailPreview actually uses
type MinimalRecord = {
  id: string;
  draft: JSONContent | null;
  outcome?: RecordStatus | null;
  reply?: string | null;
};

// state changing
interface EditorState {
  content: string;
  editorContent: JSONContent;
  isVisible: boolean;
}

// initial configuration data
interface EmailDraftingPageProps {
  id: string;
  details: {
    id: string,
    title: string,
    content: string,
    summary: string | null
  }
  selectedModelId: string;
}

export function EmailDraftingPage({
  id,
  details,
  selectedModelId,
}: EmailDraftingPageProps) {
  const { mutate } = useSWRConfig();
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const isTogglingRef = useRef(false);
  
  const [editorState, setEditorState] = useState<EditorState>({
    content: '',
    editorContent: {},
    isVisible: false,
  });
  
  // State to track the record with draft content and reply
  const [record, setRecord] = useState<MinimalRecord>({
    id,
    draft: null,
    outcome: 'Open', // Default status for new records
    reply: null
  });

  // Check for existing draft, reply, and outcome on mount - combined fetch
  useEffect(() => {
    const fetchRecordData = async () => {
      try {
        const response = await fetch(`/api/editor?recordId=${id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        console.log('Editor content response:', data.outcome);

        if (response.ok) {
          // Process draft data if it exists
          let newEditorContent = data.draft;
          let newVisibility = false;


          if (newEditorContent) {
            newVisibility = true;
          }

          // Update editor state
          setEditorState(prev => ({
            ...prev,
            editorContent: newEditorContent || prev.editorContent,
            isVisible: newVisibility
          }));
          // Update record with draft, reply, and outcome in one go
          setRecord({
            id,
            draft: newEditorContent,
            outcome: data.outcome,
            reply: data.reply || null
          });
        }
      } catch (error) {
        console.error('Error fetching record data:', error);
        toast.error('Failed to load record data');
      }
    };

    fetchRecordData();
  },[]);

  // Listen for the custom delete event from NovelEditor
  useEffect(() => {
    const handleEditorDeleteComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      // Check if this event is for our record
      if (customEvent.detail?.recordId === id) {
        // Reset the editor state
        setEditorState({
          content: '',
          editorContent: {},
          isVisible: false
        });
        
        // Update the record state
        setRecord(prev => ({
          ...prev,
          draft: null,
          outcome: 'Open'
        }));
      }
    };

    // Add event listener
    window.addEventListener('editorDeleteComplete', handleEditorDeleteComplete);
    
    // Clean up
    return () => {
      window.removeEventListener('editorDeleteComplete', handleEditorDeleteComplete);
    };
  }, []);

  const toggleEditor = async () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setIsEditorLoading(true);
  
    try {
      // Proceed directly with generating editor content
      const response = await fetch(`/api/editor?recordId=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: id,
          generateDraft: true
        })
      });
  
      const data = await response.json();
      
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch editor content');
      }
  
      if (!data.emailData && !data.editorState && !data.generatedDraft) {
        throw new Error('No valid content found');
      }
  
      let newEditorContent = data.editorState;
      if (!newEditorContent && data.emailData) {
        newEditorContent = generateEditorContent({
          ...data.emailData,
          draft: data.generatedDraft || ''
        });
      }
  
      // Update the local record state - preserve the reply from previous state
      setRecord(prev => ({
        ...prev,
        draft: newEditorContent,
        outcome: 'Draft'
      }));
  
      setEditorState(prev => ({
        ...prev,
        editorContent: newEditorContent,
        isVisible: true
      }));
  
      // Refresh the history to show updated status
      mutate('/api/records');
      
  
    } catch (error) {
      console.error('Error fetching editor content:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load editor');
    } finally {
      setIsEditorLoading(false);
      setTimeout(() => {
        isTogglingRef.current = false;
      }, 100);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Fixed header */}
      <DraftHeader
        userId='user-123'
        recordId={id}
        selectedModelId={selectedModelId}
      />
      
      {/* Fixed email preview */}
      <div className="container mx-auto px-4">
          <div className={` ${editorState.isVisible ? 'mb-6' : 'mb-0'}`}>
            <EmailPreview
              recordId={id}
              details={details}
              record={record as any} // Use type assertion to satisfy TypeScript
              isEditorVisible={editorState.isVisible}
              onToggleEditor={toggleEditor}
            />
          </div>
      </div>
      
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {isEditorLoading ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 overflow-auto flex justify-center items-center"
            >
              <div className="flex flex-col items-center space-y-2">
                {/* Spinning circle */}
                <div className="size-10 border-4 border-gray-300 rounded-full animate-spin border-t-blue-500"></div>
                {/* Loading text */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-lg text-muted-foreground"
                >
                  Generating Draft...
                </motion.p>
              </div>
            </motion.div>
          ) : editorState.isVisible && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 overflow-auto"
            >
              
                <NovelEditor
                  initialValue={editorState.editorContent}
                  recordId={id}
                />
              
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}