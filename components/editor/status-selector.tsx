import { useState } from 'react';
import { toast } from 'sonner';

export type RecordStatus = 'Open' | 'Draft' | 'Vetted' | 'Replied';
export type EmailOutcome = RecordStatus;

interface StatusSelectorProps {
  initialStatus: RecordStatus;
  recordId: string;
  onStatusUpdate?: (newStatus: RecordStatus) => void;
}

const STATUS_STYLES: Record<
  RecordStatus,
  { active: string; inactive: string }
> = {
  Open: {
    active:
      'bg-slate-100 text-slate-600 border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-500',
    inactive:
      'text-muted-foreground border-transparent hover:text-foreground',
  },
  Draft: {
    active:
      'bg-[hsl(var(--amber-bg))] text-[hsl(var(--amber-foreground))] border-[hsl(var(--amber))]',
    inactive:
      'text-muted-foreground border-transparent hover:text-foreground',
  },
  Vetted: {
    active:
      'bg-[hsl(var(--teal-bg))] text-[hsl(var(--teal-foreground))] border-[hsl(var(--teal))]',
    inactive:
      'text-muted-foreground border-transparent hover:text-foreground',
  },
  Replied: {
    active:
      'bg-blue-50 text-blue-600 border-blue-400 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-500',
    inactive:
      'text-muted-foreground border-transparent hover:text-foreground',
  },
};

const ALL_STATUSES: RecordStatus[] = ['Open', 'Draft', 'Vetted', 'Replied'];

export function StatusSelector({
  initialStatus,
  recordId,
  onStatusUpdate,
}: StatusSelectorProps) {
  const [status, setStatus] = useState<RecordStatus>(initialStatus);

  const handleStatusClick = async (newStatus: RecordStatus) => {
    if (newStatus === status) return;

    const prevStatus = status;
    setStatus(newStatus);

    if (onStatusUpdate) {
      onStatusUpdate(newStatus);
    }

    try {
      const response = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, outcome: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      if ((window as any).refreshSidebarHistory) {
        (window as any).refreshSidebarHistory();
      }
      if ((window as any).updateSidebarItemOutcome) {
        (window as any).updateSidebarItemOutcome(recordId, newStatus);
      }

      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');

      setStatus(prevStatus);
      if (onStatusUpdate) {
        onStatusUpdate(prevStatus);
      }
    }
  };

  return (
    <div className="flex gap-1">
      {ALL_STATUSES.map((s) => {
        const isActive = status === s;
        const styles = STATUS_STYLES[s];

        return (
          <button
            key={s}
            type="button"
            onClick={() => handleStatusClick(s)}
            className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium border-[1.5px] transition-all cursor-pointer ${
              isActive ? styles.active : styles.inactive
            }`}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}
