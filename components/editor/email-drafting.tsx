'use client'

import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { generateEditorContent } from '@/lib/editor/content';
import { NovelEditor } from './noveleditor';
import { StatusSelector, type RecordStatus } from './status-selector';
import { useCitationsBar } from '@/components/ui/documents-bar';
import { useRecordId } from '@/components/recordIdContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ChevronRight, FileText, Sparkles, MessageSquare } from 'lucide-react';
import type { JSONContent } from 'novel';

type MinimalRecord = {
  id: string;
  draft: JSONContent | null;
  outcome?: RecordStatus | null;
  reply?: string | null;
};

interface EditorState {
  content: string;
  editorContent: JSONContent;
  isVisible: boolean;
}

interface EmailDraftingPageProps {
  id: string;
  details: {
    id: string;
    title: string;
    content: string;
    summary: string | null;
    channel?: string;
    category?: string;
    sectionCode?: string;
    location?: string;
    caseType?: string;
  };
  selectedModelId: string;
}

export function EmailDraftingPage({
  id,
  details,
}: EmailDraftingPageProps) {
  const { mutate } = useSWRConfig();
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const isTogglingRef = useRef(false);
  const [replyStatus, setReplyStatus] = useState<boolean>(false);
  const { setOpen, setOpenMobile, isMobile, open, openMobile } = useCitationsBar();
  const { setRecordId } = useRecordId();

  const [editorState, setEditorState] = useState<EditorState>({
    content: '',
    editorContent: {},
    isVisible: false,
  });

  const [record, setRecord] = useState<MinimalRecord>({
    id,
    draft: null,
    outcome: 'Open',
    reply: null,
  });

  useEffect(() => {
    const fetchRecordData = async () => {
      try {
        const response = await fetch(`/api/editor?recordId=${id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (response.ok) {
          const newEditorContent = data.draft;
          let newVisibility = false;

          if (newEditorContent) {
            newVisibility = true;
          }

          setEditorState((prev) => ({
            ...prev,
            editorContent: newEditorContent || prev.editorContent,
            isVisible: newVisibility,
          }));

          setReplyStatus(!!data.reply);

          setRecord({
            id,
            draft: newEditorContent,
            outcome: data.outcome,
            reply: data.reply || null,
          });
        }
      } catch (error) {
        console.error('Error fetching record data:', error);
        toast.error('Failed to load record data');
      }
    };

    fetchRecordData();
  }, [id]);

  useEffect(() => {
    if (!replyStatus) {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/editor?recordId=${id}&checkReplyOnly=true`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            }
          );

          if (response.ok) {
            const data = await response.json();

            if (data.reply && !replyStatus) {
              setReplyStatus(true);
              setRecord((prev) => ({
                ...prev,
                reply: data.reply,
                outcome: data.outcome || prev.outcome,
              }));

              mutate(`/api/editor?recordId=${id}`);
              clearInterval(pollInterval);
            }
          }
        } catch (error) {
          console.error('Error polling reply status:', error);
        }
      }, 10000);

      return () => clearInterval(pollInterval);
    }
  }, [id, replyStatus, mutate]);

  useEffect(() => {
    const handleEditorDeleteComplete = (event: Event) => {
      const customEvent = event as CustomEvent;

      if (customEvent.detail?.recordId === id) {
        setEditorState({
          content: '',
          editorContent: {},
          isVisible: false,
        });

        setRecord((prev) => ({
          ...prev,
          draft: null,
          outcome: 'Open',
        }));
      }
    };

    window.addEventListener('editorDeleteComplete', handleEditorDeleteComplete);
    return () => {
      window.removeEventListener(
        'editorDeleteComplete',
        handleEditorDeleteComplete
      );
    };
  }, [id]);

  useEffect(() => {
    const handleEditorSubmit = (event: Event) => {
      const customEvent = event as CustomEvent;

      if (customEvent.detail?.recordId === id) {
        setReplyStatus(true);
        setRecord((prev) => ({
          ...prev,
          reply: customEvent.detail?.content || prev.reply,
          outcome: 'Replied',
        }));

        mutate(`/api/editor?recordId=${id}`);
      }
    };

    window.addEventListener('editorSubmit', handleEditorSubmit);
    return () => {
      window.removeEventListener('editorSubmit', handleEditorSubmit);
    };
  }, [id, mutate]);

  const toggleEditor = async () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setIsEditorLoading(true);

    try {
      const response = await fetch(`/api/editor?recordId=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: id,
          generateDraft: true,
        }),
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
          draft: data.generatedDraft || '',
        });
      }

      setRecord((prev) => ({
        ...prev,
        draft: newEditorContent,
        outcome: 'Draft',
      }));

      setEditorState((prev) => ({
        ...prev,
        editorContent: newEditorContent,
        isVisible: true,
      }));

      mutate('/api/records');
    } catch (error) {
      console.error('Error fetching editor content:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to load editor'
      );
    } finally {
      setIsEditorLoading(false);
      setTimeout(() => {
        isTogglingRef.current = false;
      }, 100);
    }
  };

  const handleOpenReferences = () => {
    if (isMobile) {
      if (!openMobile) setOpenMobile(true);
    } else {
      if (!open) setOpen(true);
    }
    setRecordId(details.id);
  };

  const metaChips = [
    details.channel && { label: 'Channel', value: details.channel },
    details.category && { label: 'Category', value: details.category },
    details.sectionCode && { label: 'Section', value: details.sectionCode },
    details.location && { label: 'Location', value: details.location },
  ].filter(Boolean) as { label: string; value: string }[];

  const editorVisible = !replyStatus && editorState.isVisible;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header bar matching mockup */}
      <div className="px-5 py-2.5 border-b border-border bg-card flex items-center gap-3 shrink-0">
        <SidebarTrigger />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-xs text-muted-foreground shrink-0">
            Records
          </span>
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold truncate">
            {details.title}
          </span>
        </div>

        {/* Status pills */}
        <div className="flex gap-1 shrink-0">
          <StatusSelector
            initialStatus={(record.outcome as RecordStatus) || 'Open'}
            recordId={id}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenReferences}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              open
                ? 'bg-foreground text-background'
                : 'bg-background border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            References
          </button>
          <button
            type="button"
            onClick={toggleEditor}
            disabled={isEditorLoading}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isEditorLoading
                ? 'bg-[hsl(var(--amber-bg))] border border-[hsl(var(--amber-border))] text-[hsl(var(--amber-foreground))]'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isEditorLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-[hsl(var(--amber-border))] border-t-[hsl(var(--amber))] rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {editorState.isVisible ? 'Regenerate' : 'Generate Draft'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[860px] mx-auto py-7 px-8">
          {/* Meta chips */}
          {metaChips.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-5">
              {metaChips.map((chip) => (
                <div
                  key={chip.label}
                  className="px-2.5 py-1 rounded-lg bg-card border border-border text-[11px]"
                >
                  <span className="text-muted-foreground">{chip.label} </span>
                  <span className="font-semibold">{chip.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Customer Message card */}
          <div className="bg-card border border-border rounded-xl p-6 mb-5">
            <div className="text-[10.5px] font-bold tracking-widest uppercase text-muted-foreground mb-4">
              Customer Message
            </div>
            <p className="text-[13px] text-muted-foreground leading-[1.85]">
              {details.content}
            </p>

            {details.summary && (
              <div className="mt-4 px-4 py-3 bg-[hsl(var(--amber-bg))] rounded-lg border border-[hsl(var(--amber-border))]">
                <span className="text-[10px] font-bold tracking-widest uppercase text-[hsl(var(--amber-foreground))] block mb-1.5">
                  AI Summary
                </span>
                <p className="text-[12.5px] text-[hsl(var(--amber-foreground))] leading-[1.7]">
                  {details.summary}
                </p>
              </div>
            )}
          </div>

          {/* Reply section - shown when record has been replied */}
          {replyStatus && record.reply && (
            <div className="bg-card border border-border rounded-xl p-6 mb-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span className="text-[10.5px] font-bold tracking-widest uppercase text-muted-foreground">
                  Your Response
                </span>
              </div>
              <div className="whitespace-pre-wrap text-[13px] text-muted-foreground leading-[1.85] p-5 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                {record.reply}
              </div>
            </div>
          )}

          {/* Draft Response card */}
          {!replyStatus && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <AnimatePresence mode="wait">
                {isEditorLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex justify-center items-center py-20"
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <div className="size-8 border-[3px] border-muted rounded-full animate-spin border-t-primary" />
                      <p className="text-sm text-muted-foreground">
                        Generating Draft...
                      </p>
                    </div>
                  </motion.div>
                ) : editorVisible ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <NovelEditor
                      initialValue={editorState.editorContent}
                      recordId={id}
                    />
                  </motion.div>
                ) : (
                  <div className="p-6">
                    <div className="text-[10.5px] font-bold tracking-widest uppercase text-muted-foreground mb-4">
                      Draft Response
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-[1.85]">
                      Click &lsquo;Generate Draft&rsquo; to create an
                      AI-assisted response, or type your reply here...
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
