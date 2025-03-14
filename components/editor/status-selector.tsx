import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { toast } from 'sonner';

// Simple enum for status types
export type RecordStatus = 'Open' | 'Draft' | 'Vetted' | 'Replied';
export type EmailOutcome = RecordStatus;

interface StatusSelectorProps {
  initialStatus: RecordStatus;
  recordId: string;
  onStatusUpdate?: (newStatus: RecordStatus) => void;
}

export function StatusSelector({
  initialStatus,
  recordId,
  onStatusUpdate,
}: StatusSelectorProps) {
  const [open, setOpen] = useState(false);
  
  // Store the current status in state, initialized with initialStatus
  const [status, setStatus] = useState<RecordStatus>(initialStatus);
  
  const handleStatusClick = async (newStatus: RecordStatus) => {
    // Close the dropdown
    setOpen(false);
    
    // Keep track of the previous status for error handling
    const prevStatus = status;
    
    // Update state immediately for responsive UI
    setStatus(newStatus);
    
    // Call parent callback if provided
    if (onStatusUpdate) {
      onStatusUpdate(newStatus);
    }
    
    try {
      // Call the status API directly from StatusSelector
      const response = await fetch('/api/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordId: recordId,
          outcome: newStatus
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update sidebar if needed
      if (window && (window as any).refreshSidebarHistory) {
        (window as any).refreshSidebarHistory();
      }
      
      // Also update the sidebar item outcome directly if that function exists
      if (window && (window as any).updateSidebarItemOutcome) {
        (window as any).updateSidebarItemOutcome(recordId, newStatus);
      }
      
      // Show toast notification
      toast.success('Status updated successfully');

    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      
      // Revert to previous status on error
      setStatus(prevStatus);
      
      // Also revert the parent state if callback exists
      if (onStatusUpdate) {
        onStatusUpdate(prevStatus);
      }
    }
  };
  
  // For "Open" status - static badge
  if (status === 'Open') {
    return (
      <div className="flex items-center">
        <Button 
          variant="outline"
          className="border flex items-center gap-1 md:px-2 md:h-fit text-gray-500 border-gray-300 bg-white"
          disabled={true}
        >
          Open
        </Button>
      </div>
    );
  }
  
  
  // For "Draft" status
  if (status === 'Draft') {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                className="border flex items-center gap-1 md:px-2 md:h-fit text-amber-500 border-amber-500 bg-amber-100"
              >
                Draft
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Set status</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => handleStatusClick('Draft')}
            className="flex items-center gap-2 cursor-pointer font-medium"
          >
            <div className="size-4 flex items-center justify-center">
              <Check className="size-4" />
            </div>
            <span className="text-amber-500 font-medium">Draft</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleStatusClick('Vetted')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="size-4 flex items-center justify-center">
              {/* No check when not selected */}
            </div>
            <span className="text-green-600 font-medium">Vetted</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  // For "Vetted" status
  if (status === 'Vetted') {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                className="border flex items-center gap-1 md:px-2 md:h-fit text-green-600 border-green-600 bg-green-100"
              >
                Vetted
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Set status</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => handleStatusClick('Draft')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="size-4 flex items-center justify-center">
              {/* No check when not selected */}
            </div>
            <span className="text-amber-500 font-medium">Draft</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleStatusClick('Vetted')}
            className="flex items-center gap-2 cursor-pointer font-medium"
          >
            <div className="size-4 flex items-center justify-center">
              <Check className="size-4" />
            </div>
            <span className="text-green-600 font-medium">Vetted</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  // For "Replied" status - just in case it's used
  if (status === 'Replied') {
    return (
      <div className="flex items-center">
        <Button 
          variant="outline"
          className="border flex items-center gap-1 md:px-2 md:h-fit text-blue-500 border-blue-500 bg-blue-100"
          disabled={true}
        >
          Replied
        </Button>
      </div>
    );
  }
  
  // Fallback (should never happen)
  return null;
}