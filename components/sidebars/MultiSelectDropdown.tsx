'use client'
import { useState } from 'react';

export const MultiSelectDropdown = ({
  label,
  id,
  selectedValues,
  options,
  handleFilterChange,
  field,
}: {
  label: string;
  id: string;
  selectedValues: string[];
  options: string[];
  handleFilterChange: Function;
  field: string;
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleSelection = (value: string) => {
    const updatedValues = selectedValues.includes(value)
      ? selectedValues.filter(item => item !== value)
      : [...selectedValues, value];
    handleFilterChange(field, updatedValues);
  };

  const handleAllSelection = () => {
    handleFilterChange(field, []);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="font-medium text-sm text-gray-700">{label}</label>
      <button
        className="border p-2 rounded-md w-full text-left"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        {selectedValues.length === 0 ? "All" : selectedValues.join(', ')}
      </button>
      
      {showDropdown && (
        <div
          className="absolute top-full left-0 w-full border bg-white rounded-md shadow-lg mt-1 z-10 max-h-60 overflow-auto"
          style={{ maxHeight: '300px' }} // Add a max-height to prevent the dropdown from growing too tall
        >
          <ul>
            <li>
              <input
                type="checkbox"
                checked={selectedValues.length === 0}
                onChange={handleAllSelection}
              />
              <label className="ml-2">All</label>
            </li>
            {options.map((option) => (
              <li key={option}>
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={() => toggleSelection(option)}
                />
                <label className="ml-2">{option}</label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

