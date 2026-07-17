'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RaffleApplyPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <div
        className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 relative"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#0052FF]/8 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-[#0052FF]/6 blur-[100px]" />
        </div>

        <div className="relative z-10 text-center max-w-sm">
          <h2
            className="text-2xl font-extrabold text-white mb-3"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Applications Closed
          </h2>

          <p className="text-gray-400 text-sm leading-relaxed mb-2">
            BaseMatch Genesis collab applications
            are no longer open.
          </p>

          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Minting{' '}
            <span className="text-white font-semibold">
              July 21, 2026
            </span>{' '}
            on Base.
          </p>

          <div className="px-4 py-3 rounded-xl bg-[#0052FF]/8 border border-[#0052FF]/20 text-xs text-[#4d8aff] mb-6">
            Redirecting you to BaseMatch...
          </div>

          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(0,82,255,0.3)]"
            style={{
              background: 'linear-gradient(to right, #0052FF, #1a6fff)',
              fontFamily: "'Syne', sans-serif",
            }}
          >
            Go to BaseMatch →
          </button>
        </div>
      </div>
    </>
  );
}
