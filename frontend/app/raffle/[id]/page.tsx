'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Clock, Users, Trophy, ExternalLink, CheckCircle2, XCircle, Loader2, ArrowLeft, Ticket } from 'lucide-react';

interface Campaign {
  id: string;
  project_name: string;
  project_description: string;
  prize_description: string;
  prize_quantity: number;
  banner_url: string | null;
  required_role_name: string;
  discord_guild_name: string;
  discord_guild_invite: string;
  twitter_url: string | null;
  website_url: string | null;
  start_date: string;
  end_date: string;
  status: string;
  total_entries: number;
}

interface Winner {
  prize_position: number;
  wallet_address: string;
  discord_username: string;
}

function timeLeft(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h ${mins}m left`;
}

export default function CampaignPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();

  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);
  const [entryResult, setEntryResult] = useState<{ success: boolean; message: string; entry_number?: number } | null>(null);
  const [error, setError] = useState('');

  const discordSuccess = searchParams.get('discord_success');
  const discordUserId = searchParams.get('discord_user_id');
  const discordUsername = searchParams.get('discord_username');
  const discordError = searchParams.get('discord_error');
  const walletFromCallback = searchParams.get('wallet');

  useEffect(() => {
    fetch(`/api/raffle/campaigns/${campaignId}`)
      .then(r => r.json())
      .then(d => { setCampaign(d.campaign); setWinners(d.winners || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [campaignId]);

  useEffect(() => {
    if (discordSuccess === 'true' && discordUserId && discordUsername && address && campaign) {
      handleEnter(discordUserId, discordUsername);
    }
    if (discordError) {
      setError(`Discord error: ${discordError.replace(/_/g, ' ')}`);
    }
  }, [discordSuccess, discordUserId, discordUsername, address, campaign]);

  async function handleConnectDiscord() {
    if (!address) { setError('Please connect your wallet first.'); return; }

    const stateRes = await fetch('/api/discord/generate-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, campaignId }),
    });
    const stateData = await stateRes.json();
    if (!stateRes.ok) { setError(stateData.error || 'Failed to generate state'); return; }

    const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const REDIRECT_URI = encodeURIComponent(`${window.location.origin}/api/discord/callback`);
    const SCOPES = encodeURIComponent('identify guilds guilds.members.read');

    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPES}&state=${stateData.state}`;
    window.location.href = oauthUrl;
  }

  async function handleEnter(dUserId: string, dUsername: string) {
    if (!address) return;
    setEntering(true);
    setError('');

    try {
      const res = await fetch('/api/raffle/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          wallet_address: address,
          discord_user_id: dUserId,
          discord_username: dUsername,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setEntryResult({ success: true, message: `Already entered! Entry #${data.entry_number}`, entry_number: data.entry_number });
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Failed to enter. Please try again.');
        return;
      }

      setEntryResult({ success: true, message: data.message, entry_number: data.entry_number });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setEntering(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0052FF]" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl font-bold mb-4">Campaign not found</p>
          <button onClick={() => router.push('/raffle')} className="text-[#4d8aff] hover:text-[#0052FF]">← Back to Raffles</button>
        </div>
      </div>
    );
  }

  const isActive = campaign.status === 'active' && new Date(campaign.end_date) > new Date();
  const isDrawn = campaign.status === 'drawn';

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <div className="min-h-screen bg-[#0a0a0f]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="max-w-2xl mx-auto px-4 py-10">

          <button onClick={() => router.push('/raffle')} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors mb-8 text-sm">
            <ArrowLeft className="w-4 h-4" /> All Raffles
          </button>

          {campaign.banner_url ? (
            <img src={campaign.banner_url} alt={campaign.project_name} className="w-full h-52 object-cover rounded-2xl mb-6" />
          ) : (
            <div className="w-full h-52 rounded-2xl mb-6 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(0,82,255,0.15) 0%, rgba(26,111,255,0.08) 100%)' }}>
              <Trophy className="w-16 h-16 text-[#0052FF]/40" />
            </div>
          )}

          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
              {campaign.project_name}
            </h1>
            <div className="flex gap-2">
              {campaign.twitter_url && (
                <a href={campaign.twitter_url} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          <p className="text-gray-400 mb-8 leading-relaxed">{campaign.project_description}</p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: Trophy, label: 'Prize', value: `${campaign.prize_quantity} winner${campaign.prize_quantity > 1 ? 's' : ''}` },
              { icon: Users, label: 'Entries', value: campaign.total_entries.toString() },
              { icon: Clock, label: isActive ? 'Time Left' : 'Status', value: isActive ? timeLeft(campaign.end_date) : campaign.status },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/4 p-4 text-center">
                <Icon className="w-5 h-5 text-[#4d8aff] mx-auto mb-1" />
                <p className="text-white font-bold text-sm">{value}</p>
                <p className="text-gray-500 text-xs">{label}</p>
              </div>
            ))}
          </div>

          {/* Prize details */}
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5 mb-6">
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#4d8aff]" /> Prize
            </h3>
            <p className="text-gray-400 text-sm">{campaign.prize_description}</p>
          </div>

          {/* Entry requirement — Base blue instead of purple */}
          <div className="rounded-2xl border border-[#0052FF]/20 bg-[#0052FF]/8 p-5 mb-8">
            <h3 className="text-[#4d8aff] font-bold mb-1 text-sm">Entry Requirement</h3>
            <p className="text-gray-300 text-sm">
              Must have the <span className="font-bold text-white">"{campaign.required_role_name}"</span> role
              in the <span className="font-bold text-white">{campaign.discord_guild_name}</span> Discord server.
            </p>
            <a href={campaign.discord_guild_invite} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs text-[#4d8aff] hover:text-[#0052FF] font-semibold">
              <ExternalLink className="w-3.5 h-3.5" /> Join {campaign.discord_guild_name}
            </a>
          </div>

          {/* Winners */}
          {isDrawn && winners.length > 0 && (
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/8 p-5 mb-8">
              <h3 className="text-yellow-300 font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5" /> Winners
              </h3>
              <div className="space-y-3">
                {winners.map(w => (
                  <div key={w.prize_position} className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      #{w.prize_position}
                    </span>
                    <div>
                      <p className="text-white font-semibold text-sm">@{w.discord_username}</p>
                      <p className="text-gray-500 text-xs font-mono">{w.wallet_address.slice(0, 6)}...{w.wallet_address.slice(-4)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entry section */}
          {isActive && (
            <div className="rounded-2xl border border-white/8 bg-white/4 p-6">
              <h3 className="text-white font-bold mb-4 text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
                Enter Raffle
              </h3>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {entryResult ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400">
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <p className="font-bold">{entryResult.message}</p>
                    <p className="text-xs text-green-500 mt-0.5">Good luck! Winners announced after the raffle ends.</p>
                  </div>
                </div>
              ) : !isConnected ? (
                <p className="text-gray-400 text-sm">Connect your wallet to enter this raffle.</p>
              ) : (
                <button
                  onClick={handleConnectDiscord}
                  disabled={entering}
                  className="w-full py-4 rounded-2xl text-white font-bold text-base hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(0,82,255,0.3)]"
                  style={{ background: 'linear-gradient(to right, #0052FF, #1a6fff)' }}
                >
                  {entering ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
                    </span>
                  ) : (
                    '🎟️ Connect Discord & Enter'
                  )}
                </button>
              )}

              {isConnected && !entryResult && (
                <p className="text-xs text-gray-600 text-center mt-3">
                  We'll verify your Discord role and enter you automatically.
                </p>
              )}
            </div>
          )}

          {!isActive && !isDrawn && (
            <div className="text-center py-8 text-gray-500">
              <p className="font-semibold">This raffle has ended</p>
              <p className="text-sm mt-1">Winners will be announced soon</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
