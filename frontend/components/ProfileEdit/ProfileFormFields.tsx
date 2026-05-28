import { useState } from 'react';

// ── Interest tags ────────────────────────────────────────────────────────────
export const INTEREST_CATEGORIES = {
  'Onchain & Web3': [
    'DeFi', 'NFTs', 'DAOs', 'Trading', 'Building/Dev',
    'Staking', 'Memecoins', 'Gaming', 'L2s', 'Airdrops',
  ],
  'Lifestyle': [
    'Travel', 'Fitness', 'Music', 'Art', 'Food',
    'Photography', 'Reading', 'Gaming', 'Fashion', 'Sports',
  ],
  'Looking For': [
    'Long-term', 'Casual', 'Friendship', 'Networking', 'Something Real',
  ],
} as const;

export const ALL_INTERESTS = Object.values(INTEREST_CATEGORIES).flat();
export const MAX_INTERESTS = 6;

// Helper: convert stored string ↔ tags array
export function interestsToTags(str: string): string[] {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}
export function tagsToInterests(tags: string[]): string {
  return tags.join(', ');
}

// ── Category pill colors ─────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  'Onchain & Web3': 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  'Lifestyle': 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700',
  'Looking For': 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
};

const SELECTED_COLOR = 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-transparent shadow-sm';

// ── Component ────────────────────────────────────────────────────────────────
interface ProfileFormFieldsProps {
  formData: {
    name: string;
    birthYear: string;
    gender: string;
    interests: string;
  };
  onChange: (field: string, value: string) => void;
}

export default function ProfileFormFields({ formData, onChange }: ProfileFormFieldsProps) {
  const selectedTags = interestsToTags(formData.interests);

  function toggleTag(tag: string) {
    const current = selectedTags;
    if (current.includes(tag)) {
      onChange('interests', tagsToInterests(current.filter(t => t !== tag)));
    } else {
      if (current.length >= MAX_INTERESTS) return;
      onChange('interests', tagsToInterests([...current, tag]));
    }
  }

  return (
    <>
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onChange('name', e.target.value)}
          className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Your name"
          required
        />
      </div>

      {/* Birth Year */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Birth Year *</label>
        <select
          value={formData.birthYear}
          onChange={(e) => onChange('birthYear', e.target.value)}
          className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select birth year</option>
          {Array.from({ length: 105 }, (_, i) => {
            const currentYear = new Date().getFullYear();
            const year = currentYear - i;
            const calculatedAge = currentYear - year;
            return calculatedAge >= 18 && calculatedAge <= 120 ? (
              <option key={year} value={year}>
                {year} (age {calculatedAge})
              </option>
            ) : null;
          }).filter(Boolean)}
        </select>
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
        <select
          value={formData.gender}
          onChange={(e) => onChange('gender', e.target.value)}
          className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select Gender</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
          <option value="Prefer not to say">Prefer not to say</option>
        </select>
      </div>

      {/* Interests — tag picker */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Interests *
          </label>
          <span className={`text-xs font-semibold ${selectedTags.length >= MAX_INTERESTS ? 'text-red-500' : 'text-gray-400'}`}>
            {selectedTags.length}/{MAX_INTERESTS} selected
          </span>
        </div>

        <div className="space-y-4">
          {Object.entries(INTEREST_CATEGORIES).map(([category, tags]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {category}
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  const isDisabled = !isSelected && selectedTags.length >= MAX_INTERESTS;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      disabled={isDisabled}
                      className={`
                        px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                        ${isSelected
                          ? SELECTED_COLOR
                          : isDisabled
                            ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                            : `${CATEGORY_COLORS[category]} hover:opacity-80 cursor-pointer`
                        }
                      `}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {selectedTags.length === 0 && (
          <p className="text-xs text-red-400 mt-2">Please select at least one interest</p>
        )}

        {/* Hidden input keeps interests as comma string for form submission */}
        <input type="hidden" value={formData.interests} required />
      </div>
    </>
  );
}
