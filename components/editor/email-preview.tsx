import { memo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCitationsBar } from '@/components/ui/documents-bar';
import { useRecordId } from '@/components/recordIdContext';
import { MessageSquare, Info, FileText } from 'lucide-react';
import type { Record } from '@/lib/db/schema';
import { StatusSelector, type RecordStatus } from '../editor/status-selector';
import { cn } from "@/lib/utils";

// Screen size type
type ScreenSize = 'base' | 'md' | 'lg' | 'xl' | '2xl';

interface EmailPreviewProps {
  recordId: string;
  details: {
    id: string;
    title: string;
    content: string;
    summary: string | null;
  };
  record: Record;
  isEditorVisible: boolean;
  onToggleEditor: () => void;
  onContentExpand?: (expanded: boolean) => void;
}

const EmailPreview = ({
  recordId,
  details,
  record,
  isEditorVisible,
  onToggleEditor,
  onContentExpand,
}: EmailPreviewProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [contentOverflows, setContentOverflows] = useState(false);
  const [screenSize, setScreenSize] = useState<ScreenSize>('base');
  const contentRef = useRef<HTMLDivElement>(null);
  const { setOpen, setOpenMobile, isMobile, open, openMobile } = useCitationsBar();
  const { setRecordId } = useRecordId();

  // Get the reply directly from the record prop
  const hasReply = !!record.reply;

  // Set up responsive screen size detection with custom breakpoints
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 2000) {
        setScreenSize("2xl");
      } else if (window.innerWidth >= 1800) {
        setScreenSize("xl");
      } else if (window.innerWidth >= 1500) {
        setScreenSize("lg");
      } else if (window.innerWidth >= 1200) {
        setScreenSize("md");
      } else {
        setScreenSize("base");
      }
    }
    
    // Set initial screen size
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get text size class based on current screen size
  const getTextSize = () => {
    switch(screenSize) {
      case '2xl': return 'text-3xl';
      case 'xl': return 'text-2xl';
      case 'lg': return 'text-xl';
      case 'md': return 'text-lg';
      default: return 'text-base';
    }
  };

  // Get heading size class based on current screen size
  const getHeadingSize = () => {
    switch(screenSize) {
      case '2xl': return 'text-4xl';
      case 'xl': return 'text-3xl';
      case 'lg': return 'text-2xl';
      case 'md': return 'text-xl';
      default: return 'text-lg';
    }
  };

  // Get button text size
  const getButtonTextSize = () => {
    switch(screenSize) {
      case '2xl': 
      case 'xl': return 'text-xl';
      case 'lg': return 'text-lg';
      case 'md': return 'text-base';
      default: return 'text-sm';
    }
  };

  // Get icon size
  const getIconSize = () => {
    switch(screenSize) {
      case '2xl': 
      case 'xl': return 'w-6 h-6';
      case 'lg': 
      case 'md': return 'w-5 h-5';
      default: return 'w-4 h-4';
    }
  };

  const handleOpenSidebar = () => {
    if (isMobile) {
      if (!openMobile) {
        setOpenMobile(true);
      }
    } else {
      if (!open) {
        setOpen(true);
      }
    }
    setRecordId(details.id);
  };

  const handleCreateDraft = () => {
    onToggleEditor();
  };

  // Toggle content expansion
  const toggleContentExpand = () => {
    if (contentOverflows) {
      const newExpandedState = !isContentExpanded;
      setIsContentExpanded(newExpandedState);
      
      // Notify parent component about the expansion state change
      if (onContentExpand) {
        onContentExpand(newExpandedState);
      }
    }
  };

  // Check if content overflows - adjusted for custom responsive breakpoints
  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        const element = contentRef.current;
        
        // Base height for text masking (3rem)
        const baseHeight = 48;
        
        // Scale factor based on screen size
        let scaleFactor;
        if (window.innerWidth >= 2000) {
          scaleFactor = 2;
        } else if (window.innerWidth >= 1800) {
          scaleFactor = 1.5;
        } else if (window.innerWidth >= 1500) {
          scaleFactor = 1.25;
        } else {
          scaleFactor = 1;
        }
        
        const hasOverflow = element.scrollHeight > (baseHeight * scaleFactor);
        setContentOverflows(hasOverflow);
      }
    };

    checkOverflow();
    
    // Add resize listener
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [details.content, screenSize]);

  useEffect(() => {
    // When a reply is added, make sure content is visible but not expanded
    if (hasReply) {
      setIsMinimized(false);
      setIsContentExpanded(false);
    }
  }, [hasReply]);

  if (!details) return null;

  // UI status button
  const StatusButton = () => {
    return (
      <StatusSelector
        initialStatus={(record.outcome as RecordStatus) || 'Open'}
        recordId={recordId}
      />
    );
  };

  // Calculate content container style
  const contentContainerStyle = hasReply ? {
    height: isContentExpanded ? '100%' : '50%',
    transition: 'height 0.3s ease'
  } : {};

  // Get max height for content truncation based on screen size
  const getMaxHeight = () => {
    switch(screenSize) {
      case '2xl': return 'max-h-24';
      case 'xl': return 'max-h-20';
      case 'lg': return 'max-h-16';
      case 'md': return 'max-h-14';
      default: return 'max-h-12';
    }
  };

  return (
    <div className="flex flex-col flex-1 pt-4 h-full">
      <motion.div
        className="w-full group/message h-full"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <Card className={`w-full h-full bg-card transition-all duration-500 flex flex-col ${isMinimized && 'mb-2'}`}>
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex justify-between items-start">
              <div className="space-y-1 flex items-center">
                {/* Responsive title with custom screen size */}
                <CardTitle className={getHeadingSize()}>
                  {details.title}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <StatusButton />
                {!hasReply && !isEditorVisible && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleCreateDraft}
                        variant="outline"
                        className={`md:px-2 md:h-fit ${getButtonTextSize()}`}
                      >
                        Create Draft
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Create a new draft</TooltipContent>
                  </Tooltip>
                )}
  
                {!hasReply && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className="md:px-2 md:h-fit"
                        >
                          <Info className={getIconSize()} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {details.summary ? details.summary : 'Loading summary...'}
                      </TooltipContent>
                    </Tooltip>
  
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleOpenSidebar}
                          variant="outline"
                          className="md:px-2 md:h-fit"
                        >
                          <FileText className={getIconSize()} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View Sources & Related Emails</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          {!isMinimized && (
            <>
              <CardContent className="px-6 py-0 flex-grow overflow-hidden">
                <div 
                  className="h-full overflow-y-auto pr-2"
                  style={contentContainerStyle}
                >
                  <div className="whitespace-pre-wrap py-4">
                    {!hasReply ? (
                      <div 
                        className={contentOverflows ? "cursor-pointer" : ""}
                        onClick={contentOverflows ? toggleContentExpand : undefined}
                      >
                        {/* Responsive content text with custom screen size */}
                        <p 
                          ref={contentRef}
                          className={cn(
                            getTextSize(),
                            "text-foreground transition-all",
                            contentOverflows && !isContentExpanded ? `${getMaxHeight()} fade-mask` : 'max-h-none mask-none'
                          )}
                        >
                          {details.content}
                        </p>
                        
                        {contentOverflows && (
                          <div className={`${screenSize === 'base' ? 'text-xs' : 'text-sm'} text-blue-500 mt-1`}>
                            {isContentExpanded ? 'Show less' : 'Show more'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className={contentOverflows ? "cursor-pointer" : ""}
                        onClick={contentOverflows ? toggleContentExpand : undefined}
                      >
                        {/* Responsive content text with custom screen size */}
                        <p 
                          ref={contentRef}
                          className={`${getTextSize()} text-foreground`}
                        >
                          {details.content}
                        </p>
                        
                        {contentOverflows && (
                          <div className={`${screenSize === 'base' ? 'text-xs' : 'text-sm'} text-blue-500 mt-1`}>
                            {isContentExpanded ? 'Show less' : 'Show more'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
  
              {hasReply && (
                <CardFooter className="px-6 pt-2 pb-6 flex-shrink-0 border-t">
                  <div className="w-full">
                    <div className="flex items-center mb-2">
                      <div className={`flex items-center ${screenSize === 'base' ? 'text-sm' : getTextSize()} font-semibold text-blue-600`}>
                        <MessageSquare className={`mr-2 ${getIconSize()}`} />
                        Your response
                      </div>
                    </div>
                    
                    <div className={`max-h-48 ${screenSize === 'md' ? 'max-h-64' : screenSize === 'lg' ? 'max-h-80' : screenSize === 'xl' || screenSize === '2xl' ? 'max-h-96' : ''} overflow-y-auto`}>
                      <div className={`whitespace-pre-wrap ${getTextSize()} p-4 rounded-md bg-blue-50 dark:bg-blue-950/30 shadow-sm`}>
                        {record.reply}
                      </div>
                    </div>
                  </div>
                </CardFooter>
              )}
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

export default memo(EmailPreview);