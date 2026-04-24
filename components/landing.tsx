'use client';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { generateUUID } from '@/lib/utils';
import { DraftHeader } from '@/components/editor/draft-header';
import type { Headline, Record } from '@/lib/db/schema'
import { useProcessorContext } from '@/components/daily-processor';
import { ProcessorButton } from '@/components/processor-button';
import { AlertTriangle, X, ChevronRight, ChevronDown, Inbox, FileText, CheckCircle, TrendingUp } from 'lucide-react';
import '@/app/globals.css';

const recordsFetcher = (url: string) => fetch(url).then((res) => res.json());

const Landing = ({ selectedModelId }: { selectedModelId: string }) => {
  const [tempId] = useState(() => generateUUID());

  const [loading, setLoading] = useState<boolean>(true);
  const [filteredToday, setFilteredToday] = useState<Headline[]>([]);
  const [filteredOverall, setFilteredOverall] = useState<Headline[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isAlertExpanded, setIsAlertExpanded] = useState<boolean>(false);
  const [expandedHeadline, setExpandedHeadline] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('today');

  const { headlines } = useProcessorContext();
  const { data: records } = useSWR<Record[]>('/api/records', recordsFetcher);

  const recordCounts = useMemo(() => {
    const list = records ?? [];
    const count = (outcome: string) =>
      list.filter((r) => (r.reply ? 'Replied' : r.outcome) === outcome).length;
    return {
      open: count('Open'),
      drafts: count('Draft'),
      vetted: count('Vetted'),
      total: list.length,
    };
  }, [records]);

  useEffect(() => {
    if (headlines.length > 0) {
      const filteredByDate = headlines.filter((headline) => {
        const headlineDate = new Date(headline.date_processed);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        return (
          (!start || headlineDate >= start) &&
          (!end || headlineDate <= end)
        );
      });

      const todayHeadlines = filteredByDate.filter((headline) => headline.type === 'today');
      const overallHeadlines = filteredByDate.filter((headline) => headline.type === 'overall');

      setFilteredToday(todayHeadlines);
      setFilteredOverall(overallHeadlines);

      setLoading(false);
    }
  }, [headlines, startDate, endDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    if (type === 'start') {
      setStartDate(e.target.value);
    } else if (type === 'end') {
      setEndDate(e.target.value);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedHeadline(expandedHeadline === id ? null : id);
  };

  const highMatchHeadlines = filteredOverall.filter(headline => Number.parseFloat(headline.match_percent) >= 10);
  const hasHighMatch = highMatchHeadlines.length > 0;

  const MetricCard = ({ label, value, sub, icon: Icon, accentClass }: {
    label: string;
    value: number;
    sub: string;
    icon: typeof Inbox;
    accentClass: string;
  }) => (
    <div className="bg-card border border-border rounded-xl p-5 flex-1 min-w-0">
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[10.5px] font-bold tracking-widest uppercase text-muted-foreground">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="text-3xl font-bold text-foreground leading-none mb-1">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );

  const HeadlineItem = ({ headline }: { headline: Headline }) => {
    const isOpen = expandedHeadline === headline.id;
    return (
      <div className="border border-border rounded-[10px] overflow-hidden mb-2 bg-card">
        <button
          type="button"
          className="w-full text-left p-4 flex justify-between items-start gap-3"
          onClick={() => toggleExpand(headline.id)}
        >
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-[13px] text-foreground mb-1">{headline.title}</h4>
            <p className={`text-xs text-muted-foreground leading-relaxed ${isOpen ? '' : 'line-clamp-2'}`}>
              {headline.desc}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            {Number.parseFloat(headline.match_percent) >= 10 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                {headline.match_percent}% match
              </span>
            )}
            {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        </button>
        {isOpen && headline.examples && (
          <div className="px-4 pb-3.5 border-t border-border/50">
            <div className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground my-2.5">Examples</div>
            {headline.examples.split("|").map((example) => {
              const trimmed = example.trim();
              return (
                <div key={`${headline.id}-${trimmed}`} className="text-[11.5px] text-muted-foreground px-2.5 py-1.5 bg-background rounded-md mb-1 font-mono">
                  &ldquo;{trimmed}&rdquo;
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const DateRangeSelector = () => (
    <div className="flex gap-4 p-3 mt-3 bg-background rounded-lg border border-border/50">
      <div className="flex flex-col flex-1">
        <label htmlFor="startDate" className="mb-1.5 text-[11px] font-medium text-muted-foreground">Start Date</label>
        <input id="startDate" type="date" value={startDate} onChange={(e) => handleDateChange(e, 'start')} className="px-3 py-1.5 border border-border rounded-lg text-xs bg-card" />
      </div>
      <div className="flex flex-col flex-1">
        <label htmlFor="endDate" className="mb-1.5 text-[11px] font-medium text-muted-foreground">End Date</label>
        <input id="endDate" type="date" value={endDate} onChange={(e) => handleDateChange(e, 'end')} className="px-3 py-1.5 border border-border rounded-lg text-xs bg-card" />
      </div>
    </div>
  );

  const tabItems = [
    { key: 'today', label: "Today's Trends" },
    { key: 'overall', label: 'Overall Patterns' },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <DraftHeader userId="" recordId={tempId} selectedModelId={selectedModelId} />

      <div className="flex flex-1 flex-col items-center justify-start overflow-y-auto py-7 px-8 bg-background">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight mb-0.5">Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <ProcessorButton />
          </div>

          {/* Metric Cards */}
          <div className="flex gap-3 mb-4">
            <MetricCard label="Open" value={recordCounts.open} sub="awaiting response" icon={Inbox} accentClass="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" />
            <MetricCard label="Drafts" value={recordCounts.drafts} sub="pending review" icon={FileText} accentClass="bg-[hsl(var(--amber-bg))] text-[hsl(var(--amber-foreground))]" />
            <MetricCard label="Vetted" value={recordCounts.vetted} sub="ready to send" icon={CheckCircle} accentClass="bg-[hsl(var(--teal-bg))] text-[hsl(var(--teal-foreground))]" />
            <MetricCard label="Total" value={recordCounts.total} sub="all records" icon={TrendingUp} accentClass="bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400" />
          </div>

          {/* Alert Bar */}
          {hasHighMatch && !isAlertExpanded && (
            <div className="mb-4 rounded-[10px] bg-destructive/10 border border-destructive/20 flex items-stretch">
              <button
                type="button"
                onClick={() => setIsAlertExpanded(true)}
                className="flex-1 text-left p-3 flex items-center gap-2.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                <span className="flex-1 text-[12.5px] font-medium text-destructive">
                  Possible write-in campaign detected — {highMatchHeadlines.length} headline(s) above 10% match threshold
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsAlertExpanded(false)}
                className="text-muted-foreground p-3"
                aria-label="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isAlertExpanded && hasHighMatch && (
            <div className="mb-4 p-4 rounded-[10px] bg-destructive/5 border border-destructive/15">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-sm text-destructive">Campaign Alert Details</h4>
                <button type="button" onClick={() => setIsAlertExpanded(false)} className="text-muted-foreground p-0.5 hover:text-foreground" aria-label="Close alert details">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ul className="space-y-1.5">
                {highMatchHeadlines.map((headline) => (
                  <li key={headline.id} className="text-sm text-foreground flex justify-between items-center">
                    <span>{headline.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">{headline.match_percent}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Intelligence Panel */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[18px] py-3.5 border-b border-border flex justify-between items-center">
              <h2 className="text-sm font-bold tracking-tight">Inquiry Intelligence</h2>
              <div className="flex gap-1">
                {tabItems.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === key
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-[18px]">
              {/* Today Tab */}
              {activeTab === 'today' && (
                <div className="max-h-[400px] overflow-y-auto">
                  {filteredToday.length > 0 ? (
                    filteredToday.map((headline) => (
                      <HeadlineItem key={headline.id} headline={headline} />
                    ))
                  ) : (
                    <div className="p-8 text-muted-foreground text-center text-sm">No headlines for today</div>
                  )}
                </div>
              )}

              {/* Overall Tab */}
              {activeTab === 'overall' && (
                <>
                  <DateRangeSelector />
                  <div className="max-h-[400px] overflow-y-auto mt-3">
                    {filteredOverall.length > 0 ? (
                      filteredOverall.map((headline) => (
                        <HeadlineItem key={headline.id} headline={headline} />
                      ))
                    ) : (
                      <div className="p-8 text-muted-foreground text-center text-sm">Overall headlines unavailable</div>
                    )}
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Landing };
