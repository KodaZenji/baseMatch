'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Heart, Sparkles, Upload, Camera, Loader2, User } from 'lucide-react';
import { INTEREST_CATEGORIES, interestsToTags, tagsToInterests, MAX_INTERESTS } from '@/components/ProfileEdit/ProfileFormFields';

const SELECTED_COLOR = 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-transparent shadow-sm';
const CATEGORY_COLORS: Record<string, string> = {
  'Onchain & Web3': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  'Lifestyle': 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
  'Looking For': 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
};

export default function CompleteWalletProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const source = searchParams.get('source');
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({ name: '', birthYear: '', gender: '', interests: '', email: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileSource, setProfileSource] = useState<string | null>(null);

  const hasPfp = !!avatarUrl && !avatarUrl.includes('dicebear');
  const selectedTags = interestsToTags(formData.interests);

  useEffect(() => {
    if (!address) return;
    if (source === 'baseapp') {
      const stored = localStorage.getItem('baseProfile');
      if (stored) {
        try {
          const profile = JSON.parse(stored);
          setFormData(prev => ({ ...prev, name: profile.displayName || '', interests: profile.bio || '' }));
          const photoUrl = profile.photoUrl || profile.pfpUrl || profile.pfp || '';
          if (photoUrl.trim()) { setAvatarUrl(photoUrl); setProfileSource('baseapp'); return; }
        } catch {}
      }
    }
    const seed = address.substring(2, 10);
    setAvatarUrl(`https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`);
  }, [source, address]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) document.documentElement.classList.add('dark');
  }, []);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(''); setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload-image', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error || 'Upload failed.'); return; }
      setAvatarUrl(data.url); setProfileSource('uploaded');
    } catch { setUploadError('Network error. Please try again.'); }
    finally { setIsUploading(false); }
  }

  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      setFormData(p => ({ ...p, interests: tagsToInterests(selectedTags.filter(t => t !== tag)) }));
    } else {
      if (selectedTags.length >= MAX_INTERESTS) return;
      setFormData(p => ({ ...p, interests: tagsToInterests([...selectedTags, tag]) }));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
      if (!address) throw new Error('Wallet not connected');
      if (!formData.name || !formData.birthYear || !formData.gender || !formData.interests || !formData.email) throw new Error('Please fill in all required fields');
      if (selectedTags.length === 0) throw new Error('Please select at least one interest');
      const birthYear = parseInt(formData.birthYear);
      const age = new Date().getFullYear() - birthYear;
      if (isNaN(birthYear) || age < 18 || age > 120) throw new Error('Invalid birth year');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) throw new Error('Please enter a valid email address');

      const response = await fetch('/api/profile/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, name: formData.name, birthYear, gender: formData.gender, interests: formData.interests, email: formData.email, photoUrl: avatarUrl, profileSource: profileSource || 'manual', farcasterVerified: false, farcasterUsername: null, farcasterFid: null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      localStorage.removeItem('baseProfile');
      localStorage.setItem('walletFirstMint', JSON.stringify({ profile_id: data.userInfo?.profileId, id: data.userInfo?.profileId, address, email: formData.email, registerWithWalletPayload: { name: formData.name, birthYear, gender: formData.gender, interests: formData.interests, photoUrl: avatarUrl }, contractAddress: process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS }));
      router.push('/register/wallet/mint');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to complete profile'); }
    finally { setIsLoading(false); }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/95 dark:bg-gray-900/95 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
          <Heart className="w-12 h-12 mx-auto mb-4" fill="#C11C84" stroke="none" />
          <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">BaseMatch</h1>
          <div className="flex justify-center mb-6"><ConnectButton /></div>
          <button onClick={() => router.push('/')} className="text-gray-500 text-sm hover:text-gray-700">← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 py-8">
      <div className="bg-white dark:bg-gray-900/95 rounded-3xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 dark:border-gray-700 my-4">
        <Heart className="w-12 h-12 mx-auto mb-4" fill="#C11C84" stroke="none" />
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Complete Your Profile</h1>

        {profileSource === 'baseapp' && (
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 font-semibold">
              <Sparkles className="w-4 h-4" /> Imported from Base (Basename)
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {error && <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-lg font-medium">{error}</div>}

          {/* Photo */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-28 h-28 rounded-full border-4 border-white dark:border-gray-700 shadow-lg object-cover"
                  onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${address?.substring(2,10)}`; }} />
              ) : (
                <div className="w-28 h-28 rounded-full border-4 border-white dark:border-gray-700 bg-gray-200 dark:bg-gray-700 flex items-center justify-center shadow-lg">
                  <User className="w-14 h-14 text-gray-400" />
                </div>
              )}
              <button type="button" onClick={() => uploadInputRef.current?.click()} disabled={isUploading}
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-lg hover:opacity-90 disabled:opacity-60">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : hasPfp ? <Camera className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              </button>
            </div>
            <input type="file" ref={uploadInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isUploading ? 'Uploading...' : hasPfp ? 'Tap camera to change photo' : 'Tap to upload your photo (max 3MB)'}
            </p>
            {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
              className="w-full px-4 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium placeholder:text-gray-400" placeholder="Your name" />
          </div>

          {/* Birth Year */}
          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Birth Year *</label>
            <select value={formData.birthYear} onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })} required
              className="w-full px-4 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium">
              <option value="">Select birth year</option>
              {Array.from({ length: 83 }, (_, i) => { const year = new Date().getFullYear() - 18 - i; return <option key={year} value={year}>{year} ({new Date().getFullYear() - year} years old)</option>; })}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Gender *</label>
            <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} required
              className="w-full px-4 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium">
              <option value="">Select gender</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          {/* Interests */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-900 dark:text-gray-100">Interests *</label>
              <span className={`text-xs font-semibold ${selectedTags.length >= MAX_INTERESTS ? 'text-red-500' : 'text-gray-400'}`}>{selectedTags.length}/{MAX_INTERESTS}</span>
            </div>
            <div className="space-y-4">
              {Object.entries(INTEREST_CATEGORIES).map(([category, tags]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      const isDisabled = !isSelected && selectedTags.length >= MAX_INTERESTS;
                      return (
                        <button key={tag} type="button" onClick={() => toggleTag(tag)} disabled={isDisabled}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${isSelected ? SELECTED_COLOR : isDisabled ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400' : `${CATEGORY_COLORS[category]} cursor-pointer`}`}>
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {selectedTags.length === 0 && <p className="text-xs text-red-400 mt-2">Please select at least one interest</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Email *</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required
              className="w-full px-4 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium placeholder:text-gray-400" placeholder="your@email.com" />
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg">
            {isLoading ? 'Processing...' : 'Continue to Mint →'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => router.push('/register/wallet/choice')} className="text-gray-500 text-sm hover:text-gray-700 transition-colors">← Back to signup options</button>
        </div>
      </div>
    </div>
  );
}
