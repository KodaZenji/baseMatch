
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Twitter,
  Users,
  MessageSquareQuote,
  ThumbsUp,
  ChevronRight,
} from 'lucide-react';

const BASEMATCH_X_HANDLE = 'basematch_';
const PINNED_TWEET_ID = '2068403150843789756';
const GUILD_XYZ_URL = 'https://guild.xyz/basematch';

const FOLLOW_URL = `https://x.com/intent/follow?screen_name=${BASEMATCH_X_HANDLE}`;
const LIKE_URL = `https://x.com/intent/like?tweet_id=${PINNED_TWEET_ID}`;
const QT_URL = `https://x.com/intent/retweet?tweet_id=${PINNED_TWEET_ID}&text=${encodeURIComponent('BMG soon 👀 @basematch_')}`;
const PINNED_TWEET_URL = `https://x.com/basematch_/status/${PINNED_TWEET_ID}`;

type TaskStatus = 'idle' | 'done';

interface FormState {
  xUsername: string;
  qtLink: string;
  commentLink: string;
  walletAddress: string;
}

interface TaskState {
  followed: TaskStatus;
  liked: TaskStatus;
  qt: TaskStatus;
}

// Base blue accent color constants
const BLUE = '#0052FF';
const BLUE_LIGHT = '#4d8aff';
const BLUE_DIM = 'rgba(0,82,255,0.15)';

export default function ApplyWhitelistPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    xUsername: '',
    qtLink: '',
    commentLink: '',
    walletAddress: '',
  });
  const [tasks, setTasks] = useState<TaskState>({
    followed: 'idle',
    liked: 'idle',
    qt: 'idle',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const toggleTask = (task: keyof TaskState) => {
    setTasks((prev) => ({
      ...prev,
      [task]: prev[task] === 'done' ? 'idle' : 'done',
    }));
  };

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async () => {
    setError('');

    if (!form.xUsername.trim()) return setError('Please enter your X username.');
    if (!form.qtLink.trim()) return setError('Please paste your Quote Tweet link.');
    if (!form.commentLink.trim()) return setError('Please paste your comment link.');
    if (!form.walletAddress.trim() || !form.walletAddress.startsWith('0x')) {
      return setError('Please enter a valid EVM wallet address (starts with 0x).');
    }
    if (tasks.followed !== 'done' || tasks.liked !== 'done' || tasks.qt !== 'done') {
      return setError('Please complete and confirm all three required tasks above.');
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/whitelist-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x_username: form.xUsername.replace('@', '').toLowerCase().trim(),
          qt_link: form.qtLink.trim(),
          comment_link: form.commentLink.trim(),
          wallet_address: form.walletAddress.toLowerCase().trim(),
          tasks_completed: tasks,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Submission failed. Please try again.');
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
        <div className="text-center max-w-sm">
          <div className="relative inline-flex mb-8">
            <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center ring-1 ring-white/10">
              <CheckCircle2 className="w-10 h-10" style={{ color: BLUE }} />
            </div>
          </div>
          <h2 className="text-[28px] font-semibold text-white mb-3 tracking-tight">
            Application Received
          </h2>
          <p className="text-[#8E8E93] mb-8 leading-relaxed text-[15px]">
            We&apos;ve logged your entry. Thanks for completing the tasks. Stay tuned on X.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 text-white text-[15px] font-medium rounded-full active:scale-95 transition-all"
            style={{ background: `linear-gradient(to right, ${BLUE}, #1a6fff)` }}
          >
            Back to BaseMatch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-hidden" style={{ '--accent': BLUE } as React.CSSProperties}>
      {/* Base blue ambient glows — matches /raffle */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#0052FF]/8 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-[#0052FF]/6 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 py-10">

        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-[#8E8E93] hover:text-white transition-colors mb-8 text-[15px] font-medium active:opacity-60"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0052FF] to-[#1a6fff] flex items-center justify-center shadow-[0_0_20px_rgba(0,82,255,0.4)]">
              <Heart className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <span className="font-medium text-[13px] tracking-wide uppercase" style={{ color: BLUE_LIGHT }}>
              BASEMATCH GENESIS
            </span>
          </div>
          <h1 className="text-[32px] font-semibold text-white leading-tight mb-3 tracking-tight">
            Apply for Whitelist
          </h1>
          <p className="text-[#8E8E93] text-[15px] leading-relaxed">
            Complete the tasks below and submit your wallet to enter the whitelist.
          </p>
        </div>

        {/* Guild nudge banner */}
        <a
          href={GUILD_XYZ_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 hover:bg-[#2C2C2E] transition-colors mb-8 group active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-lg bg-[#2C2C2E] flex items-center justify-center ring-1 ring-white/10 flex-shrink-0">
            <Users className="w-4 h-4" style={{ color: BLUE }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-[15px] mb-0.5">
              Boost your chances
            </p>
            <p className="text-[#8E8E93] text-[13px] truncate">
              Complete quests on Guild.xyz → basematch
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors flex-shrink-0" />
        </a>

        <div className="space-y-4 mb-6">

          {/* Task 1 — Follow */}
          <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#2C2C2E] flex items-center justify-center">
                    <Twitter className="w-3.5 h-3.5" style={{ color: BLUE_LIGHT }} />
                  </div>
                  <span className="text-white font-medium text-[15px]">Follow @{BASEMATCH_X_HANDLE}</span>
                </div>
                {tasks.followed === 'done' && (
                  <span className="flex items-center gap-1 text-emerald-400 text-[13px] font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Done
                  </span>
                )}
              </div>
              <button
                onClick={() => openLink(FOLLOW_URL)}
                className="w-full py-2.5 rounded-xl bg-[#2C2C2E] text-[13px] font-medium hover:bg-[#3A3A3C] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                style={{ color: BLUE_LIGHT }}
              >
                Follow on X
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>
            <div
              onClick={() => toggleTask('followed')}
              className="px-5 py-3.5 flex items-center justify-between border-t border-white/5 cursor-pointer active:bg-[#2C2C2E] transition-colors"
              style={tasks.followed === 'done' ? { backgroundColor: `${BLUE}18` } : {}}
            >
              <span className="text-[13px]" style={{ color: tasks.followed === 'done' ? BLUE : '#8E8E93', fontWeight: tasks.followed === 'done' ? 500 : 400 }}>
                {tasks.followed === 'done' ? 'Confirmed' : 'Tap to confirm you followed'}
              </span>
              <div
                className="w-5 h-5 rounded-full border flex items-center justify-center transition-all"
                style={tasks.followed === 'done'
                  ? { backgroundColor: BLUE, borderColor: BLUE }
                  : { borderColor: '#8E8E93' }}
              >
                {tasks.followed === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
          </div>

          {/* Task 2 — Like */}
          <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#2C2C2E] flex items-center justify-center">
                    <ThumbsUp className="w-3.5 h-3.5" style={{ color: BLUE_LIGHT }} />
                  </div>
                  <span className="text-white font-medium text-[15px]">Like X post</span>
                </div>
                {tasks.liked === 'done' && (
                  <span className="flex items-center gap-1 text-emerald-400 text-[13px] font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Done
                  </span>
                )}
              </div>
              <button
                onClick={() => openLink(LIKE_URL)}
                className="w-full py-2.5 rounded-xl bg-[#2C2C2E] text-[13px] font-medium hover:bg-[#3A3A3C] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-3"
                style={{ color: BLUE_LIGHT }}
              >
                Like the post
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>
              <input
                type="text"
                placeholder="Your X username (e.g. @yourname)"
                value={form.xUsername}
                onChange={(e) => setForm((p) => ({ ...p, xUsername: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-[#2C2C2E] border border-white/5 text-white text-[15px] placeholder-[#8E8E93] focus:outline-none focus:bg-[#3A3A3C] transition-all"
                style={{ '--tw-ring-color': BLUE } as React.CSSProperties}
                onFocus={e => e.target.style.borderColor = `${BLUE}80`}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
              />
            </div>
            <div
              onClick={() => toggleTask('liked')}
              className="px-5 py-3.5 flex items-center justify-between border-t border-white/5 cursor-pointer active:bg-[#2C2C2E] transition-colors"
              style={tasks.liked === 'done' ? { backgroundColor: `${BLUE}18` } : {}}
            >
              <span className="text-[13px]" style={{ color: tasks.liked === 'done' ? BLUE : '#8E8E93', fontWeight: tasks.liked === 'done' ? 500 : 400 }}>
                {tasks.liked === 'done' ? 'Confirmed' : 'Tap to confirm you liked'}
              </span>
              <div
                className="w-5 h-5 rounded-full border flex items-center justify-center transition-all"
                style={tasks.liked === 'done'
                  ? { backgroundColor: BLUE, borderColor: BLUE }
                  : { borderColor: '#8E8E93' }}
              >
                {tasks.liked === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
          </div>

          {/* Task 3 — QT */}
          <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#2C2C2E] flex items-center justify-center">
                    <MessageSquareQuote className="w-3.5 h-3.5" style={{ color: BLUE_LIGHT }} />
                  </div>
                  <span className="text-white font-medium text-[15px]">
                    QT with <span className="italic" style={{ color: BLUE_LIGHT }}>&quot;BMG soon&quot;</span>
                  </span>
                </div>
                {tasks.qt === 'done' && (
                  <span className="flex items-center gap-1 text-emerald-400 text-[13px] font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Done
                  </span>
                )}
              </div>
              <button
                onClick={() => openLink(QT_URL)}
                className="w-full py-2.5 rounded-xl bg-[#2C2C2E] text-[13px] font-medium hover:bg-[#3A3A3C] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-3"
                style={{ color: BLUE_LIGHT }}
              >
                Quote Tweet
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>
              <input
                type="url"
                placeholder="Paste your QT link"
                value={form.qtLink}
                onChange={(e) => setForm((p) => ({ ...p, qtLink: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-[#2C2C2E] border border-white/5 text-white text-[15px] placeholder-[#8E8E93] focus:outline-none focus:bg-[#3A3A3C] transition-all"
                onFocus={e => e.target.style.borderColor = `${BLUE}80`}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
              />
            </div>
            <div
              onClick={() => toggleTask('qt')}
              className="px-5 py-3.5 flex items-center justify-between border-t border-white/5 cursor-pointer active:bg-[#2C2C2E] transition-colors"
              style={tasks.qt === 'done' ? { backgroundColor: `${BLUE}18` } : {}}
            >
              <span className="text-[13px]" style={{ color: tasks.qt === 'done' ? BLUE : '#8E8E93', fontWeight: tasks.qt === 'done' ? 500 : 400 }}>
                {tasks.qt === 'done' ? 'Confirmed' : "Tap to confirm you QT'd"}
              </span>
              <div
                className="w-5 h-5 rounded-full border flex items-center justify-center transition-all"
                style={tasks.qt === 'done'
                  ? { backgroundColor: BLUE, borderColor: BLUE }
                  : { borderColor: '#8E8E93' }}
              >
                {tasks.qt === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
          </div>

          {/* Task 4 — Tag 3 friends (kept orange as original accent for variety) */}
          <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#2C2C2E] flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <span className="text-white font-medium text-[15px]">Tag 2 friends</span>
            </div>
            <p className="text-[#8E8E93] text-[13px] mb-3 leading-relaxed">
              Comment on the{' '}
              <a
                href={PINNED_TWEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 underline underline-offset-2 decoration-white/10"
              >
                pinned post
              </a>{' '}
              tagging 3 friends, then paste the link below.
            </p>
            <input
              type="url"
              placeholder="Paste your comment link"
              value={form.commentLink}
              onChange={(e) => setForm((p) => ({ ...p, commentLink: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-[#2C2C2E] border border-white/5 text-white text-[15px] placeholder-[#8E8E93] focus:outline-none focus:border-orange-400/50 focus:bg-[#3A3A3C] transition-all"
            />
          </div>

          {/* Wallet */}
          <div className="rounded-2xl bg-[#1C1C1E] ring-1 ring-white/5 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#2C2C2E] flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded" style={{ background: `linear-gradient(135deg, ${BLUE}, ${BLUE_LIGHT})` }} />
              </div>
              <span className="text-white font-medium text-[15px]">Submit EVM Wallet</span>
            </div>
            <input
              type="text"
              placeholder="0x..."
              value={form.walletAddress}
              onChange={(e) => setForm((p) => ({ ...p, walletAddress: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-[#2C2C2E] border border-white/5 text-white text-[15px] placeholder-[#8E8E93] focus:outline-none focus:bg-[#3A3A3C] transition-all font-mono"
              onFocus={e => e.target.style.borderColor = `${BLUE}80`}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 rounded-2xl text-white font-semibold text-[16px] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          style={{ background: `linear-gradient(to right, ${BLUE}, #1a6fff)` }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Submitting...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Submit Application
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </button>

        <p className="text-center text-[#8E8E93] text-[12px] mt-4">
          Duplicate submissions are filtered. One entry per wallet.
        </p>
      </div>
    </div>
  );
}
