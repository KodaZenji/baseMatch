'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Ticket, ExternalLink, Plus, Minus } from 'lucide-react';

interface RaffleRole {
  role_id: string;
  role_name: string;
  weight: number;
}

export default function RaffleApplyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    project_name: '', project_description: '', contact_name: '',
    contact_discord: '', contact_email: '', website_url: '', twitter_url: '',
    x_handle: '', partner_logo_url: '',
    discord_server_url: '', discord_guild_id: '',
    prize_description: '', prize_quantity: '1',
    proposed_start_date: '', proposed_end_date: '',
  });
  const [roles, setRoles] = useState<RaffleRole[]>([{ role_id: '', role_name: '', weight: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const addRole = () => setRoles(r => [...r, { role_id: '', role_name: '', weight: 1 }]);
  const removeRole = (i: number) => setRoles(r => r.filter((_, idx) => idx !== i));
  const setRole = (i: number, field: keyof RaffleRole, value: string | number) =>
    setRoles(r => r.map((role, idx) => idx === i ? { ...role, [field]: value } : role));

  async function handleSubmit() {
    setError('');
    const required = ['project_name', 'project_description', 'contact_name', 'contact_discord',
      'contact_email', 'discord_server_url', 'prize_description'];
    if (required.some(k => !form[k as keyof typeof form]?.trim())) {
      setError('Please fill in all required fields.'); return;
    }
    if (!form.partner_logo_url.trim()) {
      setError('Please provide a partner logo URL.'); return;
    }
    const validRoles = roles.filter(r => r.role_name.trim());
    if (validRoles.length === 0) {
      setError('Please add at least one required role with a name.'); return;
    }
    if (validRoles.some(r => r.weight < 1)) {
      setError('All role weights must be at least 1.'); return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/raffle/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          prize_quantity: parseInt(form.prize_quantity) || 1,
          x_handle: form.x_handle?.trim() || null,
          partner_logo_url: form.partner_logo_url.trim(),
          required_roles: validRoles.map(r => ({
            role_id: r.role_id.trim() || null,
            role_name: r.role_name.trim(),
            weight: Math.max(1, Number(r.weight)),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Submission failed.'); return; }
      setSubmitted(true);
    } catch { setError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#0052FF]/50 focus:bg-white/8 transition-all";
  const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2";

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0052FF] to-[#1a6fff] flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(0,82,255,0.4)]">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Application Submitted!</h2>
          <p className="text-gray-400 text-sm mb-6">
            We'll review your project for a BaseMatch Genesis collab and reply via Discord within 2-3 days.
          </p>
          <button onClick={() => router.push('/raffle')}
            className="px-8 py-3 bg-gradient-to-r from-[#0052FF] to-[#1a6fff] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">
            View Active Collabs
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <div className="min-h-screen bg-[#0a0a0f] relative" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#0052FF]/8 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-[#0052FF]/6 blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
          <button onClick={() => router.push('/raffle')} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors mb-10 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Collabs
          </button>

          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0052FF] to-[#1a6fff] flex items-center justify-center">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <span className="text-[#0052FF] font-semibold text-sm tracking-widest uppercase">BaseMatch Genesis</span>
            </div>
            <h1
              className="text-4xl font-extrabold text-white mb-3"
              style={{
                fontFamily: "'Syne', sans-serif",
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundImage: 'linear-gradient(to right, #4d8aff, #0052FF)',
              }}
            >
              Partner Collab{' '}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #4d8aff, #0052FF)' }}>
                Application
              </span>
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Apply to partner with BaseMatch Genesis. Approved projects run a raffle for BMG whitelist spots in their own Discord community.
            </p>
          </div>

          <div className="space-y-6">
            {/* Project info */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-6 space-y-4">
              <h2 className="text-white font-bold text-base">Project Information</h2>
              <div>
                <label className={labelCls}>Project Name *</label>
                <input className={inputCls} placeholder="e.g. BaseMonkeys" value={form.project_name} onChange={set('project_name')} />
              </div>
              <div>
                <label className={labelCls}>Project Description *</label>
                <textarea className={inputCls} rows={3} placeholder="What is your project about?" value={form.project_description}
                  onChange={e => setForm(p => ({ ...p, project_description: e.target.value }))} />
              </div>
              {/* Partner Logo URL — replaces banner_url */}
              <div>
                <label className={labelCls}>Partner Logo URL *</label>
                <input className={inputCls} placeholder="https://... (square image, min 128×128px recommended)"
                  value={form.partner_logo_url} onChange={set('partner_logo_url')} />
                <p className="text-xs text-gray-600 mt-1.5">
                  Use a square image. It will appear alongside the BaseMatch logo on raffle cards and the detail page.
                </p>
              </div>
              {/* Live logo preview */}
              {form.partner_logo_url && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8">
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Preview</span>
                  <img
                    src={form.partner_logo_url}
                    alt="Partner logo preview"
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-white/10"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Website</label>
                  <input className={inputCls} placeholder="https://" value={form.website_url} onChange={set('website_url')} />
                </div>
                <div>
                  <label className={labelCls}>X / Twitter URL</label>
                  <input className={inputCls} placeholder="https://x.com/..." value={form.twitter_url} onChange={set('twitter_url')} />
                </div>
              </div>
              <div>
                <label className={labelCls}>X Handle <span className="text-gray-600 font-normal normal-case tracking-normal">(optional)</span></label>
                <input className={inputCls} placeholder="@yourproject" value={form.x_handle} onChange={set('x_handle')} />
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-6 space-y-4">
              <h2 className="text-white font-bold text-base">Contact Details</h2>
              <div>
                <label className={labelCls}>Your Name *</label>
                <input className={inputCls} placeholder="Full name" value={form.contact_name} onChange={set('contact_name')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Discord Username *</label>
                  <input className={inputCls} placeholder="@username" value={form.contact_discord} onChange={set('contact_discord')} />
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input type="email" className={inputCls} placeholder="you@email.com" value={form.contact_email} onChange={set('contact_email')} />
                </div>
              </div>
            </div>

            {/* Discord server */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-base">Discord Server</h2>
                <a href="https://discord.com/developers/docs/reference" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#4d8aff] flex items-center gap-1 hover:text-[#0052FF]">
                  How to find IDs <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="rounded-xl bg-[#0052FF]/8 border border-[#0052FF]/20 p-3 text-xs text-[#4d8aff]">
                ⚠️ You must invite the BaseMatch bot to your server before approval.
                Bot invite link will be provided after review.
              </div>
              <div>
                <label className={labelCls}>Discord Server Invite Link *</label>
                <input className={inputCls} placeholder="https://discord.gg/..." value={form.discord_server_url} onChange={set('discord_server_url')} />
              </div>
              <div>
                <label className={labelCls}>Server (Guild) ID <span className="text-gray-600 font-normal normal-case tracking-normal">(optional)</span></label>
                <input className={inputCls} placeholder="123456789012345678" value={form.discord_guild_id} onChange={set('discord_guild_id')} />
              </div>

              {/* Required Roles with weights — replaces single role_id + role_name */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls + ' mb-0'}>
                    Required Roles * <span className="text-gray-600 font-normal normal-case tracking-normal">(at least one)</span>
                  </label>
                  <span className="text-xs text-gray-600">Weight = raffle chance multiplier (min 1×)</span>
                </div>

                <div className="space-y-2">
                  {roles.map((role, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        className={inputCls + ' flex-1'}
                        placeholder="Role ID (optional)"
                        value={role.role_id}
                        onChange={e => setRole(i, 'role_id', e.target.value)}
                      />
                      <input
                        className={inputCls + ' flex-1'}
                        placeholder="Role Name e.g. Holder *"
                        value={role.role_name}
                        onChange={e => setRole(i, 'role_name', e.target.value)}
                      />
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-gray-500 text-xs">Weight</span>
                        <input
                          type="number"
                          min="1"
                          className="w-16 px-3 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-[#0052FF]/50 transition-all"
                          value={role.weight}
                          onChange={e => setRole(i, 'weight', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      {roles.length > 1 && (
                        <button
                          onClick={() => removeRole(i)}
                          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-red-500/20 text-red-400/50 hover:text-red-400 hover:border-red-500/40 transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={addRole}
                  className="mt-3 flex items-center gap-1.5 text-xs text-[#4d8aff] hover:text-[#0052FF] transition-colors font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add another role
                </button>

                <p className="text-xs text-gray-600 mt-2">
                  Higher weight = more raffle entries. e.g. "OG Holder" at 3× gets 3× the chance of "Member" at 1×.
                </p>
              </div>
            </div>

            {/* Prize + dates */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-6 space-y-4">
              <h2 className="text-white font-bold text-base">BMG Whitelist & Timeline</h2>
              <div>
                <label className={labelCls}>Prize Description *</label>
                <textarea className={inputCls} rows={2} placeholder="e.g. 5x BaseMatch Genesis GTD spots"
                  value={form.prize_description} onChange={e => setForm(p => ({ ...p, prize_description: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Number of WL Spots *</label>
                <input type="number" min="1" max="100" className={inputCls} value={form.prize_quantity} onChange={set('prize_quantity')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Proposed Start Date</label>
                  <input type="datetime-local" className={inputCls} value={form.proposed_start_date} onChange={set('proposed_start_date')} />
                </div>
                <div>
                  <label className={labelCls}>Proposed End Date</label>
                  <input type="datetime-local" className={inputCls} value={form.proposed_end_date} onChange={set('proposed_end_date')} />
                </div>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
            )}

            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-4 rounded-2xl text-white font-bold text-base hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(0,82,255,0.3)]"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: 'linear-gradient(to right, #0052FF, #1a6fff)',
              }}>
              {submitting ? 'Submitting...' : 'Submit Collab Application →'}
            </button>

            <p className="text-center text-gray-600 text-xs">
              We review all BaseMatch Genesis collab applications within 2-3 days. You'll be contacted via Discord.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
