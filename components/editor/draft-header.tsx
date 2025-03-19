'use client';

import { ModelSelector } from '@/components/model-selector';
import { memo, useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { MailPlus, FileText, X } from 'lucide-react';
import CSVChunksProcessor from './csv-chunks'; // You'll create this component

function PureDraftHeader({
  selectedModelId,
  userId = "user-123",
  recordId
}: {
  recordId: string;
  selectedModelId: string;
  userId: string;
}
) {
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);

  const handleGenerateRecord = async () => {
    // Generate a new record using the userId
    // Get the first record from the array
    const response = await fetch(`/api/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    // Do something with the generated record
    console.log('Generated new record:', response);

    // Here you would typically:
    // 1. Save to your state/store
    // 2. Post to your API
    // 3. Update UI accordingly
  };

  const openCSVModal = () => {
    setIsCSVModalOpen(true);
  };

  const closeCSVModal = () => {
    setIsCSVModalOpen(false);
  };

  return (
    <>
      <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
        <SidebarTrigger />
        <ModelSelector
          selectedModelId={selectedModelId}
          className="order-1 md:order-2"
        />
        <button
          className="order-2 md:order-1 p-1.5 rounded-md border"
          onClick={handleGenerateRecord}>
          <MailPlus className="h-5 w-5" />
        </button>
        <button
          className="order-3 p-1.5 rounded-md border bg-blue-50 hover:bg-blue-100"
          onClick={openCSVModal}
          title="Process CSV Chunks">
          <FileText className="h-5 w-5 text-blue-600" />
        </button>
      </header>

      {/* CSV Chunks Modal */}
      {isCSVModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">CSV Chunk Processor</h2>
              <button 
                onClick={closeCSVModal}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-grow p-4">
              <CSVChunksProcessor />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const DraftHeader = memo(PureDraftHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId && prevProps.recordId === nextProps.recordId;
});