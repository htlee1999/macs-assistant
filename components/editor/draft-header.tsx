'use client';

import { ModelSelector } from '@/components/model-selector';
import { memo, useState, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { MailPlus, FileText, X } from 'lucide-react';
import Select from 'react-select';
import { components } from 'react-select'
import CSVChunksProcessor from './csv-chunks';

// Remove the imported createNewRecord function from queries.ts



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
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    message: '',
    category: '',
    location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outlets, setOutlets] = useState<any[]>([]); // State to hold the outlets data

useEffect(() => {
  const fetchOutlets = async () => {
    try {
      const response = await fetch('/outlets.json'); // Update with your JSON path
      if (!response.ok) {
        throw new Error('Failed to load outlets data');
      }
      const data = await response.json();
      setOutlets(data);
    } catch (error) {
      console.error('Error loading outlets:', error);
    }
  };
  fetchOutlets();
}, []);

  const closeNewRecordModal = () => {
    setIsNewRecordModalOpen(false);
    setNewRecord({ message: '', category: '', location: '' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewRecord(prev => ({ ...prev, [name]: value }));
  };

  // Combined function to open the modal and handle submission
  const handleSubmitNewRecord = async () => {
    // If the modal isn't open yet, just open it
    if (!isNewRecordModalOpen) {
      setIsNewRecordModalOpen(true);
      return;
    }
    
    // Otherwise, submit the form if there's a message
    if (!newRecord.message) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newRecord.message,
          category: newRecord.category || undefined,
          location: newRecord.location || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create record');
      }

      const result = await response.json();
      console.log('Created new record:', result);
      
      // Close the modal and reset form
      closeNewRecordModal();
      
      // Here you would typically:
      // 1. Update UI or state with new record
      // 2. Show success notification
      // 3. Navigate to the new record if needed
      
    } catch (error) {
      console.error('Failed to create record:', error);
      // Handle error (show error message to user)
    } finally {
      setIsSubmitting(false);
    }
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
          onClick={handleSubmitNewRecord}>
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

      {/* New Record Modal */}
      {isNewRecordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">Create New Record</h2>
              <button
                onClick={closeNewRecordModal}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={newRecord.message}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter message content..."
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={newRecord.category}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter category"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  location
                </label>
                <Select
                  id="location"
                  name="location"
                  value={
                    newRecord.location
                      ? { value: newRecord.location, label: newRecord.location }
                      : null
                  }
                  onChange={(selectedOption) => {
                    setNewRecord((prev) => ({
                      ...prev,
                      location: selectedOption ? selectedOption.label : '',
                    }));
                  }}
                  options={outlets}
                  placeholder="Search for an outlet"
                  isSearchable={true}
                  components={{
                    IndicatorSeparator: () => null, // Hide the separator
                    DropdownIndicator: () => (
                      <span className="text-gray-500">
                        <X className="h-5 w-5" />
                      </span>
                    ),
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end space-x-3">
              <button
                onClick={closeNewRecordModal}
                className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitNewRecord}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={!newRecord.message || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Record'}
              </button>
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