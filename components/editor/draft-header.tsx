'use client';

import { ModelSelector } from '@/components/model-selector';
import { memo } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { MailPlus } from 'lucide-react';




function PureDraftHeader({
  selectedModelId,
  userId = "user-123"
}: {
  recordId: string;
  selectedModelId: string;
  userId: string;
}
) {
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

  return (
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

    </header>
  );
}

export const DraftHeader = memo(PureDraftHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});