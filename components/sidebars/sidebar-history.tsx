import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import Link from 'next/link';
import type { User } from 'next-auth';
import { useState, useMemo, useEffect, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { Plus, Search } from 'lucide-react';

import {
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar';

import type { Record } from '@/lib/db/schema';
import type { EmailOutcome } from '../editor/status-selector';

type GroupedRecords = {
  today: Record[];
  yesterday: Record[];
  lastWeek: Record[];
  lastMonth: Record[];
  older: Record[];
};

const getRecordOutcome = (record: Record, outcomeOverride?: EmailOutcome): EmailOutcome => {
  if (record.reply) return 'Replied';
  if (outcomeOverride) return outcomeOverride;
  if (record.outcome === 'Vetted') return 'Vetted';
  if (record.outcome === 'Draft') return 'Draft';
  if (record.outcome === 'Open') return 'Open';
  if (record.outcome === 'Replied') return 'Replied';
  return 'Open';
};

const STATUS_BADGE_STYLES: { [K in EmailOutcome]: string } = {
  Open: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  Draft: 'bg-[hsl(var(--amber-bg))] text-[hsl(var(--amber-foreground))]',
  Vetted: 'bg-[hsl(var(--teal-bg))] text-[hsl(var(--teal-foreground))]',
  Replied: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
};

const STATUS_DOT_STYLES: { [K in EmailOutcome]: string } = {
  Open: 'bg-slate-400',
  Draft: 'bg-[hsl(var(--amber))]',
  Vetted: 'bg-[hsl(var(--teal))]',
  Replied: 'bg-blue-500',
};

const FILTER_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'Open', label: 'Open' },
  { key: 'Draft', label: 'Draft' },
  { key: 'Vetted', label: 'Vetted' },
  { key: 'Replied', label: 'Replied' },
];

type RecordItemProps = {
  record: Record;
  outcomeOverrides: Map<string, EmailOutcome>;
};

const RecordItem = ({ record, outcomeOverrides }: RecordItemProps) => {
  const outcome = getRecordOutcome(record, outcomeOverrides.get(record.id));

  return (
    <Link
      href={`/record/${record.id}`}
      className="block px-1.5 py-2.5 rounded-lg hover:bg-card transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-foreground truncate">
            {record.caseType || 'Untitled'}
          </div>
          <div className="text-[11.5px] text-muted-foreground truncate mt-0.5">
            {record.location || 'No location'}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${STATUS_BADGE_STYLES[outcome]}`}>
          <span className={`w-[5px] h-[5px] rounded-full ${STATUS_DOT_STYLES[outcome]}`} />
          {outcome}
        </span>
      </div>
    </Link>
  );
};

export function SidebarHistory({ user }: { user: User | undefined }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [outcomeOverrides, setOutcomeOverrides] = useState<Map<string, EmailOutcome>>(new Map());

  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: records, isLoading } = useSWR<Array<Record>>('/api/records', fetcher);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshSidebarHistory = () => {
        mutate('/api/records');
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        (window as any).refreshSidebarHistory = undefined;
      }
    };
  }, []);

  useEffect(() => {
    if (records && records.length > 0) {
      setOutcomeOverrides(prev => {
        const newOverrides = new Map(prev);
        let hasChanges = false;
        records.forEach(record => {
          const currentOverride = newOverrides.get(record.id);
          const actualOutcome = getRecordOutcome(record);
          if (currentOverride && currentOverride === actualOutcome) {
            newOverrides.delete(record.id);
            hasChanges = true;
          }
        });
        return hasChanges ? newOverrides : prev;
      });
    }
  }, [records]);

  const updateLocalOutcome = useCallback((recordId: string, outcome: EmailOutcome) => {
    setOutcomeOverrides(prev => {
      const newOverrides = new Map(prev);
      newOverrides.set(recordId, outcome);
      return newOverrides;
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).updateSidebarItemOutcome = (recordId: string, outcome: EmailOutcome) => {
        updateLocalOutcome(recordId, outcome);
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        (window as any).updateSidebarItemOutcome = undefined;
      }
    };
  }, [updateLocalOutcome]);

  const groupRecordsByDate = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = subWeeks(now, 1);
    const oneMonthAgo = subMonths(now, 1);

    return (records: Record[]): GroupedRecords => {
      return records.reduce(
        (groups, record) => {
          const recordDate = new Date(record.creationDate);
          if (isToday(recordDate)) {
            groups.today.push(record);
          } else if (isYesterday(recordDate)) {
            groups.yesterday.push(record);
          } else if (recordDate > oneWeekAgo) {
            groups.lastWeek.push(record);
          } else if (recordDate > oneMonthAgo) {
            groups.lastMonth.push(record);
          } else {
            groups.older.push(record);
          }
          return groups;
        },
        { today: [], yesterday: [], lastWeek: [], lastMonth: [], older: [] } as GroupedRecords
      );
    };
  }, []);

  const filteredRecords = useMemo(() => {
    let filtered = records || [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        record.caseType?.toLowerCase().includes(q) ||
        record.location?.toLowerCase().includes(q)
      );
    }

    if (activeFilter !== 'all') {
      filtered = filtered.filter(record => {
        const outcome = getRecordOutcome(record, outcomeOverrides.get(record.id));
        return outcome === activeFilter;
      });
    }

    return filtered;
  }, [searchQuery, records, activeFilter, outcomeOverrides]);

  const groupedRecords = useMemo(() => {
    return groupRecordsByDate(filteredRecords);
  }, [filteredRecords, groupRecordsByDate]);

  const renderGroup = (label: string, groupKey: keyof GroupedRecords) => {
    const group = groupedRecords[groupKey];
    if (group.length === 0) return null;
    return (
      <div key={groupKey}>
        <div className="px-1.5 pt-5 pb-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
          {label}
        </div>
        {group.map((record) => (
          <RecordItem
            key={record.id}
            record={record}
            outcomeOverrides={outcomeOverrides}
          />
        ))}
      </div>
    );
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <div className="px-3 pt-2 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-[12.5px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Filter pills */}
          <div className="flex gap-1 flex-wrap">
            {FILTER_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  activeFilter === key
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* New Record button */}
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Record
          </Link>
        </div>

        {/* Record list */}
        <div className="px-2 mt-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <div className="w-6 h-6 border-2 border-muted rounded-full animate-spin border-t-primary" />
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {searchQuery ? 'No matches found' : 'No records found'}
            </div>
          ) : (
            <>
              {renderGroup('Today', 'today')}
              {renderGroup('Yesterday', 'yesterday')}
              {renderGroup('Last 7 Days', 'lastWeek')}
              {renderGroup('Last 30 Days', 'lastMonth')}
              {renderGroup('Older', 'older')}
            </>
          )}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
