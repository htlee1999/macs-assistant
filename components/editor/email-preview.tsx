import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCitationsBar } from '@/components/ui/documents-bar';
import { useRecordId } from '@/components/recordIdContext';
import { MessageSquare, Info, FileText, Maximize2, Minimize2 } from 'lucide-react';
import type { Record } from '@/lib/db/schema';
import { StatusSelector, type RecordStatus } from '../editor/status-selector';

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
}

const EmailPreview = ({
  recordId,
  details,
  record,
  isEditorVisible,
  onToggleEditor,
}: EmailPreviewProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const { setOpen, setOpenMobile, isMobile, open, openMobile } = useCitationsBar();
  const { setRecordId } = useRecordId();

  // Get the reply directly from the record prop
  const hasReply = !!record.reply;

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
    setIsMinimized(true);
    onToggleEditor();
  };

  if (!details) return null;

  // UI status button (shows actual status from record)
  const StatusButton = () => {
    return (
      <StatusSelector
        initialStatus={(record.outcome as RecordStatus) || 'Open'}
        recordId={recordId}
      />
    );
  };

  return (
    <div className="flex flex-col min-w-0 flex-1 pt-4">
      <motion.div
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <Card className={`w-full bg-card transition-all duration-5000 ${isMinimized && 'mb-2'}`}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <CardTitle>{details.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <StatusButton />
                {/* Only show buttons if email is not replied AND editor is not visible */}
                {!hasReply && !isEditorVisible && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleCreateDraft}
                        variant="outline"
                        className="md:px-2 md:h-fit"
                      >
                        Create Draft
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Create a new draft</TooltipContent>
                  </Tooltip>
                )}

                {/* Only show Information and Minimize buttons if editor is visible AND email is not replied */}
                {!hasReply && isEditorVisible && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className="md:px-2 md:h-fit"
                        >
                          <Info size={16} />

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
                          <FileText size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View Sources & Related Emails</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => {
                            setIsMinimized(!isMinimized);
                          }}
                          variant="outline"
                          className="md:px-2 md:h-fit"
                        >

                          {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isMinimized ? 'Expand email' : 'Minimize email'}
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          {!isMinimized && (
            <>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm">
                  {details.content}
                </div>
                {/* Summary Button Inside Card Content */}

              </CardContent>

              {/* Reply section (only shown when a reply exists) */}
              {hasReply && (
                <CardFooter className="px-6 pt-0 pb-6">
                  <div className="mt-4 border-t pt-4 w-full">
                    <div className="flex items-center mb-2">
                      <div className="flex items-center text-sm font-medium text-blue-600">
                        <MessageSquare size={16} className="mr-2" />
                        Sent reply
                      </div>
                    </div>

                    <div className="whitespace-pre-wrap text-sm bg-blue-50 dark:bg-blue-950/30 p-4 rounded-md border border-blue-100 dark:border-blue-900 shadow-sm">
                      {record.reply}
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
};

export default memo(EmailPreview);