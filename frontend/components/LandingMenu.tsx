// components/LandingMenu.tsx
import React from 'react';
import { X, Twitter, MessageSquare } from 'lucide-react';

interface LandingMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LandingMenu({ isOpen, onClose }: LandingMenuProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>

          <h2 className="text-2xl font-bold mb-8 text-gray-800 dark:text-white">
            Connect With Us
          </h2>

          <nav className="space-y-4">
            <a
              href="https://x.com/basematch_"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
            >
              <Twitter className="w-6 h-6" />
              <div>
                <div className="font-semibold">Follow us on X</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">@basematch_</div>
              </div>
            </a>

            <a
              href="https://discord.gg/basematch"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
            >
              <MessageSquare className="w-6 h-6" />
              <div>
                <div className="font-semibold">Join our Discord</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Community chat</div>
              </div>
            </a>
          </nav>
        </div>
      </div>
    </>
  );
}
