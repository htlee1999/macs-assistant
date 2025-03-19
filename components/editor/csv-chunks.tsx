'use client';

import React, { useState, useCallback, ChangeEvent } from 'react';
import Papa from 'papaparse';

interface FAQItem {
  id: number;
  category: string;
  section: string;
  heading: string;
  content: string;
}

interface ChunkResult {
  chunkNumber: number;
  rowCount: number;
  items: FAQItem[];
  categories: string[];
  sections: string[];
}

const CSVChunksProcessor: React.FC = () => {
  const [results, setResults] = useState<ChunkResult[]>([]);
  const [processedRows, setProcessedRows] = useState<number>(0);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [batchSize, setBatchSize] = useState<number>(20); // Changed default to 20 to match backend
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [allCategories, setAllCategories] = useState<Set<string>>(new Set());
  const [allSections, setAllSections] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState<Set<number>>(new Set());
  const [processedBatches, setProcessedBatches] = useState<Set<number>>(new Set());

  const processCSV = useCallback((file: File) => {
    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');
    setResults([]);
    setProcessedRows(0);
    setAllCategories(new Set());
    setAllSections(new Set());
    setBatchProcessing(new Set());
    setProcessedBatches(new Set());
    
    let rowCounter = 0;
    let currentBatch: FAQItem[] = [];
    let batchNumber = 0;
    const categories = new Set<string>();
    const sections = new Set<string>();

    // Configure Papa Parse to process the file row by row
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      // Use step instead of chunk - step processes one row at a time
      step: (result, parser) => {
        rowCounter++;
        const item = result.data as FAQItem;
        
        // Validate the required fields
        if (!item.id || !item.heading || !item.content) {
          // Skip invalid rows or handle them differently
          console.warn('Skipping invalid row:', item);
          return;
        }
        
        // Track unique categories and sections
        if (item.category) {
          categories.add(item.category);
          setAllCategories(prev => new Set([...prev, item.category]));
        }
        
        if (item.section) {
          sections.add(item.section);
          setAllSections(prev => new Set([...prev, item.section]));
        }
        
        currentBatch.push(item);
        
        // When we've reached our desired batch size, process the batch
        if (currentBatch.length >= batchSize) {
          batchNumber++;
          const batchToProcess = [...currentBatch];
          const batchCategories = [...categories];
          const batchSections = [...sections];
          
          // Process the batch
          setResults(prev => [...prev, {
            chunkNumber: batchNumber,
            rowCount: batchToProcess.length,
            items: batchToProcess,
            categories: batchCategories,
            sections: batchSections
          }]);
          
          // Update row counter for progress display
          setProcessedRows(rowCounter);
          
          // Clear the batch
          currentBatch = [];
          // Keep tracking categories and sections across all batches
        }
      },
      complete: () => {
        // Process any remaining rows in the last batch
        if (currentBatch.length > 0) {
          batchNumber++;
          setResults(prev => [...prev, {
            chunkNumber: batchNumber,
            rowCount: currentBatch.length,
            items: currentBatch,
            categories: [...categories],
            sections: [...sections]
          }]);
        }
        
        setProcessedRows(rowCounter);
        setIsProcessing(false);
        
        if (rowCounter > 0) {
          setSuccessMessage(`Successfully processed ${rowCounter} rows into ${batchNumber} batches.`);
        } else {
          setErrorMessage('No valid rows found in the CSV file.');
        }
      },
      error: (error) => {
        setErrorMessage(`Error processing CSV: ${error.message}`);
        setIsProcessing(false);
      },
      beforeFirstChunk: (chunk) => {
        // Count the total number of rows (approximate)
        const lines = chunk.split('\n').length;
        setTotalRows(lines - 1); // Subtract header row
      }
    });
  }, [batchSize]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCSV(file);
    }
  };

  const handleBatchSizeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value, 10);
    if (!isNaN(size) && size > 0) {
      setBatchSize(size);
    }
  };

  // Function to send batch to your API
  const sendBatchToAPI = async (batch: FAQItem[], batchNumber: number) => {
    try {
      // Mark this batch as processing
      setBatchProcessing(prev => new Set([...prev, batchNumber]));
      
      // Create a new FormData object
      const formData = new FormData();
      
      // Convert the batch back to CSV
      const csvContent = Papa.unparse(batch);
      
      // Create a File object from the CSV content
      const file = new File([csvContent], `batch_${batchNumber}.csv`, { type: "text/csv" });
      
      // Append the file to the FormData
      formData.append("file", file);
      
      // Send the request with FormData
      const response = await fetch('/api/csv-chunks', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save batch #${batchNumber}`);
      }
      
      const result = await response.json();
      console.log(`Batch #${batchNumber} saved successfully:`, result);
      
      // Mark this batch as processed
      setProcessedBatches(prev => new Set([...prev, batchNumber]));
      setSuccessMessage(`Batch #${batchNumber} saved successfully with ${result.insertedCount || 'all'} items.`);
    } catch (error) {
      console.error(`Error saving batch #${batchNumber}:`, error);
      setErrorMessage(error instanceof Error ? error.message : `Error saving batch #${batchNumber}`);
    } finally {
      // Remove this batch from processing state
      setBatchProcessing(prev => {
        const updated = new Set([...prev]);
        updated.delete(batchNumber);
        return updated;
      });
    }
  };

  // Function to process all batches sequentially
  const processAllBatches = async () => {
    setSuccessMessage('');
    setErrorMessage('');
    
    for (let i = 0; i < results.length; i++) {
      const batch = results[i];
      if (!processedBatches.has(batch.chunkNumber)) {
        try {
          await sendBatchToAPI(batch.items, batch.chunkNumber);
        } catch (error) {
          // If any batch fails, stop processing
          setErrorMessage(`Failed at batch #${batch.chunkNumber}. Please try again.`);
          break;
        }
      }
    }
    
    setSuccessMessage('All batches processed successfully!');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">CSV FAQ Processor</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-gray-700 mb-2 font-medium">Batch Size:</label>
          <input
            type="number"
            value={batchSize}
            onChange={handleBatchSizeChange}
            className="px-4 py-2 border rounded w-full max-w-xs text-gray-700"
            min="1"
            max="100"
            disabled={isProcessing}
          />
          <p className="mt-1 text-sm text-gray-500">
            Recommended: 20 items per batch for optimal processing
          </p>
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2 font-medium">Upload FAQ CSV:</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-gray-700"
            disabled={isProcessing}
          />
          <p className="mt-1 text-sm text-gray-500">
            Required columns: id, heading, content (category and section are optional)
          </p>
        </div>
      </div>
      
      {isProcessing && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${Math.min((processedRows / totalRows) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            Processing: {processedRows} rows ({totalRows > 0 ? Math.floor((processedRows / totalRows) * 100) : 0}%)
          </p>
        </div>
      )}
      
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          {errorMessage}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700">
          {successMessage}
        </div>
      )}
      
      {allCategories.size > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Categories Found:</h3>
          <div className="flex flex-wrap gap-2">
            {[...allCategories].map((category, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                {category}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {allSections.size > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Sections Found:</h3>
          <div className="flex flex-wrap gap-2">
            {[...allSections].map((section, index) => (
              <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                {section}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {results.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Processed Batches</h2>
            
            <button 
              onClick={processAllBatches}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              disabled={isProcessing || batchProcessing.size > 0 || processedBatches.size === results.length}
            >
              {processedBatches.size === results.length ? 
                "All Batches Processed" : 
                `Process All Batches (${results.length - processedBatches.size} remaining)`}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 bg-gray-100 border-b">Batch #</th>
                  <th className="py-2 px-4 bg-gray-100 border-b">Items</th>
                  <th className="py-2 px-4 bg-gray-100 border-b">ID Range</th>
                  <th className="py-2 px-4 bg-gray-100 border-b">Status</th>
                  <th className="py-2 px-4 bg-gray-100 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((batch, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-2 px-4 border-b">{batch.chunkNumber}</td>
                    <td className="py-2 px-4 border-b">{batch.rowCount}</td>
                    <td className="py-2 px-4 border-b">
                      {batch.items[0]?.id} - {batch.items[batch.items.length - 1]?.id}
                    </td>
                    <td className="py-2 px-4 border-b">
                      {processedBatches.has(batch.chunkNumber) ? (
                        <span className="text-green-600 font-medium">Processed</span>
                      ) : batchProcessing.has(batch.chunkNumber) ? (
                        <span className="text-blue-600 font-medium">Processing...</span>
                      ) : (
                        <span className="text-gray-500">Pending</span>
                      )}
                    </td>
                    <td className="py-2 px-4 border-b">
                      <button 
                        onClick={() => sendBatchToAPI(batch.items, batch.chunkNumber)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        disabled={batchProcessing.has(batch.chunkNumber) || processedBatches.has(batch.chunkNumber)}
                      >
                        {processedBatches.has(batch.chunkNumber) ? 
                          "Saved" : 
                          batchProcessing.has(batch.chunkNumber) ? 
                            "Saving..." : 
                            "Save Batch"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Preview of the first batch */}
          {results.length > 0 && (
            <div className="mt-6 border rounded-lg p-4 bg-gray-50">
              <h3 className="text-lg font-semibold mb-3">Preview of Batch #{results[0].chunkNumber}</h3>
              <div className="space-y-4">
                {results[0].items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2 bg-white rounded shadow-sm">
                    <div className="text-xs text-gray-500">ID: {item.id} | Category: {item.category || 'None'} | Section: {item.section || 'None'}</div>
                    <div className="font-medium text-lg">{item.heading}</div>
                    <div className="mt-1 text-gray-700">{item.content}</div>
                  </div>
                ))}
                {results[0].items.length > 3 && (
                  <div className="text-center text-gray-500 text-sm">
                    ...and {results[0].items.length - 3} more items in this batch
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CSVChunksProcessor;