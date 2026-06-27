'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import {
  CheckCircle2, XCircle, Trophy, Users, Clock,
  ChevronDown, ChevronUp, Loader2, Plus, Trash2,
  Twitter, ExternalLink, Rocket, Wallet, LogOut, ShieldAlert,
  Copy, Check, MessageCircle, Bot
} from 'lucide-react';

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();

type XTaskType = 'follow' | 'like' | 'retweet' | 'comment';

interface XTask {
  type: XTaskType;
  label: string;
  url: string;
}

interface RaffleRole {
  role_id: string | null;
  role_name: string;
  weight: number;
}

interface Application {
  id: string;
  project_name: string;
  contact_name: string;
  contact_discord: string;
  contact_email: string;
  discord_guild_id: string;
  required_roles: RaffleRole[];
  prize_description: string;
  prize_quantity: number;
  proposed_start_date: string | null;
  proposed_end_date: string | null;
  x_handle: string | null;
  status: string;
  submitted_at: string;
}

interface Campaign {
  id: string;
  project_name: string;
  status: string;
  is_ready: boolean;
  total_entries: number;
  prize_quantity: number;
  end_date: string;
  x_tasks: XTask[];
  discord_guild_id: string | null;
}

const TASK_PRESETS: Record<XTaskType, { label: string; urlHint: string }> = {
  follow:  { label: 'Follow on X',        urlHint: 'https://x.com/intent/follow?screen_name=HANDLE'    },
  like:    { label: 'Like tweet',          urlHint: 'https://x.com/intent/like?tweet_id=TWEET_ID'       },
  retweet: { label: 'Retweet tweet',       urlHint: 'https://x.com/intent/retweet?tweet_id=TWEET_ID'    },
  comment: { label: 'Comment on tweet',    urlHint: 'https://x.com/HANDLE/status/TWEET_ID'              },
};

const BLUE = '#0052FF';
const BLUE_LIGHT = '#4d8aff';

// ── Wallet connect button ─────────────────────────────────────────────────
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
      className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold text-sm transition-all disabled:opacity-50"
      style={{ background: `linear-gradient(to right, ${BLUE}, #1a6fff)` }}
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

// ── Copy button component ────────────────────────────────────────────────
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-xs transition-all"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ── Bot connection status badge ──────────────────────────────────────────
// Shows whether /api/discord/bot-callback has fired for this campaign yet.
// Without discord_guild_id set, every entrant will silently fail role checks
// — this makes that gap visible in the panel instead of discovered later.
function BotStatusBadge({ guildId }: { guildId: string | null }) {
  if (guildId) {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-green-500/20 text-green-400 border-green-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        Bot connected
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
      Waiting on bot invite
    </span>
  );
}

// ── Bot Invite Modal ─────────────────────────────────────────────────────
function BotInviteModal({ guildId, guildName, onClose }: { guildId: string; guildName: string; onClose: () => void }) {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  // Minimal permissions: just needs to read member roles (no special permissions needed for role check)
  // Actually bot just needs to be present in server. No special permissions required for guilds/{id}/members/{id}
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=0&scope=bot&guild_id=${guildId}&disable_guild_select=true`;

  const discordDmUrl = `https://discord.com/channels/@me`; // Opens Discord DMs

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl border border-[#0052FF]/30 bg-[#0a0a0f] max-w-md w-full p-6 shadow-2xl shadow-[#0052FF]/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,82,255,0.2)' }}>
            <Bot className="w-5 h-5" style={{ color: BLUE_LIGHT }} />
          </div>
          <div>
            <h3 className="text-white font-bold">Bot Invite Ready</h3>
            <p className="text-gray-500 text-xs">{guildName}</p>
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-4">
          The partner must invite the BaseMatch raffle bot to their Discord server before the raffle goes live. 
          Send them this invite link.
        </p>

        <div className="rounded-xl border border-white/8 bg-white/4 p-4 mb-4">
          <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Bot Invite URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-[#4d8aff] font-mono break-all">{inviteUrl}</code>
            <CopyButton text={inviteUrl} label="Copy" />
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/4 p-4 mb-6">
          <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Quick Discord DM</p>
          <p className="text-gray-400 text-xs mb-3">
            Open Discord and DM the partner at <span className="text-white font-semibold">@{guildName}</span>
          </p>
          <a
            href={discordDmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 w-full py-2.5 rounded-xl text-white font-semibold text-sm justify-center transition-all hover:opacity-90"
            style={{ background: `linear-gradient(to right, ${BLUE}, #1a6fff)` }}
          >
            <MessageCircle className="w-4 h-4" /> Open Discord
          </a>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/20 text-white font-semibold text-sm hover:bg-white/6 transition-all"
          >
            Done — I'll send it
          </button>
        </div>

        <p className="text-gray-600 text-xs text-center mt-4">
          The bot needs <span className="text-yellow-400 font-semibold">Server Members Intent</span> enabled on our end (already done).
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function AdminRafflePage() {
  const { address, isConnected } = useAccount();

  const [applications, setApplications] = useState<Application[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [configuringCampaign, setConfiguringCampaign] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [campaignOverrides, setCampaignOverrides] = useState<Record<string, any>>({});
const [xTasksMap, setXTasksMap] = useState<Record<string, XTask[]>>({});
const [saveMessage, setSaveMessage] = useState<Record<string, string>>({});
const [botInviteApp, setBotInviteApp] = useState<Application | null>(null);
  const isAdmin = !!address && address.toLowerCase() === ADMIN_WALLET;

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([
      fetch('/api/raffle/applications', {
        headers: { 'x-admin-wallet': address! }
      }).then(r => r.json()),
      fetch('/api/raffle/campaigns').then(r => r.json()),
    ]).then(([apps, cams]) => {
      setApplications(apps.applications || []);
      const allCampaigns = cams.campaigns || [];
      setCampaigns(allCampaigns);
      const taskMap: Record<string, XTask[]> = {};
      allCampaigns.forEach((c: Campaign) => { taskMap[c.id] = c.x_tasks || []; });
      setXTasksMap(taskMap);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isAdmin, address]);

  // ── X Task helpers ──────────────────────────────────────────────────────
  function addTask(campaignId: string, type: XTaskType) {
    const preset = TASK_PRESETS[type];
    setXTasksMap(prev => ({
      ...prev,
      [campaignId]: [...(prev[campaignId] || []), { type, label: preset.label, url: '' }],
    }));
  }

  function updateTask(campaignId: string, index: number, field: keyof XTask, value: string) {
    setXTasksMap(prev => {
      const tasks = [...(prev[campaignId] || [])];
      tasks[index] = { ...tasks[index], [field]: value };
      return { ...prev, [campaignId]: tasks };
    });
  }

  function removeTask(campaignId: string, index: number) {
    setXTasksMap(prev => {
      const tasks = [...(prev[campaignId] || [])];
      tasks.splice(index, 1);
      return { ...prev, [campaignId]: tasks };
    });
  }

  async function saveTasks(campaignId: string, launch = false) {
    setActionLoading(`save-${campaignId}`);
    const tasks = xTasksMap[campaignId] || [];
    if (tasks.some(t => !t.url?.trim())) {
      setSaveMessage(prev => ({ ...prev, [campaignId]: '❌ All tasks must have a URL.' }));
      setActionLoading(null);
      return;
    }
    try {
      const res = await fetch(`/api/raffle/${campaignId}/configure`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_wallet: address, x_tasks: tasks, launch }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage(prev => ({ ...prev, [campaignId]: launch ? '🚀 BMG collab is live!' : '✅ Tasks saved.' }));
        if (launch) {
          setCampaigns(prev => prev.map(c =>
            c.id === campaignId ? { ...c, is_ready: true, status: 'active' } : c
          ));
          setConfiguringCampaign(null);
        }
      } else {
        setSaveMessage(prev => ({ ...prev, [campaignId]: `❌ ${data.error}` }));
      }
    } catch {
      setSaveMessage(prev => ({ ...prev, [campaignId]: '❌ Network error.' }));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApprove(app: Application) {
    setActionLoading(app.id);
    const overrides = campaignOverrides[app.id] || {};
    try {
      const res = await fetch(`/api/raffle/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          admin_wallet: address,
          campaign_data: {
            discord_guild_name: overrides.guild_name || app.project_name,
            discord_guild_invite: overrides.guild_invite || '',
            banner_url: overrides.banner_url || null,
            start_date: overrides.start_date || app.proposed_start_date,
            end_date: overrides.end_date || app.proposed_end_date,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a));
        if (data.campaign) {
          setCampaigns(prev => [...prev, { ...data.campaign, x_tasks: [] }]);
          setXTasksMap(prev => ({ ...prev, [data.campaign.id]: [] }));
          setConfiguringCampaign(data.campaign.id);
        }
        // Show bot invite modal after approval
        setBotInviteApp(app);
      }
    } finally { setActionLoading(null); }
  }

  async function handleDecline(appId: string) {
    setActionLoading(appId);
    try {
      await fetch(`/api/raffle/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline', admin_wallet: address }),
      });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'declined' } : a));
    } finally { setActionLoading(null); }
  }

  async function handleDraw(campaignId: string) {
    if (!confirm('Draw winners now? This cannot be undone.')) return;
    setActionLoading(campaignId);
    try {
      const res = await fetch('/api/raffle/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, drawn_by: address }),
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'drawn' } : c));
        alert(`✅ Drew ${data.winners_drawn} winner(s) from ${data.total_entries} entries.`);
      } else {
        alert(`❌ ${data.error}`);
      }
    } finally { setActionLoading(null); }
  }

  const inputCls = "w-full px-3 py-2 rounded-xl bg-white/6 border border-white/10 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#0052FF]/40 transition-all";

  // ── GATE 1: Wallet not connected ─────────────────────────────────────────
  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: `linear-gradient(135deg, ${BLUE}, #1a6fff)` }}>
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2">BMG Collab Admin</h1>
          <p className="text-gray-500 text-sm mb-8">Connect your admin wallet to access the dashboard.</p>
          <WalletButton />
        </div>
      </div>
    );
  }

  // ── GATE 2: Wrong wallet connected ───────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Wrong Wallet</h2>
          <p className="text-gray-500 text-sm mb-2">
            Connected as{' '}
            <span className="font-mono text-gray-300">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </p>
          <p className="text-gray-600 text-xs mb-8">This wallet is not the admin wallet. Disconnect and try again with the correct wallet.</p>
          <WalletButton />
        </div>
      </div>
    );
  }

  // ── GATE 3: Authorized — show dashboard ──────────────────────────────────
  const pending = applications.filter(a => a.status === 'pending');
  const reviewed = applications.filter(a => a.status !== 'pending');
  const stagingCampaigns = campaigns.filter(c => !c.is_ready);
  const activeCampaigns = campaigns.filter(c => c.is_ready && (c.status === 'active' || c.status === 'ended'));

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Bot Invite Modal */}
      {botInviteApp && (
        <BotInviteModal
          guildId={botInviteApp.discord_guild_id}
          guildName={botInviteApp.project_name}
          onClose={() => setBotInviteApp(null)}
        />
      )}

      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-extrabold mb-1">BMG Collab Admin</h1>
            <p className="text-gray-500 text-sm">Approve partners → Configure X tasks → Launch BMG raffles</p>
          </div>
          <WalletButton />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: BLUE }} />
          </div>
        ) : (
          <>
            {/* ── STEP 1: Pending Applications ─────────────────────────── */}
            <section className="mb-10">
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                Step 1 — Review Applications
                {pending.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">{pending.length}</span>
                )}
              </h2>
              <p className="text-gray-500 text-xs mb-4">Approve or decline BaseMatch Genesis collab requests.</p>

              {pending.length === 0 ? (
                <p className="text-gray-600 text-sm py-4">No pending applications</p>
              ) : (
                <div className="space-y-4">
                  {pending.map(app => (
                    <div key={app.id} className="rounded-2xl border border-white/8 bg-white/4 overflow-hidden">
                      <div className="p-5 flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-base">{app.project_name}</h3>
                          <p className="text-gray-400 text-xs mt-0.5">{app.contact_name} · {app.contact_discord} · {app.contact_email}</p>
                          <p className="text-gray-500 text-xs mt-1">
                            Prize: {app.prize_description} ({app.prize_quantity} WL spot{app.prize_quantity > 1 ? 's' : ''})
                          </p>
                          {app.x_handle && (
                            <p className="text-sky-400 text-xs mt-1">X: @{app.x_handle}</p>
                          )}
                        </div>
                        <button onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                          className="p-2 rounded-lg hover:bg-white/8 text-gray-400">
                          {expandedApp === app.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {expandedApp === app.id && (
                        <div className="border-t border-white/8 p-5 space-y-4">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div><p className="text-gray-500 mb-1">Guild ID</p><p className="font-mono">{app.discord_guild_id || '—'}</p></div>
                            <div>
                              <p className="text-gray-500 mb-1">Required Roles</p>
                              {Array.isArray(app.required_roles) && app.required_roles.length > 0 ? (
                                <div className="space-y-0.5">
                                  {app.required_roles.map((r, i) => (
                                    <p key={i}>
                                      {r.role_name}
                                      <span className="text-gray-500"> · {r.weight}×</span>
                                      {!r.role_id && (
                                        <span className="text-yellow-400"> · ID unresolved</span>
                                      )}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-600">—</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Campaign Overrides</p>
                            {[
                              { key: 'guild_name',   placeholder: 'Discord server display name' },
                              { key: 'guild_invite', placeholder: 'Discord invite URL' },
                              { key: 'banner_url',   placeholder: 'Banner image URL' },
                              { key: 'start_date',   placeholder: 'Start date', type: 'datetime-local' },
                              { key: 'end_date',     placeholder: 'End date',   type: 'datetime-local' },
                            ].map(({ key, placeholder, type }) => (
                              <input key={key} type={type || 'text'} placeholder={placeholder}
                                className={inputCls}
                                value={campaignOverrides[app.id]?.[key] || ''}
                                onChange={e => setCampaignOverrides(prev => ({
                                  ...prev, [app.id]: { ...prev[app.id], [key]: e.target.value }
                                }))}
                              />
                            ))}
                          </div>

                          <div className="flex gap-3">
                            <button onClick={() => handleApprove(app)} disabled={actionLoading === app.id}
                              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                              {actionLoading === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              Approve → Configure X Tasks
                            </button>
                            <button onClick={() => handleDecline(app.id)} disabled={actionLoading === app.id}
                              className="flex-1 py-3 rounded-xl bg-red-900/40 hover:bg-red-900/60 border border-red-700/40 font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                              <XCircle className="w-4 h-4" /> Decline
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── STEP 2: Configure X Tasks (staging campaigns) ─────────── */}
            {stagingCampaigns.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                  Step 2 — Configure X Tasks
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0052FF]/20 text-[#4d8aff] text-xs font-bold">{stagingCampaigns.length}</span>
                </h2>
                <p className="text-gray-500 text-xs mb-4">Add X engagement tasks before launching the BMG collab.</p>

                <div className="space-y-4">
                  {stagingCampaigns.map(c => {
                    const tasks = xTasksMap[c.id] || [];
                    const isConfiguring = configuringCampaign === c.id;

                    return (
                      <div key={c.id} className="rounded-2xl border border-[#0052FF]/20 bg-[#0052FF]/5 overflow-hidden">
                        <div className="p-5 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold">{c.project_name}</h3>
                              <BotStatusBadge guildId={c.discord_guild_id} />
                            </div>
                            <p className="text-[#4d8aff] text-xs mt-0.5">
                              {tasks.length} X task{tasks.length !== 1 ? 's' : ''} configured · Not yet live
                            </p>
                          </div>
                          <button onClick={() => setConfiguringCampaign(isConfiguring ? null : c.id)}
                            className="px-4 py-2 rounded-xl border border-[#0052FF]/40 text-[#4d8aff] text-sm font-semibold hover:bg-[#0052FF]/10 transition-all flex items-center gap-2">
                            <Twitter className="w-4 h-4" />
                            {isConfiguring ? 'Close' : 'Edit X Tasks'}
                          </button>
                        </div>

                        {isConfiguring && (
                          <div className="border-t border-white/8 p-5 space-y-5">
                            {tasks.length > 0 && (
                              <div className="space-y-3">
                                {tasks.map((task, idx) => (
                                  <div key={idx} className="rounded-xl border border-white/8 bg-white/4 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                        task.type === 'follow'  ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' :
                                        task.type === 'like'    ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' :
                                        task.type === 'retweet' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                        'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                      }`}>
                                        {task.type.toUpperCase()}
                                      </span>
                                      <button onClick={() => removeTask(c.id, idx)}
                                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <input className={inputCls} placeholder="Task label e.g. Follow @BaseMonkeys"
                                      value={task.label} onChange={e => updateTask(c.id, idx, 'label', e.target.value)} />
                                    <div className="flex gap-2">
                                      <input className={inputCls} placeholder={TASK_PRESETS[task.type].urlHint}
                                        value={task.url} onChange={e => updateTask(c.id, idx, 'url', e.target.value)} />
                                      {task.url && (
                                        <a href={task.url} target="_blank" rel="noopener noreferrer"
                                          className="p-2 rounded-xl border border-white/10 text-gray-400 hover:text-white flex-shrink-0">
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Add Task</p>
                              <div className="flex flex-wrap gap-2">
                                {(Object.keys(TASK_PRESETS) as XTaskType[]).map(type => (
                                  <button key={type} onClick={() => addTask(c.id, type)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                      type === 'follow'  ? 'border-sky-500/40 text-sky-400 hover:bg-sky-500/10' :
                                      type === 'like'    ? 'border-pink-500/40 text-pink-400 hover:bg-pink-500/10' :
                                      type === 'retweet' ? 'border-green-500/40 text-green-400 hover:bg-green-500/10' :
                                      'border-orange-500/40 text-orange-400 hover:bg-orange-500/10'
                                    }`}>
                                    <Plus className="w-3.5 h-3.5" />
                                    {TASK_PRESETS[type].label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {saveMessage[c.id] && (
                              <p className="text-sm font-medium text-center"
                                style={{ color: saveMessage[c.id].startsWith('❌') ? '#f87171' : '#4ade80' }}>
                                {saveMessage[c.id]}
                              </p>
                            )}

                            <div className="flex gap-3">
                              <button onClick={() => saveTasks(c.id, false)} disabled={actionLoading === `save-${c.id}`}
                                className="flex-1 py-3 rounded-xl border border-white/20 text-white font-semibold text-sm hover:bg-white/6 disabled:opacity-50 transition-all">
                                {actionLoading === `save-${c.id}` ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Draft'}
                              </button>
                              <button onClick={() => saveTasks(c.id, true)}
                                disabled={actionLoading === `save-${c.id}` || tasks.length === 0}
                                className="flex-1 py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                style={{ background: `linear-gradient(to right, ${BLUE}, #1a6fff)` }}>
                                {actionLoading === `save-${c.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                Save & Launch
                              </button>
                            </div>

                            {tasks.length === 0 && (
                              <p className="text-xs text-gray-600 text-center">
                                Add at least one X task before launching. You can also launch with no tasks — just click Save & Launch with an empty list.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── STEP 3: Active Campaigns (Draw trigger) ───────────────── */}
            <section className="mb-10">
              <h2 className="text-lg font-bold mb-1">Step 3 — Draw Winners</h2>
              <p className="text-gray-500 text-xs mb-4">Trigger the BMG whitelist draw.</p>

              {activeCampaigns.length === 0 ? (
                <p className="text-gray-600 text-sm py-4">No live BMG collabs yet</p>
              ) : (
                <div className="space-y-3">
                  {activeCampaigns.map(c => (
                    <div key={c.id} className="rounded-2xl border border-white/8 bg-white/4 p-5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{c.project_name}</h3>
                          <BotStatusBadge guildId={c.discord_guild_id} />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.total_entries} entries</span>
                          <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />{c.prize_quantity} WL spots</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Ends {new Date(c.end_date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Twitter className="w-3.5 h-3.5" />{c.x_tasks?.length || 0} X tasks</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setConfiguringCampaign(configuringCampaign === c.id ? null : c.id)}
                          className="px-3 py-2 rounded-xl border border-white/10 text-gray-400 text-xs hover:text-white hover:border-white/20 transition-all">
                          Edit Tasks
                        </button>
                        <button onClick={() => handleDraw(c.id)} disabled={actionLoading === c.id}
                          className="px-4 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                          style={{ background: `linear-gradient(to right, ${BLUE}, #1a6fff)` }}>
                          {actionLoading === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                          Draw Winners
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Reviewed Applications ────────────────────────────────── */}
            {reviewed.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4 text-gray-500">Reviewed Applications</h2>
                <div className="space-y-2">
                  {reviewed.map(app => (
                    <div key={app.id} className="rounded-xl border border-white/6 bg-white/2 px-4 py-3 flex items-center justify-between">
                      <span className="text-gray-300 text-sm font-medium">{app.project_name}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        app.status === 'approved'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>{app.status}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
