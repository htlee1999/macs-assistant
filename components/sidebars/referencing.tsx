import React, { useState } from 'react';
import { ExternalLink, BrainCircuit } from 'lucide-react';

interface RelevantChunk {
  content: string;
  heading: string;
  similarity: number;
}

interface ReferencingProps {
  matches: RelevantChunk[];
  reasoning: string | null;
  onSelect: (chunk: { content: string; heading: string }) => void;
}

const TruncatedHeading: React.FC<{ heading: string }> = ({ heading }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const words = heading.split(' ');
  const isLong = words.length > 8;

  if (!isLong) {
    return <span>{heading}</span>;
  }

  return (
    <span
      className="cursor-pointer hover:text-foreground/80"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {isExpanded ? (
        heading
      ) : (
        <>
          {words.slice(0, 8).join(' ')}
          <span className="ml-1 text-xs text-muted-foreground">[...]</span>
        </>
      )}
    </span>
  );
};

const Referencing: React.FC<ReferencingProps> = ({ matches, reasoning, onSelect }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

  if (!matches) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-sm text-muted-foreground">No references found</p>
      </div>
    );
  }

  // Filter chunks with similarity > 0.8
  const highSimilarityChunks = matches.filter(chunk => chunk.similarity >= 0.8);

  if (!highSimilarityChunks.length) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-sm text-muted-foreground">No highly relevant references found</p>
      </div>
    );
  }

  const extractUrl = (heading: string): string | null => {
    const urlMatch = heading.match(/link: (https:\/\/[^\s]+)/);
    return urlMatch ? urlMatch[1] : null;
  };

  const extractDate = (heading: string): string | null => {
    const dateMatch = heading.match(/date: ([^\n]+)/);
    return dateMatch ? dateMatch[1] : null;
  };

  const parseTitle = (content: string): string => {
    let title = content.replace(/^##\s*/, '');
    title = title.split(/link:/i)[0].trim();
    const parts = title.split(':').map(part => part.trim());
    const cleanParts = parts.filter(part =>
      part &&
      part.toLowerCase() !== 'tle'
    );
    return cleanParts
      .join(': ')
      .split(/[\s-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const parseContent = (content: string): string => {
    const contentParts = content.split('\n');
    const relevantContent = contentParts
      .filter(part =>
        !part.startsWith('##') &&
        !part.includes('link:') &&
        !part.includes('date:') &&
        part.trim()
      )
      .join('\n')
      .trim();

    return relevantContent;
  };

  return (
    <div className="flex flex-col space-y-4 p-4">
      {/* View Reasoning Card placed at the top */}
      <div
        className="bg-background rounded-lg p-4 border border-border 
                  shadow-sm transition-all duration-200 hover:shadow-md
                  cursor-pointer hover:bg-accent/5"
        onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-5 text-primary" />
            <h3 className="font-medium text-base text-foreground">View AI Reasoning</h3>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-1"
            >
              <path d={isReasoningExpanded ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
            </svg>
          </div>
        </div>
        
        {isReasoningExpanded && (
          <div className="mt-3 text-sm text-foreground/90">
            <p className="mb-2">
              {reasoning}
            </p>
          </div>
        )}
      </div>
      
      {/* Document chunks below */}
      {highSimilarityChunks.map((chunk, index) => {
        const url = extractUrl(chunk.heading);
        const date = extractDate(chunk.heading);
        const title = parseTitle(chunk.content);
        const cleanContent = parseContent(chunk.content);

        return (
          <div
            key={index}
            className="bg-background rounded-lg p-4 border border-border shadow-sm transition-all duration-200 hover:shadow-md"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <h3 className="font-medium text-base mb-1 text-foreground">
              <TruncatedHeading heading={title} />
            </h3>

            {date && (
              <p className="text-sm text-foreground/70 mb-1">
                {date}
              </p>
            )}

            {url && (
              <p className="text-xs text-foreground/70 mb-2 break-words">
                {url}
              </p>
            )}

            <p className="text-sm text-foreground line-clamp-2 mb-3">
              {cleanContent}
            </p>

            <button
              onClick={() => onSelect(chunk)}
              className="
                flex items-center gap-2 px-3 py-1.5 rounded-md
                text-sm font-medium transition-all duration-200
                bg-primary/10 hover:bg-primary/20
                text-primary-foreground
                border border-primary/30 hover:border-primary/50
                shadow-sm hover:shadow-md
                focus:outline-none focus:ring-2 focus:ring-primary/30
                dark:bg-primary/20 dark:hover:bg-primary/30
                dark:border-primary/40 dark:hover:border-primary/60
              "
            >
              <ExternalLink className="size-4 text-foreground" />
                              <span className="text-foreground">View document</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Referencing;