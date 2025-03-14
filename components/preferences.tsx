'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';

interface Link {
  type: string;
  url: string;
}

export default function Preferences() {
  const [alwaysRetrieveDrafts, setAlwaysRetrieveDrafts] = useState(false);
  const [greetings, setGreetings] = useState('');
  const [closing, setClosing] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [telephone, setTelephone] = useState('');
  const [closingMessage, setClosingMessage] = useState('');
  const [confidentialityMessage, setConfidentialityMessage] = useState('');
  const [links, setLinks] = useState<Link[]>([]);

  const handleAddLink = () => {
    setLinks([...links, { type: '', url: '' }]);
  };

  const handleLinkChange = (index: number, field: 'type' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission (you can send this data to your backend, etc.)
    console.log({
      alwaysRetrieveDrafts,
      greetings,
      closing,
      name,
      role,
      position,
      department,
      telephone,
      links,
      closingMessage,
      confidentialityMessage,
    });
  };

  return (
    <div className="flex justify-center py-8">
      <Card className="w-full max-w-3xl p-6 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Checkbox for "Always retrieve past drafts" */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="alwaysRetrieveDrafts"
              checked={alwaysRetrieveDrafts}
              onChange={() => setAlwaysRetrieveDrafts(!alwaysRetrieveDrafts)}
              className="mr-2"
            />
            <label htmlFor="alwaysRetrieveDrafts">Always retrieve past drafts</label>
          </div>

          {/* Text Input Fields */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="greetings" className="block text-sm font-medium">Greetings</label>
              <input
                type="text"
                id="greetings"
                value={greetings}
                onChange={(e) => setGreetings(e.target.value)}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="closing" className="block text-sm font-medium">Closing</label>
              <input
                type="text"
                id="closing"
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium">Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium">Role</label>
              <input
                type="text"
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="position" className="block text-sm font-medium">Position</label>
              <input
                type="text"
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium">Department</label>
              <input
                type="text"
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="telephone" className="block text-sm font-medium">Telephone</label>
              <input
                type="text"
                id="telephone"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="closingMessage" className="block text-sm font-medium">Closing Message</label>
              <input
                type="text"
                id="closingMessage"
                value={closingMessage}
                onChange={(e) => setClosingMessage(e.target.value)}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="confidentialityMessage" className="block text-sm font-medium">Confidentiality Message</label>
              <input
                type="text"
                id="confidentialityMessage"
                value={confidentialityMessage}
                onChange={(e) => setConfidentialityMessage(e.target.value)}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Links Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Links</h3>
              <button
                type="button"
                onClick={handleAddLink}
                className="text-sm text-blue-600 hover:underline"
              >
                Add Link
              </button>
            </div>

            {links.map((link, index) => (
              <div key={index} className="flex space-x-4">
                <div className="w-1/2">
                  <input
                    type="text"
                    value={link.type}
                    onChange={(e) => handleLinkChange(index, 'type', e.target.value)}
                    placeholder="Type (e.g., Facebook)"
                    className="p-2 w-full border border-gray-300 rounded-md"
                  />
                </div>
                <div className="w-1/2">
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                    placeholder="URL"
                    className="p-2 w-full border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
