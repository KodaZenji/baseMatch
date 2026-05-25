'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ArrowLeft, ExternalLink, CheckCircle2, Twitter, Users, MessageSquareQuote, ThumbsUp } from 'lucide-react';

// ─── REPLACE THESE WITH REAL VALUES ───────────────────────────────────────────
const BASEMATCH_X_HANDLE = 'BaseMatchApp';
const BASEMATCH_X_PROFILE_URL = `https://x.com/${BASEMATCH_X_HANDLE}`;
const PINNED_TWEET_URL = 'https://x.com/BaseMatchApp/status/PLACEHOLDER_TWEET_ID';
const GUILD_XYZ_URL = 'https://guild.xyz/basematch'; // replace with real guild URL
// ──────────────────────────────────────────────────────────────────────────────

const FOLLOW_URL = `https://x.com/intent/follow?screen_name=${BASEMATCH_X_HANDLE}`;
const LIKE_URL = `https://x.com/intent/like?tweet_id=PLACEHOLDER_TWEET_ID`;
const QT_URL = `https://x.com/intent/retweet?tweet_id=PLACEHOLDER_TWEET_ID&text=${encodeURIComponent('Mochis are coming 👀 @BaseMatchApp')}`;

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

  const markTask = (task: keyof TaskState) => {
    setTasks(prev => ({ ...prev, [task]: 'done' }));
  };

  const handleExternalTask = (url: string, task: keyof TaskState) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => markTask(task), 1500);
  };

  const handleSubmit = async () => {
    setError('');

    if (!form.xUsername.trim()) return setError('Please enter your X username.');
    if (!form.qtLink.trim()) return setError('Please paste your QT link.');
    if (!form.commentLink.trim()) return setError('Please paste your comment link.');
    if (!form.walletAddress.trim() || !form.walletAddress.startsWith('0x')) {
      return setError('Please enter a valid EVM wallet address (starts with 0x).');
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/whitelist/apply', {
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

  // ─── SUCCESS STATE ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="relative inline-flex mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-[0_0_60px_rgba(193,28,132,0.5)]">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-pink-400 rounded-full animate-ping" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>
            Application Received!
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            We've logged your entry. OG roles will be distributed based on Guild membership and task completion. Stay tuned on X.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Back to BaseMatch
          </button>
        </div>
      </div>
    );
  }

  // ─── MAIN FORM ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>

      <div
        className="min-h-screen bg-[#0a0a0f] relative overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Background glow blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-pink-600/10 blur-[120px]" />
          <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-purple-600/10 blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-pink-500/8 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-lg mx-auto px-4 py-10">

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors mb-10 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(193,28,132,0.4)]">
                <Heart className="w-5 h-5 text-white" fill="white" />
              </div>
              <span className="text-pink-400 font-semibold text-sm tracking-widest uppercase">BaseMatch</span>
            </div>
            <h1
              className="text-4xl font-extrabold text-white leading-tight mb-3"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Apply for<br />
              <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                OG Whitelist
              </span>
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Complete the tasks below and submit your wallet to enter. OG roles are awarded based on merit and community involvement.
            </p>
          </div>

          {/* Guild nudge banner */}
          <a
            href={GUILD_XYZ_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-4 rounded-2xl border border-purple-500/30 bg-purple-500/8 hover:bg-purple-500/12 transition-colors mb-8 group"
          >
            <div className="mt-0.5 w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-purple-300 font-semibold text-sm mb-0.5">
                Boost your chances 🚀
              </p>
              <p className="text-gray-500 text-xs leading-relaxed">
                Members of our Guild.xyz page stand a higher chance of receiving OG status. Everyone else will be considered fairly.
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5 group-hover:text-purple-300 transition-colors" />
          </a>

          {/* Task cards */}
          <div className="space-y-3 mb-8">

            {/* Task 1 — Follow */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-sky-400" />
                  <span className="text-white font-semibold text-sm">Follow BaseMatch</span>
                </div>
                {tasks.followed === 'done' && (
                  <span className="flex items-center gap-1 text-green-400 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Done
                  </span>
                )}
              </div>
              <button
                onClick={() => handleExternalTask(FOLLOW_URL, 'followed')}
                className="w-full py-2.5 rounded-xl border border-sky-500/40 bg-sky-500/10 text-sky-400 text-sm font-semibold hover:bg-sky-500/20 transition-all hover:border-sky-400/60 flex items-center justify-center gap-2"
              >
                Follow @{BASEMATCH_X_HANDLE}
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Task 2 — Like + username */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-pink-400" />
                  <span className="text-white font-semibold text-sm">Like pinned post</span>
                </div>
                {tasks.liked === 'done' && (
                  <span className="flex items-center gap-1 text-green-400 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Done
                  </span>
                )}
              </div>
              <button
                onClick={() => handleExternalTask(LIKE_URL, 'liked')}
                className="w-full py-2.5 rounded-xl border border-pink-500/40 bg-pink-500/10 text-pink-400 text-sm font-semibold hover:bg-pink-500/20 transition-all hover:border-pink-400/60 flex items-center justify-center gap-2 mb-3"
              >
                Like the post
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <input
                type="text"
                placeholder="Your X username (e.g. @yourname)"
                value={form.xUsername}
                onChange={e => setForm(p => ({ ...p, xUsername: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-white/6 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Task 3 — QT */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquareQuote className="w-4 h-4 text-purple-400" />
                  <span className="text-white font-semibold text-sm">
                    QT with <span className="italic text-purple-300">"Mochis are coming"</span>
                  </span>
                </div>
                {tasks.qt === 'done' && (
                  <span className="flex items-center gap-1 text-green-400 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Done
                  </span>
                )}
              </div>
              <button
                onClick={() => handleExternalTask(QT_URL, 'qt')}
                className="w-full py-2.5 rounded-xl border border-purple-500/40 bg-purple-500/10 text-purple-400 text-sm font-semibold hover:bg-purple-500/20 transition-all hover:border-purple-400/60 flex items-center justify-center gap-2 mb-3"
              >
                Quote Tweet
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <input
                type="url"
                placeholder="Paste your QT link"
                value={form.qtLink}
                onChange={e => setForm(p => ({ ...p, qtLink: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-white/6 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Task 4 — Tag 3 friends */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-orange-400" />
                <span className="text-white font-semibold text-sm">Tag 3 friends on pinned post</span>
              </div>
              <p className="text-gray-500 text-xs mb-3">
                Comment on the{' '}
                <a href={PINNED_TWEET_URL} target="_blank" rel="noopener noreferrer" className="text-orange-400 underline hover:text-orange-300">
                  pinned post
                </a>
                {' '}tagging 3 friends, then paste the link below.
              </p>
              <input
                type="url"
                placeholder="Paste your comment link"
                value={form.commentLink}
                onChange={e => setForm(p => ({ ...p, commentLink: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-white/6 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Wallet */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-pink-500 to-purple-600 flex-shrink-0" />
                <span className="text-white font-semibold text-sm">Submit EVM Wallet</span>
              </div>
              <input
                type="text"
                placeholder="0x..."
                value={form.walletAddress}
                onChange={e => setForm(p => ({ ...p, walletAddress: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-white/6 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:bg-white/8 transition-all font-mono"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-base hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(193,28,132,0.3)] hover:shadow-[0_0_40px_rgba(193,28,132,0.5)]"
            style={{ fontFamily: "'Syne', sans-serif" }}
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
              'Submit Application →'
            )}
          </button>

          <p className="text-center text-gray-600 text-xs mt-4">
            Duplicate submissions are automatically filtered. One entry per wallet.
          </p>
        </div>
      </div>
    </>
  );
}
