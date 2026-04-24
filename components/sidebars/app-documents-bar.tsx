'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRecordId } from '@/components/recordIdContext';
import {
  DocumentsBar,
  DocumentsBarContent,
  DocumentsBarHeader,
  DocumentsBarMenu,
  useCitationsBar,
} from '@/components/ui/documents-bar';
import Referencing from './referencing';
import DocumentView from './view-docs';
import { FileText, Mail, BookOpen, X } from 'lucide-react';
import type { JSONContent } from 'novel';

interface RelevantChunk {
  content: string;
  heading: string;
  similarity: number;
}

interface RelatedEmail {
  id: string;
  message: string;
  draft: JSONContent | null;
  reply: string | null;
  category: string;
  creationDate: Date;
}

interface DocumentData {
  content: string;
  heading: string;
  draft?: JSONContent | null;
  reply?: string | null;
}

interface AppDocumentsBarProps {
  onInsertReference?: (chunk: { content: string; heading: string }) => void;
}

const EmailItem = ({ email, onSelect }: { email: RelatedEmail, onSelect: (email: RelatedEmail) => void }) => {
  const formattedDate = new Date(email.creationDate).toLocaleDateString();
  const messagePreview = email.message.length > 80
    ? `${email.message.substring(0, 80)}...`
    : email.message;

  return (
    <button
      type="button"
      onClick={() => onSelect(email)}
      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[13px] font-semibold text-foreground">{email.category}</span>
        <span className="text-[11px] text-muted-foreground shrink-0">{formattedDate}</span>
      </div>
      <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-2">{messagePreview}</p>
      <div className="flex gap-1.5">
        {email.draft && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--amber-bg))] text-[hsl(var(--amber-foreground))]">
            Has draft
          </span>
        )}
        {email.reply && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--teal-bg))] text-[hsl(var(--teal-foreground))]">
            Has reply
          </span>
        )}
      </div>
    </button>
  );
};

const houseRules = `
1. No spamming or inappropriate content.
2. Respect other users and their opinions.
3. Always cite your sources when making claims.
4. No harassment or bullying of any kind.
5. Use appropriate language at all times.
`;

const TAB_ITEMS = [
  { key: 'documents', label: 'References', icon: FileText },
  { key: 'emails', label: 'Emails', icon: Mail },
  { key: 'houseRules', label: 'Rules', icon: BookOpen },
] as const;

export function AppDocumentsBar({ onInsertReference }: AppDocumentsBarProps) {
  const [matches, setMatches] = useState<RelevantChunk[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableHouseRules, setEditableHouseRules] = useState(houseRules);
  const [error, setError] = useState<string | null>(null);
  const [documentViewOpen, setDocumentViewOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentData | null>(null);
  const [relatedEmails, setRelatedEmails] = useState<RelatedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<RelatedEmail | null>(null);
  const [view, setView] = useState<'documents' | 'emails' | 'houseRules'>('documents');
  const [reasoning, setReasoning] = useState<string | null>(null);

  const { state, toggleSidebar } = useCitationsBar();
  const { recordId } = useRecordId();
  const barRef = useRef<HTMLDivElement>(null);

  const handleChunkSelect = (chunk: { content: string; heading: string }) => {
    setSelectedDocument(chunk);
    setDocumentViewOpen(true);
    if (state === 'expanded') {
      toggleSidebar();
    }
  };

  const handleEmailSelect = (email: RelatedEmail) => {
    setSelectedDocument({
      content: email.message,
      heading: `Email from ${new Date(email.creationDate).toLocaleDateString()} - ${email.category}`,
      draft: email.draft,
      reply: email.reply
    });
    setSelectedEmail(email);
    setDocumentViewOpen(true);
    if (state === 'expanded') {
      toggleSidebar();
    }
  };

  const handleDocumentClose = () => {
    setDocumentViewOpen(false);
    setSelectedDocument(null);
    setSelectedEmail(null);
    if (state === 'collapsed') {
      toggleSidebar();
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        !documentViewOpen &&
        state === 'expanded' &&
        barRef.current &&
        !barRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('[data-citation-toggle]')
      ) {
        toggleSidebar();
      }
    }

    if (state === 'expanded' && !documentViewOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [state, toggleSidebar, documentViewOpen]);

  useEffect(() => {
    if (!recordId) {
      setError('No recordId provided');
      return;
    }

    const fetchMatches = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/document?recordId=${recordId}`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch matches: ${response.status}`);
        }

        const data = await response.json();
        const { reasoning, relevantChunks, relatedEmails } = data;

        setMatches(relevantChunks || []);
        setReasoning(reasoning || "");
        if (relatedEmails && Array.isArray(relatedEmails)) {
          setRelatedEmails(relatedEmails);
        }
      } catch (err) {
        console.error('Error fetching matches:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch matches');
        setMatches(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [recordId]);

  return (
    <>
      <DocumentsBar
        collapsible="none"
        className="h-full border-l border-border"
        ref={barRef}
      >
        <DocumentsBarHeader>
          <DocumentsBarMenu>
            <div className="flex items-center gap-2 px-3 py-2.5">
              {/* Tab pills */}
              <div className="flex gap-1 flex-1">
                {TAB_ITEMS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setView(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                      view === key
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => toggleSidebar()}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </DocumentsBarMenu>
        </DocumentsBarHeader>

        <DocumentsBarContent>
          {/* References tab */}
          {view === 'documents' && (
            isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div className="w-6 h-6 border-2 border-muted rounded-full animate-spin border-t-primary" />
                <p className="text-xs text-muted-foreground">Loading references...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            ) : matches ? (
              <Referencing matches={matches} reasoning={reasoning} onSelect={handleChunkSelect} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <p className="text-xs text-muted-foreground">No references available</p>
              </div>
            )
          )}

          {/* Emails tab */}
          {view === 'emails' && (
            <div className="flex flex-col h-full p-4">
              <div className="text-[10.5px] font-bold tracking-widest uppercase text-muted-foreground mb-3">
                Related Emails
              </div>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center grow gap-2">
                  <div className="w-6 h-6 border-2 border-muted rounded-full animate-spin border-t-primary" />
                  <p className="text-xs text-muted-foreground">Loading...</p>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center grow">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              ) : relatedEmails.length > 0 ? (
                <div className="space-y-2.5 overflow-y-auto">
                  {relatedEmails.map((email) => (
                    <EmailItem key={email.id} email={email} onSelect={handleEmailSelect} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center grow">
                  <p className="text-xs text-muted-foreground">No related emails found</p>
                </div>
              )}
            </div>
          )}

          {/* Rules tab */}
          {view === 'houseRules' && (
            <div className="flex flex-col p-4">
              <div className="text-[10.5px] font-bold tracking-widest uppercase text-muted-foreground mb-3">
                House Rules
              </div>
              {isEditing ? (
                <textarea
                  className="p-3 border border-border rounded-lg w-full h-40 text-[13px] bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                  value={editableHouseRules}
                  onChange={(e) => setEditableHouseRules(e.target.value)}
                />
              ) : (
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-[13px] text-muted-foreground leading-[1.85] whitespace-pre-line">
                    {editableHouseRules}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    setEditableHouseRules(editableHouseRules);
                  }
                  setIsEditing(!isEditing);
                }}
                className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary/90 transition-colors"
              >
                {isEditing ? 'Save Changes' : 'Edit'}
              </button>
            </div>
          )}
        </DocumentsBarContent>
      </DocumentsBar>

      <DocumentView isOpen={documentViewOpen} onClose={handleDocumentClose} documentData={selectedDocument} />
    </>
  );
}
