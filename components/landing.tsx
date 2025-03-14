'use client';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { generateUUID } from '@/lib/utils';
import { DraftHeader } from '@/components/editor/draft-header';
import * as Tabs from '@radix-ui/react-tabs';
import '@/app/globals.css';

interface Headline {
  id: string;
  title: string;
  match_percent: number;
  desc: string;
  entities: string;
  examples: string;
  category: string;
  date_processed: string;
  type: 'today' | 'overall' | 'evergreen'; // assuming each headline has a 'type' field
}

const Landing = ({ selectedModelId }: { selectedModelId: string }) => {
  const router = useRouter();
  const tempId = generateUUID(); // Generate a temporary ID for the header

  // State hooks for headlines
  const [loading, setLoading] = useState<boolean>(true);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [filteredToday, setFilteredToday] = useState<Headline[]>([]);
  const [filteredOverall, setFilteredOverall] = useState<Headline[]>([]);
  const [filteredEvergreen, setFilteredEvergreen] = useState<Headline[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isAlertExpanded, setIsAlertExpanded] = useState<boolean>(false);
  const [expandedHeadline, setExpandedHeadline] = useState<string | null>(null);

  // Memoize the triggerSaveNewHeadlines function with useCallback
  // const triggerSaveNewHeadlines = useCallback(async () => {
  //   try {
  //     const res = await fetch('/api/headlines', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     });

  //     if (res.ok) {
  //       console.log('New headlines saved');
  //     } else {
  //       console.error('Failed to save new headlines');
  //     }
  //   } catch (error) {
  //     console.error('Error saving new headlines:', error);
  //   }
  // }, []);

  // Memoize the fetchHeadlines function with useCallback
  // const fetchHeadlines = useCallback(async () => {
  //   try {
  //     const res = await fetch('/api/headlines', {
  //       method: 'GET',
  //       headers: {
  //       'Content-Type': 'application/json',
  //       },
  //     });

  //     if (res.ok) {
  //       const data = await res.json();
  //       if (data && data.length > 0) {
  //         setHeadlines(data);
  //        } // Store all headlines if valid data is returned
  //       //  else {
  //       //   triggerSaveNewHeadlines(); // Trigger save if headlines are empty or null
  //       // }
  //     } else {
  //       console.error('Failed to fetch headlines');
  //     }
  //   } catch (error) {
  //     console.error('Error fetching headlines:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);

  // Fetch headlines once when the component mounts (empty dependency array)
  // useEffect(() => {
  //   fetchHeadlines();
  // }, []);

  // Process the headlines only when `headlines` changes
  useEffect(() => {
  const processHeadlines = () => {
    if (headlines.length > 0) {
      const today = new Date().setHours(0, 0, 0, 0); // Get today's date at midnight

      // Check if any headlines are earlier than today
      const hasOldHeadlines = headlines.some((headline) => {
        const headlineDate = new Date(headline.date_processed).setHours(0, 0, 0, 0);
        return headlineDate < today;
      });

      if (hasOldHeadlines || headlines.length === 0) {
        // triggerSaveNewHeadlines(); // Trigger save if headlines are outdated or empty
      }

      // Filter headlines by selected date range
      const filteredByDate = headlines.filter((headline) => {
        const headlineDate = new Date(headline.date_processed);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        return (
          (!start || headlineDate >= start) &&
          (!end || headlineDate <= end)
        );
      });

      // Filter by type (today vs overall)
      const todayHeadlines = filteredByDate.filter((headline) => headline.type === 'today');
      const overallHeadlines = filteredByDate.filter((headline) => headline.type === 'overall');
      const evergreenHeadlines = filteredByDate.filter((headline) => headline.type === 'evergreen');

      setFilteredToday(todayHeadlines);
      setFilteredOverall(overallHeadlines);
      setFilteredEvergreen(evergreenHeadlines);
    }
  };

    processHeadlines();
  }, [headlines, ]);
  //fetchheadlines used to be here^

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    if (type === 'start') {
      setStartDate(e.target.value);
    } else if (type === 'end') {
      setEndDate(e.target.value);
    }
  };

  const startNewDraft = () => {
    const id = generateUUID();
    router.push(`/record/${id}`);
  };

  // Function to toggle the expanded state
  const toggleExpand = (id: string) => {
    setExpandedHeadline(expandedHeadline === id ? null : id); // Toggle the expanded headline
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DraftHeader userId="" recordId={tempId} selectedModelId={selectedModelId} />
  
      <div className="flex flex-1 flex-col items-center justify-start p-4 bg-background">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Welcome to Drafting Assistant</CardTitle>
            <CardDescription className="text-lg mt-2">
              Craft perfect emails with AI-powered assistance
            </CardDescription>
          </CardHeader>
  
          <CardContent>
            {(() => {
              const highMatchHeadlines = filteredOverall.filter(headline => headline.match_percent >= 10);
              const hasHighMatch = highMatchHeadlines.length > 0;
              const alertColor = hasHighMatch ? "bg-red-500" : "bg-green-500";
              const alertMessage = hasHighMatch ? "Possible Write-In Campaign detected" : "No Special Alerts";
  
              return (
                <div>
                  {/* Clickable Alert Bar */}
                  <div
                    className={`flex justify-between items-center ${alertColor} text-white py-2 px-4 mb-6 shadow-md rounded-md cursor-pointer`}
                    onClick={() => setIsAlertExpanded(!isAlertExpanded)}
                  >
                    <span>{alertMessage}</span>
                    {hasHighMatch && (
                      <span className="text-sm underline">{isAlertExpanded ? "Hide Details" : "View Details"}</span>
                    )}
                  </div>
  
                  {/* Expanded Details - Show only when isAlertExpanded is true */}
                  {isAlertExpanded && hasHighMatch && (
                    <div className="bg-red-100 text-red-800 p-4 rounded-md shadow-md mb-6">
                      <h4 className="font-semibold mb-2">Affected Headlines:</h4>
                      <ul className="list-disc list-inside text-sm">
                        {highMatchHeadlines.map((headline) => (
                          <li key={headline.id}>
                            {headline.title} - <strong>{headline.match_percent}%</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
  
            {/* Tab Navigation for Headlines */}
            <Tabs.Root defaultValue="today" className="w-full">
            <Tabs.List className="flex justify-around bg-gray-100 p-2 mt-4 rounded-lg shadow-md">
              <Tabs.Trigger
                value="today"
                className="px-6 py-2 font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=inactive]:bg-grey-600 data-[state=inactive]:text-black hover:bg-grey-500 hover:text-white"
              >
                Today&apos;s Headlines
              </Tabs.Trigger>

              <Tabs.Trigger
                value="overall"
                className="px-6 py-2 font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=inactive]:bg-grey-600 data-[state=inactive]:text-black hover:bg-grey-500 hover:text-white"
              >
                Overall Headlines
              </Tabs.Trigger>

              <Tabs.Trigger
                value="evergreen"
                className="px-6 py-2 font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=inactive]:bg-grey-600 data-[state=inactive]:text-black hover:bg-grey-500 hover:text-white"
              >
                Evergreen Topics
              </Tabs.Trigger>
            </Tabs.List>
  
              {/* Today's Headlines */}
              <Tabs.Content value="today">
                <div className="max-h-[400px] overflow-y-auto">
                  {filteredToday.length > 0 ? (
                    filteredToday.map((headline) => (
                      <div key={headline.id} className="border-t border-muted mt-4">
                        <button className="w-full text-left py-2 px-4" onClick={() => toggleExpand(headline.id)}>
                          <h4 className="text-base font-semibold">{headline.title}</h4>
                                                  {/* Fading description */}
                                                  <p
                            className={`text-sm text-muted-foreground transition-all ${
                              expandedHeadline === headline.id ? 'max-h-none mask-none' : 'max-h-12 fade-mask'
                            }`}
                          >
                            {headline.desc}
                          </p>
                        </button>
                        {expandedHeadline === headline.id && (
                          <div className="px-4 py-2 text-sm text-muted-foreground">
                            {headline.match_percent && (
                              <p className="font-medium text-gray-600">
                                <strong>Match Percentage:</strong> {headline.match_percent}%
                              </p>
                            )}
                            {headline.examples && (
                              <div className="mt-2">
                                <strong>Examples:</strong>
                                <ul className="list-disc list-inside mt-1">
                                  {headline.examples.split("|").map((example, index) => (
                                    <li key={index} className="text-gray-500">{example.trim()}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 mt-4 bg-gray-100 text-gray-500 text-center rounded-md shadow-sm">No Headlines for Today</div>
                  )}
                </div>
              </Tabs.Content>
  


              {/* Overall Headlines Tab*/}
              <Tabs.Content value="overall">
                  
                {/* Date Range Selector and Confirm Button */}
                <div className="flex gap-6 p-4 mt-4 bg-gray-50 rounded-md shadow-sm">
                  <div className="flex flex-col flex-1">
                    <label htmlFor="startDate" className="mb-2 text-sm">Start Date</label>
                    <input id="startDate" type="date" value={startDate} onChange={(e) => handleDateChange(e, 'start')} className="px-4 py-2 border rounded-md text-xs" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <label htmlFor="endDate" className="mb-2 text-sm">End Date</label>
                    <input id="endDate" type="date" value={endDate} onChange={(e) => handleDateChange(e, 'end')} className="px-4 py-2 border rounded-md text-xs" />
                  </div>
                  <div className="flex flex-col flex-1 justify-end">
                    <button className="py-2 px-6 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700">Confirm</button>
                  </div>
                </div>
                
                {/* Overall Headlines List*/}
                <div className="max-h-[400px] overflow-y-auto">
                  {filteredOverall.length > 0 ? (
                    filteredOverall.map((headline) => (
                      <div key={headline.id} className="border-t border-muted mt-4">
                        <button className="w-full text-left py-2 px-4" onClick={() => toggleExpand(headline.id)}>
                          <h4 className="text-base font-semibold">{headline.title}</h4>
                          {/* Fading description */}
                          <p
                            className={`text-sm text-muted-foreground transition-all ${
                              expandedHeadline === headline.id ? 'max-h-none mask-none' : 'max-h-12 fade-mask'
                            }`}
                          >
                            {headline.desc}
                          </p>
                        </button>
                        {expandedHeadline === headline.id && (
                          <div className="px-4 py-2 text-sm text-muted-foreground">
                            {headline.match_percent && (
                              <p className="font-medium text-gray-600">
                                <strong>Match Percentage:</strong> {headline.match_percent}%
                              </p>
                            )}
                            {headline.examples && (
                              <div className="mt-2">
                                <strong>Examples:</strong>
                                <ul className="list-disc list-inside mt-1">
                                  {headline.examples.split("|").map((example, index) => (
                                    <li key={index} className="text-gray-500">{example.trim()}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 mt-4 bg-gray-100 text-gray-500 text-center rounded-md shadow-sm">Overall Headlines Unavailable</div>
                  )}
                </div>
              </Tabs.Content>
  


              {/* Evergreen Topics Tab */}
              <Tabs.Content value="evergreen">

                {/* Date Range Selector and Confirm Button */}
                <div className="flex gap-6 p-4 mt-4 bg-gray-50 rounded-md shadow-sm">
                  <div className="flex flex-col flex-1">
                    <label htmlFor="startDate" className="mb-2 text-sm">Start Date</label>
                    <input id="startDate" type="date" value={startDate} onChange={(e) => handleDateChange(e, 'start')} className="px-4 py-2 border rounded-md text-xs" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <label htmlFor="endDate" className="mb-2 text-sm">End Date</label>
                    <input id="endDate" type="date" value={endDate} onChange={(e) => handleDateChange(e, 'end')} className="px-4 py-2 border rounded-md text-xs" />
                  </div>
                  <div className="flex flex-col flex-1 justify-end">
                    <button className="py-2 px-6 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700">Confirm</button>
                  </div>
                </div>

                {/* Evergreen Topics List */}
                <div className="max-h-[400px] overflow-y-auto">
                  {filteredEvergreen.length > 0 ? (
                    filteredEvergreen.map((headline) => (
                      <div key={headline.id} className="border-t border-muted mt-4">
                        <button className="w-full text-left py-2 px-4" onClick={() => toggleExpand(headline.id)}>
                          <h4 className="text-base font-semibold">{headline.title}</h4>
                        </button>
                        {expandedHeadline === headline.id && (
                          <div className="px-4 py-2 text-sm text-muted-foreground">
                            {headline.match_percent && (
                              <p className="font-medium text-gray-600">
                                <strong>Match Percentage:</strong> {headline.match_percent}%
                              </p>
                            )}
                            <p className="mb-2">
                              <strong>Description:</strong> {headline.desc}
                            </p>
                            {headline.examples && (
                              <div className="mt-2">
                                <strong>Examples:</strong>
                                <ul className="list-disc list-inside mt-1">
                                  {headline.examples.split("|").map((example, index) => (
                                    <li key={index} className="text-gray-500">{example.trim()}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 mt-4 bg-gray-100 text-gray-500 text-center rounded-md shadow-sm">No Evergreen Topics Available</div>
                  )}
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { Landing };