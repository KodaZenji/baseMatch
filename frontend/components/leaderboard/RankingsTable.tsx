'use client';

import { useState, useEffect } from 'react';
import {
  Trophy,
  User,
  Flame,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface RankingsTableProps {
  gender: 'male' | 'female';
  setGender: (gender: 'male' | 'female') => void;
  myWallet: string;
}

function maskWallet(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function RankingsTable({ gender, setGender, myWallet }: RankingsTableProps) {
  const [rankings, setRankings] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
  }, [gender, myWallet]);

  async function fetchRankings() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/leaderboard/rankings?gender=${gender}&myWallet=${myWallet}&limit=200`
      );
      const data = await res.json();
      setRankings(data.leaderboard || []);
      setMyRank(data.myRank);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">

      {/* Gender Toggle */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b">
        <div className="flex gap-3">
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                gender === g
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
            >
              {g === 'male' ? "Men's Leaderboard" : "Women's Leaderboard"}
            </button>
          ))}
        </div>
      </div>

      {/* My Rank Banner */}
      {myRank && (
        <div
          className={`p-4 border-b ${
            myRank.is_winning
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {myRank.photo_url ? (
                <img
                  src={myRank.photo_url}
                  alt="User"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User size={36} className="text-gray-500" />
              )}

              <div>
                <p className="text-gray-800 dark:text-gray-200 font-semibold text-lg">
                  Your Rank: #{myRank.rank_in_gender}
                </p>
                <p className="text-sm text-gray-500">
                  {myRank.total_points.toLocaleString()} points
                </p>
              </div>
            </div>

            {myRank.is_winning ? (
              <CheckCircle className="text-green-600" size={26} />
            ) : (
              <XCircle className="text-red-600" size={26} />
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
            <tr className="text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
              <th className="px-6 py-3 text-left">Rank</th>
              <th className="px-6 py-3 text-left">Profile</th>
              <th className="px-6 py-3 text-left">Points</th>
              <th className="px-6 py-3 text-left">Invites</th>
              <th className="px-6 py-3 text-left">Streak</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-500">
                  Loading rankings...
                </td>
              </tr>
            ) : (
              rankings.map((user) => {
                const isMe =
                  user.wallet_address?.toLowerCase() ===
                  myWallet?.toLowerCase();

                return (
                  <tr
                    key={user.wallet_address}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 transition ${
                      isMe ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold">
                        <Trophy size={16} className="text-gray-400" />
                        #{user.rank_in_gender}
                      </div>
                    </td>

                    {/* Profile */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.photo_url ? (
                          <img
                            src={user.photo_url}
                            alt="User"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <User size={28} className="text-gray-400" />
                        )}

                        <div>
                          {user.farcaster_username && (
                            <p className="text-sm text-gray-700 dark:text-gray-200">
                              @{user.farcaster_username}
                            </p>
                          )}
                          {user.name && (
                            <p className="text-xs text-gray-500">
                              {maskWallet(user.wallet_address)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Points */}
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100 font-semibold">
                      {user.total_points.toLocaleString()}
                    </td>

                    {/* Invites */}
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {user.invite_count}
                    </td>

                    {/* Streak */}
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <Flame size={15} className="text-gray-400" />
                        {user.check_in_streak}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {user.is_winning ? (
                        <CheckCircle className="text-green-600" size={18} />
                      ) : (
                        <XCircle className="text-red-600" size={18} />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
