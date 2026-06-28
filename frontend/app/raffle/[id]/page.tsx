'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Clock, Users, Trophy, ExternalLink, CheckCircle2, XCircle, Loader2, ArrowLeft, Ticket, Shield, Wallet, LogOut } from 'lucide-react';

const BLUE = '#0052FF';
const BLUE_LIGHT = '#4d8aff';

const BASE_LOGO = '/bmg_choice.jpg';

interface XTask {
  type: 'follow' | 'like' | 'retweet' | 'comment';
  label: string;
  url: string;
}

interface RaffleRole {
  role_id: string | null;
  role_name: string;
  weight: number;
}

interface Campaign {
  id: string;
  project_name: string;
  project_description: string;
  prize_description: string;
  prize_quantity: number;
  partner_logo_url: string | null;
  banner_url: string | null;
  required_roles: RaffleRole[];
  discord_guild_id: string;
  discord_guild_name: string;
  discord_guild_invite: string;
  twitter_url: string | null;
  website_url: string | null;
  start_date: string;
  end_date: string;
  status: string;
  total_entries: number;
  x_tasks: XTask[];
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

const TASK_ICONS: Record<string, string> = {
  follow: '👤',
  like: '❤️',
  retweet: '🔄',
  comment: '💬',
};

// BMG logo left (behind), partner logo right (on top via z-10 + negative margin)
function LogoPair({ partnerLogoUrl, partnerName, size = 16 }: {
  partnerLogoUrl: string | null;
  partnerName: string;
  size?: number;
}) {
  const sz = `${size * 4}px`;
  const overlap = `${size * 4 * 0.25}px`;
  return (
    <div className="flex items-center">
      {/* Partner — left, on top */}
      <div
        className="rounded-2xl border-2 border-[#0a0a0f] overflow-hidden z-10 relative flex-shrink-0 bg-white/8"
        style={{ width: sz, height: sz }}
      >
        {partnerLogoUrl ? (
          <img
            src={partnerLogoUrl}
            alt={partnerName}
            className="w-full h-full object-cover"
            onError={e => {
              const el = e.target as HTMLImageElement;
              el.style.display = 'none';
              el.parentElement!.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.3);font-weight:bold;font-size:1.1rem">${partnerName[0]}</div>`;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 font-bold text-xl">
            {partnerName[0]}
          </div>
        )}
      </div>
      {/* BMG — right, behind */}
      <div
        className="rounded-2xl border-2 border-[#0a0a0f] overflow-hidden flex-shrink-0 bg-[#0052FF]/20"
        style={{ width: sz, height: sz, marginLeft: `-${overlap}` }}
      >
        <img
          src={BASE_LOGO}
          alt="BaseMatch"
          className="w-full h-full object-cover"
          onError={e => {
            const el = e.target as HTMLImageElement;
            el.style.display = 'none';
            el.parentElement!.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#4d8aff;font-weight:bold;font-size:1.1rem">B</div>';
          }}
        />
      </div>
    </div>
  );
}
// Wallet button
function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-gray-400 bg-white/6 border border-white/10 px-3 py-2 rounded-xl">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 text-xs transition-all"
        >
          <LogOut className="w-3.5 h-3.5" /> Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(0,82,255,0.3)]"
      style={{ background: `linear-gradient(to right, ${BLUE}, #1a6fff)` }}
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
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

  // Discord identity is captured BEFORE wallet — connecting Discord no
  // longer requires a wallet at all. Eligibility is checked immediately
  // after Discord connects, so the user knows if they qualify before
  // ever being asked to connect a wallet.
  const [discordIdentity, setDiscordIdentity] = useState<{ userId: string; username: string } | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibility, setEligibility] = useState<{
    inServer: boolean;
    matched: boolean;
    weight: number;
    roleName: string | null;
  } | null>(null);

  const discordSuccess = searchParams.get('discord_success');
  const discordUserId = searchParams.get('discord_user_id');
  const discordUsername = searchParams.get('discord_username');
  const discordError = searchParams.get('discord_error');

  useEffect(() => {
    fetch(`/api/raffle/campaigns/${campaignId}`)
      .then(r => r.json())
      .then(d => {
        setCampaign({
          ...d.campaign,
          x_tasks: d.campaign?.x_tasks || [],
          required_roles: d.campaign?.required_roles || [],
        });
        setWinners(d.winners || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campaignId]);

  // Discord just redirected back — capture identity, check eligibility.
  // No wallet involved at this point.
  useEffect(() => {
    if (discordSuccess === 'true' && discordUserId && discordUsername && campaign) {
      setDiscordIdentity({ userId: discordUserId, username: discordUsername });
      checkEligibility(discordUserId, campaign);
    }
    if (discordError) {
      setError(`Discord error: ${discordError.replace(/_/g, ' ')}`);
    }
  }, [discordSuccess, discordUserId, discordUsername, campaign]);

  // Once wallet connects AND we already know the user is eligible,
  // submit the actual entry. This is the only point a wallet is required.
  useEffect(() => {
    if (isConnected && address && discordIdentity && eligibility?.matched && !entryResult && !entering) {
      handleEnter(discordIdentity.userId, discordIdentity.username);
    }
  }, [isConnected, address, discordIdentity, eligibility]);

  async function checkEligibility(dUserId: string, c: Campaign) {
    if (!c.required_roles || c.required_roles.length === 0) {
      setEligibility({ inServer: true, matched: true, weight: 1, roleName: null });
      return;
    }
    setCheckingEligibility(true);
    setError('');
    try {
      const res = await fetch('/api/discord/check-membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_user_id: dUserId,
          guild_id: c.discord_guild_id,
          // check-membership needs *some* role_id to run — we only use
          // the returned `roles` array for our own weight resolution below.
          required_role_id: c.required_roles[0]?.role_id ?? null,
        }),
      });
      const data = await res.json();

      if (data.error === 'bot_not_in_server') {
        setError('Configuration error — please contact the campaign organizer.');
        setEligibility(null);
        return;
      }

      if (!data.inServer) {
        setEligibility({ inServer: false, matched: false, weight: 0, roleName: null });
        return;
      }

      const userRoleIds: string[] = data.roles || [];
      let matchedWeight = 0;
      let matchedRoleName: string | null = null;
      for (const role of c.required_roles) {
        if (role.role_id && userRoleIds.includes(role.role_id) && role.weight > matchedWeight) {
          matchedWeight = role.weight;
          matchedRoleName = role.role_name;
        }
      }

      setEligibility({
        inServer: true,
        matched: matchedWeight > 0,
        weight: matchedWeight,
        roleName: matchedRoleName,
      });
    } catch {
      setError('Could not check Discord eligibility. Please try again.');
    } finally {
      setCheckingEligibility(false);
    }
  }

  async function handleConnectDiscord() {
    if (!campaign) return;

    const stateRes = await fetch('/api/discord/generate-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId }),
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
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: BLUE }} />
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
  const hasTasks = campaign.x_tasks && campaign.x_tasks.length > 0;
  const roles = campaign.required_roles || [];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <div className="min-h-screen bg-[#0a0a0f]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="max-w-2xl mx-auto px-4 py-10">

          <button onClick={() => router.push('/raffle')} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors mb-8 text-sm">
            <ArrowLeft className="w-4 h-4" /> All Raffles
          </button>

          {/* Hero — partner logo on top of BMG, heading as "Partner × BMG" */}
          <div
            className="w-full rounded-2xl mb-6 px-6 py-7 flex items-center gap-5"
            style={{
              background: campaign.banner_url
                ? `linear-gradient(to right, rgba(10,10,15,0.6), rgba(10,10,15,0.75)), url(${campaign.banner_url}) center/cover no-repeat`
                : 'linear-gradient(135deg, rgba(0,82,255,0.15) 0%, rgba(26,111,255,0.08) 100%)',
            }}
          >
            <LogoPair partnerLogoUrl={campaign.partner_logo_url} partnerName={campaign.project_name} size={18} />
            <div>
              <h1 className="text-2xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                {campaign.project_name}{' '}
                <span style={{ color: BLUE_LIGHT }}>×</span>{' '}
                BMG
              </h1>
            </div>
            <div className="ml-auto flex gap-2">
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
                <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: BLUE_LIGHT }} />
                <p className="text-white font-bold text-sm">{value}</p>
                <p className="text-gray-500 text-xs">{label}</p>
              </div>
            ))}
          </div>

          {/* Prize details */}
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5 mb-6">
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
              <Ticket className="w-4 h-4" style={{ color: BLUE_LIGHT }} /> Prize
            </h3>
            <p className="text-gray-400 text-sm">{campaign.prize_description}</p>
          </div>

          {/* Requirements & Tasks */}
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5 mb-8">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: BLUE_LIGHT }} /> Requirements & Tasks
            </h3>

            {roles.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Discord Role{roles.length > 1 ? 's' : ''} Required
                </p>
                <div className="space-y-2">
                  {roles.map((role, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#0052FF]/20"
                      style={{ background: 'rgba(0,82,255,0.08)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(0,82,255,0.2)' }}
                        >
                          <Users className="w-4 h-4" style={{ color: BLUE_LIGHT }} />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">"{role.role_name}"</p>
                          <p className="text-gray-400 text-xs">in {campaign.discord_guild_name}</p>
                        </div>
                      </div>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                        style={{ background: 'rgba(0,82,255,0.2)', color: BLUE_LIGHT }}
                      >
                        {role.weight}×
                      </span>
                    </div>
                  ))}
                </div>
                <a
                  href={campaign.discord_guild_invite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-xs font-semibold hover:text-[#0052FF] transition-colors"
                  style={{ color: BLUE_LIGHT }}
                >
                  <ExternalLink className="w-3 h-3" /> Join Server
                </a>
              </div>
            )}

            {hasTasks && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">X / Twitter Tasks</p>
                {campaign.x_tasks.map((task, idx) => (
                  <a key={idx} href={task.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8 hover:bg-white/6 hover:border-white/12 transition-all group">
                    <span className="text-lg">{TASK_ICONS[task.type] || 'X'}</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium group-hover:text-[#4d8aff] transition-colors">{task.label}</p>
                      <p className="text-gray-500 text-xs capitalize">{task.type}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-[#4d8aff] transition-colors" />
                  </a>
                ))}
              </div>
            )}

            {!hasTasks && roles.length === 0 && (
              <p className="text-gray-600 text-xs">No additional requirements for this collab.</p>
            )}
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
              ) : !discordIdentity ? (
                // Step 1 — Discord first. No wallet needed to see if you qualify.
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm mb-4">
                    Connect Discord to check if you qualify — no wallet needed yet.
                  </p>
                  <button
                    onClick={handleConnectDiscord}
                    className="w-full py-4 rounded-2xl text-white font-bold text-base hover:opacity-90 transition-all shadow-[0_0_30px_rgba(0,82,255,0.3)]"
                    style={{ background: `linear-gradient(to right, ${BLUE}, #1a6fff)` }}
                  >
                    🎮 Connect Discord
                  </button>
                </div>
              ) : checkingEligibility ? (
                <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking eligibility...
                </div>
              ) : eligibility && !eligibility.inServer ? (
                // Step 2a — connected Discord, but not in the partner's server yet.
                <div className="text-center py-2">
                  <p className="text-gray-300 text-sm mb-3">
                    You need to join <span className="font-semibold text-white">{campaign.discord_guild_name}</span> first.
                  </p>
                  <a
                    href={campaign.discord_guild_invite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold mb-3"
                    style={{ borderColor: `${BLUE}40`, color: BLUE_LIGHT }}
                  >
                    <ExternalLink className="w-4 h-4" /> Join {campaign.discord_guild_name}
                  </a>
                  <br />
                  <button
                    onClick={() => discordIdentity && checkEligibility(discordIdentity.userId, campaign)}
                    className="text-xs text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
                  >
                    I&apos;ve joined — recheck
                  </button>
                </div>
              ) : eligibility && !eligibility.matched ? (
                // Step 2b — in the server, but missing the required role.
                <div className="text-center py-2">
                  <p className="text-gray-300 text-sm mb-3">
                    You&apos;re in <span className="font-semibold text-white">{campaign.discord_guild_name}</span>, but you don&apos;t have a qualifying role yet.
                  </p>
                  <button
                    onClick={() => discordIdentity && checkEligibility(discordIdentity.userId, campaign)}
                    className="text-xs text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
                  >
                    Recheck eligibility
                  </button>
                </div>
              ) : eligibility?.matched && !isConnected ? (
                // Step 3 — eligible! Now, and only now, ask for a wallet.
                <div className="text-center py-2">
                  <div className="flex items-center justify-center gap-2 mb-4 text-green-400 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    You qualify!{eligibility.weight > 1 && ` ${eligibility.weight}× chance via "${eligibility.roleName}"`}
                  </div>
                  <p className="text-gray-400 text-sm mb-4">Connect your wallet to claim your entry.</p>
                  <WalletButton />
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting entry...
                </div>
              )}

              {discordIdentity && eligibility?.matched && isConnected && !entryResult && (
                <p className="text-xs text-gray-600 text-center mt-3">
                  Submitting your entry now...
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
