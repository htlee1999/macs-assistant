import {useState} from 'react';
import { ChevronLeft, X, MessageSquare } from 'lucide-react';
import { JSONContent } from 'novel';

// Extended interface to include optional draft and reply
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

  // Check if there's a draft to display
  const hasDraft = documentData.draft !== undefined && documentData.draft !== null;
  
  // Check if there's a reply to display
  const hasReply = documentData.reply !== undefined && documentData.reply !== null;

  // Toggle reply section expansion
  const toggleReplySection = () => {
    setIsReplyExpanded(!isReplyExpanded);
  };

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-[600px] bg-background border-l border-border shadow-lg transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onClose}
            className="hover:bg-accent p-1 rounded-md text-foreground"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="font-medium text-foreground">Document Preview</h3>
        </div>
        <button 
          onClick={onClose}
          className="hover:bg-accent p-1 rounded-full text-foreground"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto h-[calc(100vh-4rem)]">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {/* Heading/Title */}
          <h2 className="mb-4 text-lg font-medium">{documentData.heading}</h2>
          
          {/* URL if present */}
          {documentData.heading.includes('link:') && (
            <div className="mb-4 text-sm text-foreground/70 break-all">
              {documentData.heading.match(/link: (.*)/)?.[1]}
            </div>
          )}
          
          {/* Date if present */}
          {documentData.heading.includes('date:') && (
            <div className="mb-4 text-sm text-foreground/70">
              {documentData.heading.match(/date: (.*)/)?.[1]}
            </div>
          )}
          
          {/* Original content */}
          <div className="mb-6">
            <h3 className="text-md font-medium mb-2">Original Message</h3>
            <div className="whitespace-pre-wrap text-sm text-foreground p-3 bg-gray-50 dark:bg-gray-800 rounded border">
              {documentData.content}
            </div>
          </div>
          
          {/* Draft content if available */}
          {hasDraft && (
            <div className="mt-6">
              <h3 className="text-md font-medium mb-2">Draft Response</h3>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                {typeof documentData.draft === 'string' ? (
                  <div className="whitespace-pre-wrap text-sm">{documentData.draft}</div>
                ) : (
                  <div className="text-sm">
                    {renderDraftContent(documentData.draft)}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Reply section if available */}
          {hasReply && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium">
                  <div className="flex items-center text-blue-600">
                    <MessageSquare size={16} className="mr-2" />
                    Sent Reply
                  </div>
                </h3>
                <button 
                  onClick={toggleReplySection}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {isReplyExpanded ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {isReplyExpanded && (
                <div className="whitespace-pre-wrap text-sm bg-blue-50 dark:bg-blue-950/30 p-4 rounded-md border border-blue-100 dark:border-blue-900 shadow-sm">
                  {documentData.reply}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to render JSONContent draft that accepts undefined
const renderDraftContent = (draft: JSONContent | null | undefined): React.ReactNode => {
  if (!draft) return null;
  
  // If it's a string, just display it
  if (typeof draft === 'string') return draft;
  
  // If it has content, try to extract text
  if (draft.content && Array.isArray(draft.content)) {
    return draft.content.map((node, index) => {
      // Handle paragraphs
      if (node.type === 'paragraph' && node.content) {
        return (
          <p key={index} className="mb-2">
            {node.content.map((textNode, i) => {
              if (textNode.text) {
                // Apply styling if available
                const style: React.CSSProperties = {};
                if (textNode.bold) style.fontWeight = 'bold';
                if (textNode.italic) style.fontStyle = 'italic';
                if (textNode.underline) style.textDecoration = 'underline';
                
                return (
                  <span key={i} style={style}>
                    {textNode.text}
                  </span>
                );
              }
              return null;
            })}
          </p>
        );
      }
      
      // Handle headings
      if (node.type && node.type.startsWith('heading') && node.content) {
        const HeadingTag = node.type === 'heading1' ? 'h1' : 
                          node.type === 'heading2' ? 'h2' : 
                          node.type === 'heading3' ? 'h3' : 'h4';
        
        return (
          <HeadingTag key={index} className="font-bold my-2">
            {node.content.map((textNode, i) => textNode.text || '').join('')}
          </HeadingTag>
        );
      }
      
      // Handle bullet lists
      if (node.type === 'bulletList' && node.content) {
        return (
          <ul key={index} className="list-disc pl-5 my-2">
            {node.content.map((listItem, i) => {
              if (listItem.type === 'listItem' && listItem.content) {
                return (
                  <li key={i}>
                    {listItem.content.map((paragraphNode, j) => {
                      if (paragraphNode.type === 'paragraph' && paragraphNode.content) {
                        return paragraphNode.content.map((textNode, k) => textNode.text || '').join('');
                      }
                      return null;
                    })}
                  </li>
                );
              }
              return null;
            })}
          </ul>
        );
      }
      
      // Default case, just try to extract any text
      if (node.text) {
        return <p key={index} className="mb-2">{node.text}</p>;
      }
      
      return null;
    });
  }
  
  // Fallback - just stringify the JSON to at least show something
  return (
    <div className="text-xs text-gray-500">
      Draft content is available but in an unreadable format.
    </div>
  );
};

export default DocumentView;