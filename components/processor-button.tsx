'use client'
import { useState } from 'react';
import { useProcessorContext } from './daily-processor'; // Adjust the import path as needed
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from './ui/dialog'; 
import { Button } from './ui/button';

export const ProcessorButton = () => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { triggerDailyProcess, isProcessing } = useProcessorContext();

  const handleProcessorClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    await triggerDailyProcess();
    setShowConfirmation(false);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  return (
    <>
      <Button 
        onClick={handleProcessorClick}
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Run Daily Processor'}
      </Button>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Daily Process</DialogTitle>
            <DialogDescription>
              Are you sure you want to run the daily processor? This will process all unprocessed records,
              delete old headlines, and generate new ones.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProcessorButton;