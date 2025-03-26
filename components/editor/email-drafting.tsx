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

interface Prompt {
  id: string;
  title: string;
  content: string;
}

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
  // State for content expansion
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  // Add a specific state to track reply status changes
  const [replyStatus, setReplyStatus] = useState<boolean>(false);

  // 🔹 State for selected prompt
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  
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
        console.log('Editor content response:', data);

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
          
          // Update reply status
          setReplyStatus(!!data.reply);
          
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
  }, [id]);

  // Add a polling mechanism to check for reply status changes
  useEffect(() => {
    // Only poll if we're not already in a replied state
    if (!replyStatus) {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/editor?recordId=${id}&checkReplyOnly=true`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // If reply status changed from false to true
            if (data.reply && !replyStatus) {
              setReplyStatus(true);
              setRecord(prev => ({
                ...prev,
                reply: data.reply,
                outcome: data.outcome || prev.outcome
              }));
              
              // Optionally, you can refresh the entire record data to ensure everything is in sync
              mutate(`/api/editor?recordId=${id}`);
              
              // Clear interval once replied
              clearInterval(pollInterval);
            }
          }
        } catch (error) {
          console.error('Error polling reply status:', error);
          // Don't show error toasts for polling to avoid spamming the user
        }
      }, 10000); // Poll every 10 seconds
      
      return () => clearInterval(pollInterval);
    }
  }, [id, replyStatus, mutate]);

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
  }, [id]);

  // Listen for submit events from the editor
  useEffect(() => {
    const handleEditorSubmit = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      // Check if this event is for our record
      if (customEvent.detail?.recordId === id) {
        // Update reply status and record
        setReplyStatus(true);
        setRecord(prev => ({
          ...prev,
          reply: customEvent.detail?.content || prev.reply,
          outcome: 'Replied'
        }));
        
        // Refresh data
        mutate(`/api/editor?recordId=${id}`);
      }
    };

    // Add event listener
    window.addEventListener('editorSubmit', handleEditorSubmit);
    
    // Clean up
    return () => {
      window.removeEventListener('editorSubmit', handleEditorSubmit);
    };
  }, [id, mutate]);

  // 🔹 Generate draft using selected prompt
  const toggleEditor = async () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setIsEditorLoading(true);
    
    try {
      if (!selectedPrompt) {
        toast.error('Please select a prompt before generating a draft.');
        setIsEditorLoading(false);
        isTogglingRef.current = false;
        return;
      }

      const response = await fetch(`/api/editor?recordId=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: id,
          generateDraft: true,
          prompt: selectedPrompt.content, // 🔹 Use selected prompt instead of hardcoded values
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

  // Handler for content expansion changes
  const handleContentExpand = (expanded: boolean) => {
    setIsContentExpanded(expanded);
  };

  // Calculate header height - assuming it's 64px based on standard practices
  const headerHeight = 64;
  
  // Calculate the height for the main container
  const mainContainerHeight = `calc(100vh - ${headerHeight}px)`;
  
  // Calculate proportional heights for sections based on reply status and content expansion state
  // If there's a reply, the preview takes the full height
  // Otherwise, use the previous logic for expansion state
  const previewHeight = replyStatus
    ? `calc(100vh - ${headerHeight*3}px)` // Full height when replied
    : isContentExpanded
      ? `calc(40vh - 25px)` // 4 parts of 10 when expanded without reply
      : `calc(33vh - 20px)`; // 1 part of 3 when collapsed without reply
      
  const editorHeight = replyStatus
    ? '0px' // No editor height when replied
    : isContentExpanded
      ? `calc(60vh - 39px)` // 6 parts of 10 when expanded without reply
      : `calc(67vh - 44px)`; // 2 parts of 3 when collapsed without reply
  
  const editorVisible = !replyStatus && editorState.isVisible;
 
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Fixed header */}
      <DraftHeader
        userId="user-123"
        recordId={id}
        selectedModelId={selectedModelId}
      />
      
      <div className="flex flex-col transition-all duration-300" style={{ height: mainContainerHeight }}>
        {/* Email preview section - with dynamic height based on reply status and expansion state */}
        <div 
          className="w-full flex justify-center py-4 flex-shrink-0 transition-all duration-300" 
          style={{ height: previewHeight }}
        >
          <div className="w-3/4 h-full">
            <EmailPreview
              recordId={id}
              details={details}
              record={record as any}
              isEditorVisible={editorState.isVisible}
              onToggleEditor={toggleEditor}
              onContentExpand={handleContentExpand}
            />
          </div>
        </div>
        
        {/* Editor section - only visible when there's no reply */}
        {!replyStatus && (
          <div 
            className="w-full flex justify-center flex-shrink-0 relative overflow-hidden transition-all duration-300" 
            style={{ height: editorHeight }}
          >
            <AnimatePresence mode="wait">
              {isEditorLoading ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex justify-center items-center"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className="size-10 border-4 border-gray-300 rounded-full animate-spin border-t-blue-500"></div>
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
              ) : editorVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 overflow-hidden flex justify-center"
                >
                  <div className="w-3/4 h-full">
                    <div className="bg-background border-border h-full overflow-hidden">
                      <div className="w-full h-full py-4">
                        <NovelEditor
                          initialValue={editorState.editorContent}
                          recordId={id}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}