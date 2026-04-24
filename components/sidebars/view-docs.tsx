import { useState } from 'react';
import { ChevronLeft, X, MessageSquare } from 'lucide-react';
import type { JSONContent } from 'novel';

interface DocumentViewProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: {
    content: string;
    heading: string;
    draft?: JSONContent | null;
    reply?: string | null;
  } | null;
}

const DocumentView: React.FC<DocumentViewProps> = ({ isOpen, onClose, documentData }) => {
  const [isReplyExpanded, setIsReplyExpanded] = useState<boolean>(true);

  if (!isOpen || !documentData) return null;

  const hasDraft = documentData.draft !== undefined && documentData.draft !== null;
  const hasReply = documentData.reply !== undefined && documentData.reply !== null;

  return (
    <div
      className={`fixed inset-y-0 right-0 w-[600px] bg-background border-l border-border shadow-lg transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-semibold text-foreground">Document Preview</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto h-[calc(100vh-3.5rem)]">
        <h2 className="text-base font-bold text-foreground mb-1">{documentData.heading}</h2>

        {documentData.heading.includes('link:') && (
          <p className="text-[11px] text-muted-foreground mb-3 break-all">
            {documentData.heading.match(/link: (.*)/)?.[1]}
          </p>
        )}

        {documentData.heading.includes('date:') && (
          <p className="text-[11px] text-muted-foreground mb-3">
            {documentData.heading.match(/date: (.*)/)?.[1]}
          </p>
        )}

        {/* Original content */}
        <div className="mt-5">
          <div className="text-[10.5px] font-bold tracking-widest uppercase text-muted-foreground mb-2">
            Original Message
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="whitespace-pre-wrap text-[13px] text-muted-foreground leading-[1.85]">
              {documentData.content}
            </p>
          </div>
        </div>

        {/* Draft */}
        {hasDraft && (
          <div className="mt-5">
            <div className="text-[10.5px] font-bold tracking-widest uppercase text-muted-foreground mb-2">
              Draft Response
            </div>
            <div className="bg-[hsl(var(--amber-bg))] border border-[hsl(var(--amber-border))] rounded-xl p-4">
              {typeof documentData.draft === 'string' ? (
                <p className="whitespace-pre-wrap text-[13px] text-[hsl(var(--amber-foreground))] leading-[1.85]">
                  {documentData.draft}
                </p>
              ) : (
                <div className="text-[13px] text-[hsl(var(--amber-foreground))] leading-[1.85]">
                  {renderDraftContent(documentData.draft)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reply */}
        {hasReply && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10.5px] font-bold tracking-widest uppercase text-muted-foreground">
                  Sent Reply
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsReplyExpanded(!isReplyExpanded)}
                className="text-[11px] text-primary font-medium hover:text-primary/80"
              >
                {isReplyExpanded ? 'Hide' : 'Show'}
              </button>
            </div>
            {isReplyExpanded && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="whitespace-pre-wrap text-[13px] text-foreground leading-[1.85]">
                  {documentData.reply}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const renderDraftContent = (draft: JSONContent | null | undefined): React.ReactNode => {
  if (!draft) return null;
  if (typeof draft === 'string') return draft;

  if (draft.content && Array.isArray(draft.content)) {
    return draft.content.map((node) => {
      const nodeKey = `${node.type}-${node.text || ''}-${node.content?.length || 0}`;

      if (node.type === 'paragraph' && node.content) {
        return (
          <p key={nodeKey} className="mb-2">
            {node.content.map((textNode) => {
              if (textNode.text) {
                const style: React.CSSProperties = {};
                if (textNode.bold) style.fontWeight = 'bold';
                if (textNode.italic) style.fontStyle = 'italic';
                if (textNode.underline) style.textDecoration = 'underline';
                return <span key={textNode.text} style={style}>{textNode.text}</span>;
              }
              return null;
            })}
          </p>
        );
      }

      if (node.type?.startsWith('heading') && node.content) {
        const HeadingTag = node.type === 'heading1' ? 'h1' :
                          node.type === 'heading2' ? 'h2' :
                          node.type === 'heading3' ? 'h3' : 'h4';
        const text = node.content.map((textNode) => textNode.text || '').join('');
        return (
          <HeadingTag key={`heading-${text}`} className="font-bold my-2">
            {text}
          </HeadingTag>
        );
      }

      if (node.type === 'bulletList' && node.content) {
        return (
          <ul key={nodeKey} className="list-disc pl-5 my-2">
            {node.content.map((listItem) => {
              if (listItem.type === 'listItem' && listItem.content) {
                const itemText = listItem.content.map((paragraphNode) => {
                  if (paragraphNode.type === 'paragraph' && paragraphNode.content) {
                    return paragraphNode.content.map((textNode) => textNode.text || '').join('');
                  }
                  return '';
                }).join('');
                return <li key={itemText}>{itemText}</li>;
              }
              return null;
            })}
          </ul>
        );
      }

      if (node.text) {
        return <p key={`text-${node.text}`} className="mb-2">{node.text}</p>;
      }

      return null;
    });
  }

  return (
    <p className="text-xs text-muted-foreground">
      Draft content is available but in an unreadable format.
    </p>
  );
};

export default DocumentView;
