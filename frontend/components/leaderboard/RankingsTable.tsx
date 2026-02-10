'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface RankingsTableProps {
  gender: 'male' | 'female';
  setGender: (gender: 'male' | 'female') => void;
  myWallet: string;
}

export function RankingsTable({ gender, setGender, myWallet }: RankingsTableProps) {
  const [rankings, setRankings] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchRankings();
  }, [gender]);
  
  async function fetchRankings() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard/rankings?gender=${gender}&myWallet=${myWallet}&limit=200`);
      const data = await res.json();
      setRankings(data.leaderboard || []);
      setMyRank(data.myRank);
    } catch (error) {
      console.error('Fetch rankings error:', error);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      
      {/* Gender Toggle */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <button
            onClick={() => setGender('male')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
              gender === 'male'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Men's Leaderboard
          </button>
          <button
            onClick={() => setGender('feminine')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
              gender === 'female'
                ? 'bg-pink-600 text-white shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Women's Leaderboard
          </button>
        </div>
      </div>
      
      {/* My Rank Banner */}
      {myRank && (
        <div className={`p-4 ${
          myRank.is_winning 
            ? 'bg-green-50 dark:bg-green-900/20 border-b-2 border-green-500' 
            : 'bg-red-50 dark:bg-red-900/20 border-b-2 border-red-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {myRank.photo_url && (
                <Image 
                  src={myRank.photo_url} 
                  alt={myRank.name}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              )}
              <div>
                <p className="font-bold text-lg">Your Rank: #{myRank.rank_in_gender}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {myRank.total_points.toLocaleString()} points
                </p>
              </div>
            </div>
            {myRank.is_winning ? (
              <span className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">
                ✅ WINNING
              </span>
            ) : (
              <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold">
                ❌ #{myRank.rank_in_gender}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Profile
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Invites
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Streak
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Loading rankings...
                </td>
              </tr>
            ) : rankings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No rankings yet. Be the first to check in!
                </td>
              </tr>
            ) : (
              rankings.map((user, index) => (
                <tr
                  key={user.wallet_address}
                  className={`${
                    user.wallet_address.toLowerCase() === myWallet.toLowerCase()
                      ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold'
                      : ''
                  } ${
                    index === 99 
                      ? 'border-b-4 border-red-500' 
                      : ''
                  } hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-lg font-bold ${
                      user.rank_in_gender <= 3 ? 'text-yellow-600' : ''
                    }`}>
                      {user.rank_in_gender === 1 && '🥇'}
                      {user.rank_in_gender === 2 && '🥈'}
                      {user.rank_in_gender === 3 && '🥉'}
                      #{user.rank_in_gender}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {user.photo_url ? (
                        <Image 
                          src={user.photo_url} 
                          alt={user.name || 'User'}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-lg">👤</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {user.name || `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`}
                        </p>
                        {user.farcaster_username && (
                          <p className="text-xs text-gray-500">{user.farcaster_username}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg font-bold">{user.total_points.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{user.invite_count}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{user.check_in_streak} 🔥</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_winning ? (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        ✅ Winning
                      </span>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                        ❌ Losing
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}
