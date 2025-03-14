import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import Link from 'next/link';
import type { User } from 'next-auth';
import { useState, useMemo, useEffect, useCallback } from 'react'; 
import useSWR, { mutate } from 'swr';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { SearchIcon, ArrowUpIcon, EyeIcon } from '@/components/ui/icons'; 
import { CheckIcon, MessageCircleIcon, FilterIcon, XIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import type { Record } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { type EmailOutcome } from '../editor/status-selector';

type GroupedRecords = {
  today: Record[];
  yesterday: Record[];
  lastWeek: Record[];
  lastMonth: Record[];
  older: Record[];
};

type RecordItemProps = {
  record: Record;
  outcomeOverrides: Map<string, EmailOutcome>;
};

// Helper function to determine outcome from record
const getRecordOutcome = (record: Record, outcomeOverride?: EmailOutcome): EmailOutcome => {
  if (record.reply) return 'Replied';
  
  if (outcomeOverride) return outcomeOverride;
  
  if (record.outcome === 'Vetted') return 'Vetted';
  if (record.outcome === 'Draft') return 'Draft';
  if (record.outcome === 'Open') return 'Open';
  if (record.outcome === 'Replied') return 'Replied';
  
  return 'Open';
};

const RecordItem = ({ record, outcomeOverrides }: RecordItemProps) => {
  const outcome = getRecordOutcome(record, outcomeOverrides.get(record.id));
  
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link href={`/record/${record.id}`}>
          <div className="flex items-center justify-between w-full">
            <span className="truncate mr-2">{record.caseType} at {record.location}</span>
            <div className="flex items-center gap-1 shrink-0">
              {outcome === 'Vetted' && (
                <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex items-center">
                  <CheckIcon className="size-3 mr-1" />
                  Vetted
                </span>
              )}
              {outcome === 'Draft' && (
                <span className="text-xs text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full">
                  Draft
                </span>
              )}
              {outcome === 'Replied' && (
                <span className="text-xs text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full flex items-center">
                  <MessageCircleIcon className="size-3 mr-1" />
                  Replied
                </span>
              )}
            </div>
          </div>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

// New FilterDropdown component using Radix UI DropdownMenu
type FilterDropdownProps = {
  label: string;
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
};

const FilterDropdown = ({ label, options, selectedValues, onSelectionChange }: FilterDropdownProps) => {
  const allOptions = ['All', ...options.filter(Boolean)];
  
  const handleItemClick = (value: string) => {
    if (value === 'All') {
      // If "All" is clicked, clear the selection (which means show all)
      onSelectionChange([]);
    } else {
      // Toggle the selected item
      const newSelectedValues = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value];
      
      onSelectionChange(newSelectedValues);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex justify-between items-center w-full px-3 py-2 text-sm rounded-md border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground ml-1">
          {selectedValues.length === 0 ? 'All' : `${selectedValues.length} selected`}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allOptions.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={option === 'All' ? selectedValues.length === 0 : selectedValues.includes(option)}
            onSelect={(e) => {
              e.preventDefault();
              handleItemClick(option);
            }}
          >
            {option}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export function SidebarHistory({ user }: { user: User | undefined }) {
  const [hasGeneratedSummary, setHasGeneratedSummary] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const summaryGenerated = sessionStorage.getItem('summaryGenerated');
      if (summaryGenerated) {
        setHasGeneratedSummary(true); 
      }
    }
  }, []);
  
  const {
    data: history,
    isLoading,
  } = useSWR<Array<Record>>(
    user 
      ? hasGeneratedSummary 
        ? '/api/records' 
        : '/api/records?generateSummary=true' 
      : null, 
    fetcher,
    {
      fallbackData: [],
      onSuccess: () => {
        if (!hasGeneratedSummary) {
          // Set the flag in sessionStorage after the first request
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('summaryGenerated', 'true');
          }
          setHasGeneratedSummary(true);
        }
      },
    }
  );

  const [searchQuery, setSearchQuery] = useState(''); 
  const [isSearchOpen, setIsSearchOpen] = useState(false); 
  const [filterType, setFilterType] = useState<'all' | 'drafts' | 'vetted' | 'replied'>('all');
  const [showMoreFilters, setShowMoreFilters] = useState(false); 
  const [selectedFilters, setSelectedFilters] = useState({
    sectionCode: [] as string[],
    channel: [] as string[],  
    category: [] as string[],   
  });

  const [outcomeOverrides, setOutcomeOverrides] = useState<Map<string, EmailOutcome>>(new Map());

  // Expose the mutate function to window for global access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshSidebarHistory = () => {
        console.log('Refreshing sidebar history...');
        mutate('/api/records');
      };
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).refreshSidebarHistory;
      }
    };
  }, []);

  useEffect(() => {
    if (history && history.length > 0) {
      setOutcomeOverrides(prev => {
        const newOverrides = new Map(prev);
        let hasChanges = false;
        
        history.forEach(record => {
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
  }, [history]);

  // Function to manually update an outcome in the local state before API finishes
  const updateLocalOutcome = useCallback((recordId: string, outcome: EmailOutcome) => {
    setOutcomeOverrides(prev => {
      const newOverrides = new Map(prev);
      newOverrides.set(recordId, outcome);
      return newOverrides;
    });
  }, []);

  // Expose this function to window as well for direct updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).updateSidebarItemOutcome = (recordId: string, outcome: EmailOutcome) => {
        console.log(`Updating sidebar item outcome: ${recordId} -> ${outcome}`);
        updateLocalOutcome(recordId, outcome);
      };
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).updateSidebarItemOutcome;
      }
    };
  }, [updateLocalOutcome]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  const toggleFilter = () => {
    // Cycle through filter options: all -> drafts -> vetted -> replied -> all
    setFilterType(current => {
      if (current === 'all') return 'drafts';
      if (current === 'drafts') return 'vetted';
      if (current === 'vetted') return 'replied';
      return 'all';
    });
  };

  const toggleMoreFilters = () => {
    setShowMoreFilters(!showMoreFilters);
  };
  
  const handleFilterChange = (field: string, values: string[]) => {
    setSelectedFilters(prev => ({ ...prev, [field]: values }));
  };

  const getFilterButtonClass = () => {
    if (filterType === 'all') return '';
    if (filterType === 'drafts') return 'bg-amber-100 text-amber-500';
    if (filterType === 'vetted') return 'bg-green-100 text-green-600';
    if (filterType === 'replied') return 'bg-blue-100 text-blue-500';
    return '';
  };
  
  const getFilterTooltip = () => {
    if (filterType === 'all') return 'Filter: Show All';
    if (filterType === 'drafts') return 'Filter: Drafts Only';
    if (filterType === 'vetted') return 'Filter: Vetted Only';
    if (filterType === 'replied') return 'Filter: Replied Only';
    return 'Filter';
  };

  const resetFilters = () => {
    setSelectedFilters({
      sectionCode: [],
      channel: [],
      category: [],
    });
  };  

  // Memoizing the grouping logic to avoid unnecessary recomputations
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
        {
          today: [],
          yesterday: [],
          lastWeek: [],
          lastMonth: [],
          older: [],
        } as GroupedRecords
      );
    };
  }, []);

  // Get unique options for each filter
  const filterOptions = useMemo(() => {
    if (!history) return { sectionCode: [], channel: [], category: [] };
    
    return {
      sectionCode: Array.from(new Set(history.map(record => record.sectionCode).filter(Boolean))),
      channel: Array.from(new Set(history.map(record => record.channel).filter(Boolean))),
      category: Array.from(new Set(history.map(record => record.category).filter(Boolean))),
    };
  }, [history]);

  const filteredRecords = useMemo(() => {
    let filtered = history || [];
  
    // Search query filter
    if (searchQuery.trim() !== '') {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        (record.caseType?.toLowerCase().includes(lowercasedQuery) ||
         record.location?.toLowerCase().includes(lowercasedQuery))
      );
    }
  
    // Apply sectionCode filter
    if (selectedFilters.sectionCode.length > 0) {
      filtered = filtered.filter(record => selectedFilters.sectionCode.includes(record.sectionCode));
    }
  
    // Apply channel filter
    if (selectedFilters.channel.length > 0) {
      filtered = filtered.filter(record => selectedFilters.channel.includes(record.channel));
    }
  
    // Apply category filter
    if (selectedFilters.category.length > 0) {
      filtered = filtered.filter(record => selectedFilters.category.includes(record.category));
    }
  
    return filtered;
  }, [searchQuery, history, selectedFilters]);  

  // Memoizing filteredRecords based on drafts/vetted/replied filter
  const filteredByType = useMemo(() => {
    if (filterType === 'all') {
      return filteredRecords;
    } else if (filterType === 'drafts') {
      return filteredRecords.filter((record) => {
        const outcome = getRecordOutcome(record, outcomeOverrides.get(record.id));
        return outcome === 'Draft';
      });
    } else if (filterType === 'vetted') {
      return filteredRecords.filter((record) => {
        const outcome = getRecordOutcome(record, outcomeOverrides.get(record.id));
        return outcome === 'Vetted';
      });
    } else if (filterType === 'replied') {
      return filteredRecords.filter((record) => {
        const outcome = getRecordOutcome(record, outcomeOverrides.get(record.id));
        return outcome === 'Replied';
      });
    }
    return filteredRecords;
  }, [filteredRecords, filterType, outcomeOverrides]);

  // Group records by date
  const groupedRecords = useMemo(() => {
    return groupRecordsByDate(filteredByType);
  }, [filteredByType, groupRecordsByDate]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(selectedFilters).reduce((count, filters) => count + filters.length, 0);
  }, [selectedFilters]);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="flex items-center justify-between px-4 py-2">
            <div className="grow flex justify-center items-center">
              <button
                onClick={toggleSearch}
                className="p-2 rounded-full text-zinc-600 hover:text-zinc-800"
                title={isSearchOpen ? "Close Search" : "Search Records"}
              >
                {isSearchOpen ? <ArrowUpIcon  /> : <SearchIcon  />}
              </button>
              <button
                onClick={toggleFilter}
                className={`p-2 rounded-full hover:text-zinc-800 ml-2 ${getFilterButtonClass()}`}
                title={getFilterTooltip()}
              >
                <EyeIcon />
              </button>
              <button
                onClick={toggleMoreFilters}
                className={`p-2 rounded-full hover:text-zinc-800 ml-2 relative ${showMoreFilters ? 'bg-blue-100 text-blue-600' : ''}`}
                title="More Filters"
              >
                <FilterIcon className="size-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {isSearchOpen && (
            <div className="px-4 pb-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search records..."
                  className="w-full p-2 pl-8 pr-8 rounded-md border border-input"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    <XIcon className="size-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          )}
          
          {showMoreFilters && (
            <div className="px-4 py-2 space-y-3 border-t">
              <div className="space-y-2">
                <FilterDropdown
                  label="Section Code"
                  options={filterOptions.sectionCode}
                  selectedValues={selectedFilters.sectionCode}
                  onSelectionChange={(values) => handleFilterChange('sectionCode', values)}
                />
                
                <FilterDropdown
                  label="Channel"
                  options={filterOptions.channel}
                  selectedValues={selectedFilters.channel}
                  onSelectionChange={(values) => handleFilterChange('channel', values)}
                />
                
                <FilterDropdown
                  label="Category"
                  options={filterOptions.category}
                  selectedValues={selectedFilters.category}
                  onSelectionChange={(values) => handleFilterChange('category', values)}
                />
              </div>
              
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="w-full p-2 text-xs rounded-md bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
                >
                  <XIcon className="size-3 mr-1" />
                  Clear all filters
                </button>
              )}
            </div>
          )}

          <SidebarMenu>
            {isLoading ? (
              <div className="flex items-center justify-center p-4 flex-col">
                <div className="mb-2">Loading records...</div>
                <div className="w-16 h-1 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            ) : filteredByType.length === 0 ? (
              <div className="px-4 py-8 text-sm text-zinc-500 text-center">
                {isSearchOpen && searchQuery 
                  ? 'No matches found for your search'
                  : activeFilterCount > 0
                    ? 'No records match the selected filters'
                    : 'No records found'}
              </div>
            ) : (
              (() => {
                const renderRecordGroup = (groupLabel: string, groupKey: keyof typeof groupedRecords) => {
                  const group = groupedRecords[groupKey];
                  if (group.length > 0) {
                    return (
                      <>
                        <div className="px-2 py-1 text-xs text-sidebar-foreground/50 mt-6">{groupLabel}</div>
                        {group.map((record) => (
                          <RecordItem 
                            key={record.id} 
                            record={record} 
                            outcomeOverrides={outcomeOverrides}
                          />
                        ))}
                      </>
                    );
                  }
                  return null;
                };
                return (
                  <>
                    {renderRecordGroup('Today', 'today')}
                    {renderRecordGroup('Yesterday', 'yesterday')}
                    {renderRecordGroup('Last 7 days', 'lastWeek')}
                    {renderRecordGroup('Last 30 days', 'lastMonth')}
                    {renderRecordGroup('Older', 'older')}
                  </>
                );
              })()
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}