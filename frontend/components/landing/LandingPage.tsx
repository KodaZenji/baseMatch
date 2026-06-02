'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import {
  Wallet, Loader2, LogOut, Sun, Moon, Menu, X,
  Shield, Heart, Lock, ArrowRight, CheckCircle, Zap, Camera, Gem,
} from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { FaPaintBrush, FaBolt, FaCamera, FaGem } from 'react-icons/fa';

// ── Design tokens ─────────────────────────────────────────────────────────────
const BLUE = '#0052FF';
const BLUE_LIGHT = '#4d8aff';
const BLUE_DIM = 'rgba(0,82,255,0.12)';
const BG = '#0a0a0f';

// ── Local wallet button ───────────────────────────────────────────────────────
function ConnectButton({ full = false }: { full?: boolean }) {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 text-sm transition-all"
      >
        <LogOut className="w-3.5 h-3.5" />
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-white font-semibold text-sm transition-all disabled:opacity-50 hover:opacity-90 active:scale-[0.98] ${full ? 'w-full' : ''}`}
      style={{
        background: 'linear-gradient(135deg, #0044cc, #1558d6)',
        boxShadow: '0 0 18px rgba(0,82,255,0.18)',
      }}
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

// ── Landing Menu ──────────────────────────────────────────────────────────────
function LandingMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-72 bg-[#0a0a0f]/98 backdrop-blur-xl border-l border-white/8 shadow-2xl z-50">
        <div className="p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/8 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6 mt-1">Community</p>
          <nav className="space-y-3">
            <a href="https://x.com/basematch_" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 transition-all text-gray-200">
              <FaXTwitter className="w-5 h-5 text-white" />
              <div>
                <div className="font-semibold text-sm">Follow on X</div>
                <div className="text-xs text-gray-500">@basematch_</div>
              </div>
            </a>
            <a href="https://discord.gg/vF7bZWhJ85" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 transition-all text-gray-200">
              <FaDiscord className="w-5 h-5 text-[#5865F2]" />
              <div>
                <div className="font-semibold text-sm">Join Discord</div>
                <div className="text-xs text-gray-500">BaseMatch Community</div>
              </div>
            </a>
          </nav>
        </div>
      </div>
    </>
  );
}

// ── Profile data ──────────────────────────────────────────────────────────────
const PROFILES = [
  {
    name: 'Byola',
    role: 'Web3 Content Creator',
    handle: '@GoBigBabe',
    tags: ['Build/Dev', 'Web3', 'Content'],
    accent: BLUE_LIGHT,
    glow: 'rgba(77,138,255,0.2)',
    photo: '/byola.jpg',
  },
  {
    name: 'Youssef',
    role: 'DevRel @ Base',
    handle: '@0xyoussea',
    tags: ['Build/Dev', 'AI Agents', 'DevRel'],
    accent: BLUE,
    glow: 'rgba(0,82,255,0.22)',
    photo: '/yousef.jpg',
  },
  {
    name: 'Montana',
    role: 'Engineer @ Base',
    handle: '@Montana_Wong',
    tags: ['Base', 'Build/Dev', 'DeFi'],
    accent: '#06b6d4',
    glow: 'rgba(6,182,212,0.18)',
    photo: '/wong.jpg',
  },
  {
    name: 'Judith',
    role: 'Photography & Travel',
    handle: '',
    tags: ['Photography', 'Hiking', 'NFTs'],
    accent: '#f59e0b',
    glow: 'rgba(245,158,11,0.18)',
    photo: '/27.png',
  },
];

// ── Animated profile card ─────────────────────────────────────────────────────
function ProfilePreview() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % PROFILES.length);
        setVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const p = PROFILES[idx];

  return (
    <div className="relative flex justify-center items-center">
      {/* Ambient glow */}
      <div
        className="absolute w-64 h-64 rounded-full blur-3xl transition-all duration-700"
        style={{ background: p.glow, opacity: 0.9 }}
      />

      {/* Card wrapper */}
      <div
        className="relative w-[280px] h-[380px] rounded-[28px] overflow-hidden"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.98)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        {/* Background photo — sits behind the glass */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${p.photo})`,
            transform: 'scale(1.05)',
          }}
        />

        {/* Dark gradient overlay so text stays readable */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        {/* Glass card layer */}
        <div
          className="absolute inset-0 border border-white/15 rounded-[28px]"
          style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
            backdropFilter: 'blur(4px)',
          }}
        />

        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[28px]"
          style={{ background: `linear-gradient(to right, ${p.accent}, transparent)` }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-7">
          {/* Online indicator */}
          <div className="flex justify-end">
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Online
            </span>
          </div>

          {/* Bottom info */}
          <div>
            {/* Interest chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {p.tags.map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-lg text-white/70 border border-white/15 bg-black/30">
                  {tag}
                </span>
              ))}
            </div>

            <h3 className="text-white text-2xl font-bold mb-0.5">{p.name}</h3>
            <p className="text-white/50 text-sm mb-4">{p.role}</p>

            <div className="flex items-center gap-2 text-xs" style={{ color: p.accent }}>
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="font-semibold">Verified on Base</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="absolute -bottom-8 flex gap-1.5">
        {PROFILES.map((_, i) => (
          <div key={i} className="rounded-full transition-all duration-300"
            style={{
              width: i === idx ? '20px' : '6px',
              height: '6px',
              background: i === idx ? BLUE : 'rgba(255,255,255,0.2)',
            }} />
        ))}
      </div>
    </div>
  );
}

// ── Main LandingPage ──────────────────────────────────────────────────────────
export default function LandingPage({
  isDark,
  toggleDarkMode,
}: {
  isDark: boolean;
  toggleDarkMode: () => void;
}) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600&display=swap');
        .landing { font-family: 'DM Sans', sans-serif; }
        .landing h1, .landing h2, .landing .syne { font-family: 'Syne', sans-serif; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .float { animation: float 6s ease-in-out infinite; }
        .float-delay { animation: float 6s ease-in-out infinite; animation-delay: -2s; }
      `}</style>

      <div className="landing min-h-screen relative overflow-x-hidden" style={{ background: BG }}>

        {/* Ambient glow orbs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="float absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
            style={{ background: 'radial-gradient(circle, #0052FF 0%, transparent 70%)', left: '-5%', top: '10%' }} />
          <div className="float-delay absolute w-[400px] h-[400px] rounded-full opacity-8 blur-[100px]"
            style={{ background: 'radial-gradient(circle, #1a6fff 0%, transparent 70%)', right: '-5%', bottom: '15%' }} />
        </div>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="fixed top-0 w-full z-50 backdrop-blur-2xl border-b border-white/5"
          style={{ background: `${BG}cc` }}>
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <img
              src="https://ipfs.filebase.io/ipfs/Qme7TRxxfBP1offBsSsbtNhEbutbEgTmwd16EgHgPZutmw"
              alt="BaseMatch"
              className="w-9 h-9 rounded-xl"
            />
            <div className="flex items-center gap-3">
              <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-white/8 transition-colors">
                {isDark
                  ? <Sun className="w-4 h-4 text-yellow-400" />
                  : <Moon className="w-4 h-4 text-white/60" />}
              </button>
              <button onClick={() => setIsMenuOpen(true)} className="p-2 rounded-full hover:bg-white/8 transition-colors">
                <Menu className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>
        </header>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative min-h-screen flex items-center pt-16">
          <div className="max-w-6xl mx-auto px-6 w-full py-20 flex flex-col lg:flex-row items-center gap-16 lg:gap-20">

            {/* Left */}
            <div className="flex-1 text-center lg:text-left">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border mb-8"
                style={{ borderColor: `${BLUE}40`, background: BLUE_DIM, color: BLUE_LIGHT }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: BLUE }} />
                Built on Base · Verified Dating
              </div>

              <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.05] mb-6">
                Meet people{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(to right, ${BLUE_LIGHT}, ${BLUE})` }}
                >
                  behind the wallets.
                </span>
              </h1>

              <p className="text-white/45 text-lg leading-relaxed max-w-md mx-auto lg:mx-0 mb-10">
                Shared on-chain interests.
                Dating built for builders, creators, and collectors on Base.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                {isConnected ? (
                  <button
                    onClick={() => router.push('/register/wallet/choice')}
                    className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #0044cc, #1558d6)',
                      boxShadow: '0 0 18px rgba(0,82,255,0.18)',
                    }}
                  >
                    Create Profile <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <ConnectButton />
                )}
                <button
                  onClick={() => router.push('/register/email')}
                  className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-sm border border-white/10 text-white/60 hover:text-white hover:bg-white/6 transition-all"
                >
                  Sign Up with Email
                </button>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-3 mt-10 justify-center lg:justify-start">
                <div className="flex -space-x-2.5">
                  {['/byola.jpg', '/yousef.jpg', '/wong.jpg', '/27.png'].map((src, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 bg-cover bg-center"
                      style={{ backgroundImage: `url(${src})`, borderColor: BG }} />
                  ))}
                </div>
                <p className="text-sm text-white/40">
                  <span className="text-white font-semibold">Growing</span> community on Base
                </p>
              </div>
            </div>

            {/* Right — profile card */}
            <div className="flex-1 flex justify-center lg:justify-end pb-10">
              <ProfilePreview />
            </div>
          </div>
        </section>

        {/* ── Why BaseMatch ───────────────────────────────────────────────── */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: BLUE_LIGHT }}>Why Us</p>
              <h2 className="syne text-3xl sm:text-4xl font-extrabold text-white">
                Dating should feel more authentic.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  icon: Shield,
                  title: 'Verified Profiles',
                  desc: 'Every profile starts with a wallet, reducing fake accounts and building trust from the first match.',
                  accent: BLUE,
                },
                {
                  icon: Heart,
                  title: 'Shared Interests',
                  desc: 'Meet builders, creators, and collectors who understand your world and share your on-chain life.',
                  accent: BLUE_LIGHT,
                },
                {
                  icon: Lock,
                  title: 'Privacy First',
                  desc: "Match and chat before sharing socials or personal details. Your data, your control.",
                  accent: '#06b6d4',
                },
              ].map(({ icon: Icon, title, desc, accent }) => (
                <div
                  key={title}
                  className="p-6 rounded-3xl border border-white/8 bg-white/3 hover:bg-white/5 hover:border-white/12 transition-all group"
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                    style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: accent }} />
                  </div>
                  <h3 className="text-white font-bold mb-2">{title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────────────────────── */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: BLUE_LIGHT }}>Getting Started</p>
              <h2 className="syne text-3xl sm:text-4xl font-extrabold text-white">Three simple steps.</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-5 relative">
              <div className="hidden md:block absolute top-10 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px"
                style={{ background: `linear-gradient(to right, transparent, ${BLUE}40, transparent)` }} />

              {[
                { step: '01', title: 'Connect', desc: 'Link your wallet or create an account in seconds.', icon: Wallet },
                { step: '02', title: 'Create', desc: 'Build your profile and express who you are on-chain.', icon: Zap },
                { step: '03', title: 'Match', desc: 'Discover like-minded people and start real conversations.', icon: Heart },
              ].map(({ step, title, desc, icon: Icon }) => (
                <div key={step} className="p-6 rounded-3xl border border-white/8 bg-white/3 relative">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: BLUE_DIM, border: `1px solid ${BLUE}30` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: BLUE_LIGHT }} />
                  </div>
                  <div className="font-extrabold text-xs mb-3 font-mono tracking-widest" style={{ color: BLUE }}>{step}</div>
                  <h3 className="text-white font-bold mb-2">{title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Community Showcase ──────────────────────────────────────────── */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: BLUE_LIGHT }}>Community</p>
              <h2 className="syne text-3xl sm:text-4xl font-extrabold text-white">Who you'll meet.</h2>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {PROFILES.map(({ name, role, accent, photo, tags }) => (
                <div
                  key={name}
                  className="relative rounded-3xl overflow-hidden h-[200px] hover:scale-[1.02] transition-all group border border-white/8"
                >
                  {/* Photo background */}
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{ backgroundImage: `url(${photo})` }}
                  />
                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.75) 100%)' }}
                  />
                  {/* Glass layer */}
                  <div
                    className="absolute inset-0"
                    style={{ backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.1)' }}
                  />
                  {/* Content */}
                  <div className="relative z-10 flex flex-col justify-end h-full p-4">
                    <h3 className="text-white font-bold text-sm">{name}</h3>
                    <p className="text-white/50 text-xs mt-0.5 mb-2">{role}</p>
                    <div className="flex items-center gap-1 text-xs" style={{ color: accent }}>
                      <CheckCircle className="w-3 h-3" />
                      <span>Verified on Base</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <section className="py-24 px-6">
          <div className="max-w-2xl mx-auto">
            <div
              className="rounded-[32px] p-10 text-center border border-white/8 relative overflow-hidden"
              style={{ background: `linear-gradient(160deg, ${BLUE}1a 0%, ${BLUE}0d 100%)` }}
            >
              <div className="absolute inset-0 rounded-[32px] pointer-events-none"
                style={{ boxShadow: `inset 0 0 60px rgba(0,82,255,0.08)` }} />

              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: BLUE_DIM, border: `1px solid ${BLUE}40` }}
              >
                <Heart className="w-6 h-6" style={{ color: BLUE_LIGHT }} />
              </div>

              <h2 className="syne text-3xl font-extrabold text-white mb-3">
                Ready to meet someone on Base?
              </h2>
              <p className="text-white/40 mb-8 leading-relaxed">
                Join verified users building meaningful connections on-chain.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {isConnected ? (
                  <button
                    onClick={() => router.push('/register/wallet/choice')}
                    className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #0044cc, #1558d6)',
                      boxShadow: '0 0 18px rgba(0,82,255,0.18)',
                    }}
                  >
                    Create Profile <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <ConnectButton />
                )}
                <button
                  onClick={() => router.push('/register/email')}
                  className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-sm border border-white/10 text-white/60 hover:text-white hover:bg-white/6 transition-all"
                >
                  Sign Up with Email
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="border-t border-white/5 py-8 px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img
                src="https://ipfs.filebase.io/ipfs/Qme7TRxxfBP1offBsSsbtNhEbutbEgTmwd16EgHgPZutmw"
                alt="BaseMatch"
                className="w-7 h-7 rounded-lg"
              />
              <span className="text-white/30 text-sm font-semibold">BaseMatch</span>
            </div>
            <div className="flex items-center gap-5 text-white/30 text-sm">
              <a href="https://x.com/basematch_" target="_blank" rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center gap-1.5">
                <FaXTwitter className="w-3.5 h-3.5" /> @basematch_
              </a>
              <a href="https://discord.gg/vF7bZWhJ85" target="_blank" rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center gap-1.5">
                <FaDiscord className="w-3.5 h-3.5" /> Discord
              </a>
            </div>
            <p className="text-white/20 text-xs">Built on Base · {new Date().getFullYear()}</p>
          </div>
        </footer>

      </div>

      <LandingMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}
