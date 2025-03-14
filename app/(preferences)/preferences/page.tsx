'use client';
import Preferences from '@/components/preferences';

export default function PreferencesPage() {
    return (
      <div className="flex">
        <div className="flex-1">
          <div className="p-6">
            <h1 className="text-2xl font-semibold">User Preferences</h1>
            <Preferences />
          </div>
        </div>
      </div>
    );
  }