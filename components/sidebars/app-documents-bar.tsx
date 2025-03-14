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
import { DocumentsIcon, EmailsIcon, CreateIcon, CrossIcon, BookOpenIcon } from '@/components/ui/icons';
import { JSONContent } from 'novel';

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

// Update the document data interface to include the draft property
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
  const messagePreview = email.message.length > 60 
    ? `${email.message.substring(0, 60)}...` 
    : email.message;
  
  return (
    <li className="mb-2 p-3 border rounded hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(email)}>
      <div className="flex justify-between mb-1">
        <span className="font-medium text-sm">{email.category}</span>
        <span className="text-xs text-gray-500">{formattedDate}</span>
      </div>
      <p className="text-sm text-gray-700">{messagePreview}</p>
      <div className="flex mt-1">
        {email.draft && <span className="text-xs mr-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Has draft</span>}
        {email.reply && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Has reply</span>}
      </div>
    </li>
  );
};

const houseRules = `
1. No spamming or inappropriate content.
2. Respect other users and their opinions.
3. Always cite your sources when making claims.
4. No harassment or bullying of any kind.
5. Use appropriate language at all times.
`;

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
  const [view, setView] = useState<'documents' | 'emails' |  'houseRules'>('documents'); 
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
        className={`border-l border-border w-[300px] transition-transform duration-200 ${
          state === 'collapsed' || documentViewOpen
            ? 'translate-x-full'
            : 'translate-x-0'
        }`}
        ref={barRef}
      >
        <DocumentsBarHeader>
          <DocumentsBarMenu>
            <div className="flex items-center justify-between px-4 py-2 text-foreground">
              <div className="flex gap-4">
                <button
                  onClick={() => setView('documents')}
                  className={`p-2 rounded-md border ${view === 'documents' ? 'bg-gray-100 border-gray-400' : 'border-gray-300 hover:border-gray-400'}`}
                  title="Documents"
                >
                  <DocumentsIcon size={20} />
                </button>

                <button
                  onClick={() => setView('emails')}
                  className={`p-2 rounded-md border ${view === 'emails' ? 'bg-gray-100 border-gray-400' : 'border-gray-300 hover:border-gray-400'}`}
                  title="Emails"
                >
                  <EmailsIcon size={20} />
                </button>

                <button
                  onClick={() => setView('houseRules')}
                  className={`p-2 rounded-md border ${view === 'houseRules' ? 'bg-gray-100 border-gray-400' : 'border-gray-300 hover:border-gray-400'}`}
                  title="House Rules"
                >
                  <BookOpenIcon size={20} />
                </button>
              </div>

              <button
                onClick={() => toggleSidebar()}
                className="text-gray-500 hover:text-gray-700"
              >
                <CrossIcon size={16} />
              </button>
            </div>
          </DocumentsBarMenu>
        </DocumentsBarHeader>

        <DocumentsBarContent>
          {view === 'documents' && (
            <>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground mb-2">Loading references...</p>
                  <div className="w-16 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              ) : matches ? (
                <Referencing matches={matches} reasoning={reasoning} onSelect={handleChunkSelect} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <p className="text-sm text-muted-foreground">No references available</p>
                </div>
              )}
            </>
          )}

          {view === 'emails' && (
            <div className="flex flex-col h-full p-4">
              <h3 className="text-sm font-medium mb-3">Related Emails</h3>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center grow">
                  <p className="text-sm text-muted-foreground mb-2">Loading related emails...</p>
                  <div className="w-16 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center grow">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              ) : relatedEmails.length > 0 ? (
                <ul className="space-y-2 overflow-y-auto max-h-[calc(100vh-150px)]">
                  {relatedEmails.map((email) => (
                    <EmailItem key={email.id} email={email} onSelect={handleEmailSelect} />
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center grow">
                  <p className="text-sm text-muted-foreground">No related emails found</p>
                </div>
              )}
            </div>
          )}
          {view === 'houseRules' && (
            <div className="flex flex-col p-4">
              <h3 className="text-sm font-medium mb-3">House Rules</h3>
              {isEditing ? (
                <textarea
                  className="p-2 border rounded-md w-full h-40"
                  value={editableHouseRules}
                  onChange={(e) => setEditableHouseRules(e.target.value)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{editableHouseRules}</p>
              )}
              <button
                onClick={() => {
                  if (isEditing) {
                    // For now, Save Changes just toggles the mode and returns the same rules
                    setEditableHouseRules(editableHouseRules); // Placeholder action for saving
                  }
                  setIsEditing(!isEditing); // Toggle the editing mode
                }}
                className="mt-2 p-2 rounded-md bg-blue-500 text-white border border-blue-500 hover:border-blue-600"
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