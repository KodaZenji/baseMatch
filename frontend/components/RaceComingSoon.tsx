'use client';

// Using Lucide React icons (lightweight and tree-shakeable)
import { Trophy, Star, Sparkles } from 'lucide-react';

// Alternative with react-icons (uncomment to use):
// import { FaTrophy, FaStar } from 'react-icons/fa';
// import { RiSparklingFill } from 'react-icons/ri';

export default function RaceComingSoon() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-12 text-center transition-colors">
          
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-4 shadow-lg">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>

          {/* Coming Soon */}
          <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">
           Contests Coming Soon
          </h2>

          {/* Main Message */}
          <p className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">
            Don't get ghosted!
          </p>
          <p className="text-lg font-semibold mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Grab BMG NOW!
          </p>

          

        </div>
      </div>
    </div>
  );
}
