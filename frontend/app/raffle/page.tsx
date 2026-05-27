'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Users, Trophy, ExternalLink, Ticket, ChevronRight } from 'lucide-react';

interface Campaign {
  id: string;
  project_name: string;
  project_description: string;
  prize_description: string;
  prize_quantity: number;
  banner_url: string | null;
  required_role_name: string;
  discord_guild_name: string;
  twitter_url: string | null;
  website_url: string | null;
  start_date: string;
  end_date: string;
  status: string;
  total_entries: number;
}

function timeLeft(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m left`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    ended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    drawn: 'bg-[#0052FF]/20 text-[#4d8aff] border-[#0052FF]/30',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function RafflePage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'ended' | 'drawn'>('all');

  useEffect(() => {
    fetch('/api/raffle/campaigns')
      .then(r => r.json())
      .then(d => { setCampaigns(d.campaigns || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter);

  return (
    <div className="min-h-screen bg-[#0a0a0f]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Base blue ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#0052FF]/8 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-[#0052FF]/6 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0052FF] to-[#1a6fff] flex items-center justify-center shadow-[0_0_20px_rgba(0,82,255,0.4)]">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <span className="text-[#4d8aff] font-semibold text-sm tracking-widest uppercase">BaseMatch Genesis</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>
            BMG{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(to right, #4d8aff, #0052FF)' }}
            >
              Collab Raffles
            </span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
            Partner projects approved by BaseMatch are giving away BMG whitelist spots. Connect your Discord to verify and enter.
          </p>
        </div>

        <div className="flex gap-2 mb-8 flex-wrap">
          {(['all', 'active', 'ended', 'drawn'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                filter === f
                  ? 'text-white border-transparent'
                  : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
              style={filter === f ? { background: 'linear-gradient(to right, #0052FF, #1a6fff)' } : {}}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'active' && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                  {campaigns.filter(c => c.status === 'active').length}
                </span>
              )}
            </button>
          ))}

          <button
            onClick={() => router.push('/raffle/apply')}
            className="ml-auto px-4 py-2 rounded-full text-sm font-semibold border border-[#0052FF]/40 text-[#4d8aff] hover:bg-[#0052FF]/10 transition-all"
          >
            + Partner with Us
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl border border-white/8 bg-white/4 h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No {filter === 'all' ? '' : filter} raffles yet</p>
            <p className="text-gray-600 text-sm mt-1">Check back soon for new BMG collabs</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map(campaign => (
              <button
                key={campaign.id}
                onClick={() => router.push(`/raffle/${campaign.id}`)}
                className="rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 hover:border-white/14 transition-all text-left overflow-hidden group"
              >
                {campaign.banner_url ? (
                  <img src={campaign.banner_url} alt={campaign.project_name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(0,82,255,0.15) 0%, rgba(26,111,255,0.08) 100%)' }}>
                    <Trophy className="w-10 h-10 text-[#0052FF]/50" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-white font-bold text-lg leading-tight group-hover:text-[#4d8aff] transition-colors">
                      {campaign.project_name}
                    </h3>
                    <StatusBadge status={campaign.status} />
                  </div>

                  <p className="text-gray-400 text-sm mb-4"
                     style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {campaign.prize_description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {campaign.total_entries} entries
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5" />
                      {campaign.prize_quantity} winner{campaign.prize_quantity > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <Clock className="w-3.5 h-3.5" />
                      {campaign.status === 'active' ? timeLeft(campaign.end_date) : campaign.status === 'drawn' ? 'Winners announced' : 'Ended'}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/6 flex items-center justify-between">
                    <span className="text-xs text-[#4d8aff] font-medium">
                      Need: {campaign.required_role_name} in {campaign.discord_guild_name}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#4d8aff] transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
