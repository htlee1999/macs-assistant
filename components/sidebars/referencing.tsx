import React, { useState } from 'react';
import { BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';

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

const parseTitle = (content: string): string => {
  let title = content.replace(/^##\s*/, '');
  title = title.split(/link:/i)[0].trim();
  const parts = title.split(':').map(part => part.trim());
  const cleanParts = parts.filter(part =>
    part && part.toLowerCase() !== 'tle'
  );
  const full = cleanParts
    .join(': ')
    .split(/[\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  const words = full.split(' ');
  if (words.length > 8) {
    return `${words.slice(0, 8).join(' ')}...`;
  }
  return full;
};

const parseContent = (content: string): string => {
  return content
    .split('\n')
    .filter(part =>
      !part.startsWith('##') &&
      !part.includes('link:') &&
      !part.includes('date:') &&
      part.trim()
    )
    .join('\n')
    .trim();
};

const Referencing: React.FC<ReferencingProps> = ({ matches, reasoning, onSelect }) => {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

  if (!matches || !matches.length) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-xs text-muted-foreground">No relevant references found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 space-y-3">
      {/* Subtitle */}
      <p className="text-[11px] text-muted-foreground">
        Retrieved via semantic similarity &middot; sorted by relevance
      </p>

      {/* AI Reasoning toggle */}
      {reasoning && (
        <button
          type="button"
          onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
          className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-semibold text-foreground">AI Reasoning</span>
            </div>
            {isReasoningExpanded
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            }
          </div>
          {isReasoningExpanded && (
            <p className="mt-3 text-[12.5px] text-muted-foreground leading-relaxed">
              {reasoning}
            </p>
          )}
        </button>
      )}

      {/* Reference cards */}
      {matches.map((chunk, index) => {
        const title = parseTitle(chunk.content);
        const cleanContent = parseContent(chunk.content);
        const similarityPercent = Math.round(chunk.similarity * 100);

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(chunk)}
            className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-all"
          >
            {/* Title + similarity badge */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="text-[13px] font-semibold text-foreground leading-snug flex-1">
                {title}
              </h4>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[hsl(var(--teal-bg))] text-[hsl(var(--teal-foreground))] border border-[hsl(var(--teal-border))] shrink-0">
                {similarityPercent}%
              </span>
            </div>

            {/* Similarity bar */}
            <div className="w-full h-[3px] bg-border rounded-full mb-3 overflow-hidden">
              <div
                className="h-full bg-[hsl(var(--teal))] rounded-full transition-all"
                style={{ width: `${similarityPercent}%` }}
              />
            </div>

            {/* Content preview */}
            <p className="text-[12.5px] text-muted-foreground leading-relaxed line-clamp-2">
              {cleanContent}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default Referencing;
