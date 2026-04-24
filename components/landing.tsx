'use client';
import { useEffect, useState } from 'react';
import { generateUUID } from '@/lib/utils';
import { DraftHeader } from '@/components/editor/draft-header';
import type { Headline } from '@/lib/db/schema'
import { useProcessorContext } from '@/components/daily-processor';
import { ProcessorButton } from '@/components/processor-button';
import { AlertTriangle, X, ChevronRight, ChevronDown, Inbox, FileText, CheckCircle, TrendingUp } from 'lucide-react';
import '@/app/globals.css';

const Landing = ({ selectedModelId }: { selectedModelId: string }) => {
  const tempId = generateUUID();

  const [loading, setLoading] = useState<boolean>(true);
  const [filteredToday, setFilteredToday] = useState<Headline[]>([]);
  const [filteredOverall, setFilteredOverall] = useState<Headline[]>([]);
  const [filteredEvergreen, setFilteredEvergreen] = useState<{ [key: string]: Headline[] }>({});
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isAlertExpanded, setIsAlertExpanded] = useState<boolean>(false);
  const [expandedHeadline, setExpandedHeadline] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('today');

  const { headlines } = useProcessorContext();

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
      const evergreenHeadlines = filteredByDate.filter((headline) => headline.type === 'evergreen');

      const groupedEvergreenHeadlines: { [key: string]: Headline[] } = {};
      evergreenHeadlines.forEach((headline) => {
        const topic = headline.topic || 'Uncategorized';
        if (!groupedEvergreenHeadlines[topic]) {
          groupedEvergreenHeadlines[topic] = [];
        }
        groupedEvergreenHeadlines[topic].push(headline);
      });

      setFilteredToday(todayHeadlines);
      setFilteredOverall(overallHeadlines);
      setFilteredEvergreen(groupedEvergreenHeadlines);

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

  const toggleExpandTopic = (topic: string) => {
    setExpandedTopic(expandedTopic === topic ? null : topic);
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
            {headline.examples.split("|").map((example, index) => (
              <div key={index} className="text-[11.5px] text-muted-foreground px-2.5 py-1.5 bg-background rounded-md mb-1 font-mono">
                &ldquo;{example.trim()}&rdquo;
              </div>
            ))}
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
    { key: 'evergreen', label: 'Evergreen Topics' },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <DraftHeader userId="" recordId={tempId} selectedModelId={selectedModelId} />

      <div className="flex flex-1 flex-col items-center justify-start overflow-y-auto py-7 px-8 bg-background">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight mb-0.5">Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="flex gap-3 mb-4">
            <MetricCard label="Today" value={filteredToday.length} sub="today's headlines" icon={Inbox} accentClass="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" />
            <MetricCard label="Overall" value={filteredOverall.length} sub="overall patterns" icon={FileText} accentClass="bg-[hsl(var(--amber-bg))] text-[hsl(var(--amber-foreground))]" />
            <MetricCard label="Topics" value={Object.keys(filteredEvergreen).length} sub="evergreen topics" icon={CheckCircle} accentClass="bg-[hsl(var(--teal-bg))] text-[hsl(var(--teal-foreground))]" />
            <MetricCard label="Alerts" value={highMatchHeadlines.length} sub="campaign alerts" icon={TrendingUp} accentClass="bg-destructive/10 text-destructive" />
          </div>

          {/* Alert Bar */}
          {hasHighMatch && !isAlertExpanded && (
            <div className="mb-4 p-3 rounded-[10px] flex items-center gap-2.5 bg-destructive/10 border border-destructive/20 cursor-pointer" onClick={() => setIsAlertExpanded(true)}>
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
              <span className="flex-1 text-[12.5px] font-medium text-destructive">
                Possible write-in campaign detected — {highMatchHeadlines.length} headline(s) above 10% match threshold
              </span>
              <button onClick={(e) => { e.stopPropagation(); setIsAlertExpanded(false); }} className="text-muted-foreground p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isAlertExpanded && hasHighMatch && (
            <div className="mb-4 p-4 rounded-[10px] bg-destructive/5 border border-destructive/15">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-sm text-destructive">Campaign Alert Details</h4>
                <button onClick={() => setIsAlertExpanded(false)} className="text-muted-foreground p-0.5 hover:text-foreground">
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

              {/* Evergreen Tab */}
              {activeTab === 'evergreen' && (
                <>
                  <DateRangeSelector />
                  <div className="max-h-[400px] overflow-y-auto mt-3">
                    {Object.entries(filteredEvergreen).length > 0 ? (
                      Object.entries(filteredEvergreen).map(([topic, topicHeadlines]) => {
                        const isOpen = expandedTopic === topic;
                        return (
                          <div key={topic} className="border border-border rounded-[10px] overflow-hidden mb-2 bg-card">
                            <button
                              className={`w-full text-left px-4 py-3 flex justify-between items-center ${isOpen ? 'bg-background' : ''}`}
                              onClick={() => toggleExpandTopic(topic)}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md bg-[hsl(var(--amber-bg))] text-[hsl(var(--amber-foreground))]">
                                  {topic}
                                </span>
                              </div>
                              {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                            </button>
                            {isOpen && (
                              <div className="px-4 pb-3.5 border-t border-border/50">
                                {Array.isArray(topicHeadlines) &&
                                  topicHeadlines.map((headline) => (
                                    <div key={headline.id} className="mt-3">
                                      <h4 className="font-semibold text-[13px] text-foreground mb-1">{headline.title}</h4>
                                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">{headline.desc}</p>

                                      {headline.score && (
                                        <p className="text-xs mb-1.5">
                                          <span className="text-muted-foreground">Sentiment: </span>
                                          <span className={`font-medium capitalize ${headline.score === "positive" ? "text-[hsl(var(--teal-foreground))]" : headline.score === "negative" ? "text-destructive" : "text-muted-foreground"}`}>
                                            {headline.score}
                                          </span>
                                        </p>
                                      )}

                                      {headline.examples && (
                                        <div className="space-y-1">
                                          {headline.examples.split("|").map((example: string, index: number) => (
                                            <div key={index} className="text-[11px] text-muted-foreground px-2.5 py-1.5 bg-background rounded-md font-mono">
                                              &ldquo;{example.trim()}&rdquo;
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-muted-foreground text-center text-sm">No evergreen topics available</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <ProcessorButton />
    </div>
  );
};

export { Landing };
