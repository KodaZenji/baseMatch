'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import CustomConnectButton from '@/components/CustomConnectButton';
import { Loader2, Camera, Upload, User } from 'lucide-react';
import { INTEREST_CATEGORIES, interestsToTags, tagsToInterests, MAX_INTERESTS } from '@/components/ProfileEdit/ProfileFormFields';

const SELECTED_COLOR = 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-transparent shadow-sm';
const CATEGORY_COLORS: Record<string, string> = {
    'Onchain & Web3': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    'Lifestyle': 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
    'Looking For': 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
};

// ── Logo helper ───────────────────────────────────────────────────────────────
const LogoBlock = () => (
    <div className="flex justify-center mb-6">
        <div className="bg-white rounded-full p-3 shadow-lg">
            <img src="/bmg_new_logo.png" alt="BaseMatch" className="w-12 h-12 object-contain" />
        </div>
    </div>
);

export default function CompleteEmailProfilePage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();

    const [email, setEmail] = useState('');
    const [profile_id, setProfile_id] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        birthYear: '',
        gender: '',
        interests: '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const uploadInputRef = useRef<HTMLInputElement>(null);

    const hasPfp = !!avatarUrl && !avatarUrl.includes('dicebear');

    const selectedTags = interestsToTags(formData.interests);

    function toggleTag(tag: string) {
        if (selectedTags.includes(tag)) {
            setFormData(p => ({ ...p, interests: tagsToInterests(selectedTags.filter(t => t !== tag)) }));
        } else {
            if (selectedTags.length >= MAX_INTERESTS) return;
            setFormData(p => ({ ...p, interests: tagsToInterests([...selectedTags, tag]) }));
        }
    }

    useEffect(() => {
        const emailVerified = localStorage.getItem('emailVerified');
        if (emailVerified) {
            const data = JSON.parse(emailVerified);
            setEmail(data.email);
            setProfile_id(data.profile_id);
        }
    }, []);

    // Dicebear fallback avatar based on email
    useEffect(() => {
        if (email && !avatarUrl) {
            const seed = email.replace('@', '').replace('.', '');
            setAvatarUrl(`https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`);
        }
    }, [email, avatarUrl]);

    async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError('');
        setIsUploading(true);
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await fetch('/api/upload-image', { method: 'POST', body: form });
            const data = await res.json();
            if (!res.ok) { setUploadError(data.error || 'Upload failed.'); return; }
            setAvatarUrl(data.url);
        } catch {
            setUploadError('Network error. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }

    // Show wallet connection screen if not connected but email is verified
    if (!isConnected && email) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <LogoBlock />
                    <h1 className="text-3xl font-bold mb-6" style={{ color: '#0052FF' }}>
                        BaseMatch
                    </h1>
                    <p className="text-gray-700 mb-2 font-semibold">Step 2: Connect Wallet</p>
                    <p className="text-gray-600 mb-6">
                        Email verified! Now connect your wallet to complete your profile.
                    </p>
                    <div className="bg-green-50 rounded-lg p-3 mb-6 border border-green-200">
                        <p className="text-sm text-green-800">✅ {email}</p>
                    </div>
                    <div className="flex justify-center">
                        <CustomConnectButton variant="light" full />
                    </div>
                </div>
            </div>
        );
    }

    // Redirect if no email
    if (!email) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <LogoBlock />
                    <h1 className="text-3xl font-bold mb-6" style={{ color: '#0052FF' }}>
                        BaseMatch
                    </h1>
                    <p className="text-gray-700 mb-6">
                        Please verify your email first
                    </p>
                    <button
                        onClick={() => router.push('/register/email')}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90"
                    >
                        Back to Email Registration
                    </button>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (!address) throw new Error('Wallet not connected');
            if (!profile_id) throw new Error('Profile ID not found. Please verify your email again.');

            if (!formData.name || !formData.birthYear || !formData.gender || !formData.interests) {
                throw new Error('Please fill in all required fields');
            }

            if (selectedTags.length === 0) throw new Error('Please select at least one interest');

            const currentYear = new Date().getFullYear();
            const birthYear = parseInt(formData.birthYear);
            const calculatedAge = currentYear - birthYear;
            if (isNaN(birthYear) || calculatedAge < 18 || calculatedAge > 120) {
                throw new Error('Birth year must correspond to an age between 18 and 120');
            }

            localStorage.setItem('emailFirstMint', JSON.stringify({
                profile_id: profile_id,
                id: profile_id,
                email,
                address,
                useRegisterWithEmail: true,
                registerWithEmailPayload: {
                    name: formData.name,
                    birthYear: parseInt(formData.birthYear),
                    gender: formData.gender,
                    interests: formData.interests,
                    email: email,
                    photoUrl: avatarUrl,
                },
                contractAddress: process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS,
            }));

            router.push('/mint');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete profile');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4 py-8">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full my-4">
                <LogoBlock />

                <h1 className="text-3xl font-bold mb-2 text-center" style={{ color: '#0052FF' }}>
                    BaseMatch
                </h1>
                <p className="text-gray-600 text-center mb-2 text-white/80 font-semibold">Complete Your Profile</p>
                <p className="text-sm text-gray-500 text-center mb-8">Email: {email}</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Photo Upload */}
                    <div className="flex flex-col items-center">
                        <div className="relative mb-3">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Profile"
                                    className="w-28 h-28 rounded-full border-4 border-white shadow-lg object-cover"
                                    onError={(e) => {
                                        const seed = email.replace('@', '').replace('.', '');
                                        e.currentTarget.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
                                    }}
                                />
                            ) : (
                                <div className="w-28 h-28 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center shadow-lg">
                                    <User className="w-14 h-14 text-gray-400" />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => uploadInputRef.current?.click()}
                                disabled={isUploading}
                                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-lg hover:opacity-90 disabled:opacity-60"
                            >
                                {isUploading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : hasPfp ? (
                                    <Camera className="w-4 h-4" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        <input
                            type="file"
                            ref={uploadInputRef}
                            onChange={handlePhotoUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <p className="text-xs text-gray-500">
                            {isUploading ? 'Uploading...' : hasPfp ? 'Tap camera to change photo' : 'Tap to upload your photo (max 3MB)'}
                        </p>
                        {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Your name"
                        />
                    </div>

                    {/* Birth Year */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Birth Year *</label>
                        <select
                            value={formData.birthYear}
                            onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                            required
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select birth year</option>
                            {(() => {
                                const currentYear = new Date().getFullYear();
                                const options = [];
                                for (let age = 18; age <= 100; age++) {
                                    const year = currentYear - age;
                                    options.push(
                                        <option key={year} value={year}>
                                            {year} ({age} years old)
                                        </option>
                                    );
                                }
                                return options;
                            })()}
                        </select>
                        {formData.birthYear && (
                            <p className="text-xs text-gray-500 mt-1">
                                Age: {new Date().getFullYear() - parseInt(formData.birthYear)} years old
                            </p>
                        )}
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
                        >
                            <option value="">Select gender</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                    </div>

                    {/* Interests — tag picker */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-gray-700">Interests *</label>
                            <span className={`text-xs font-semibold ${selectedTags.length >= MAX_INTERESTS ? 'text-red-500' : 'text-gray-400'}`}>
                                {selectedTags.length}/{MAX_INTERESTS}
                            </span>
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
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => toggleTag(tag)}
                                                    disabled={isDisabled}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                                        isSelected
                                                            ? SELECTED_COLOR
                                                            : isDisabled
                                                            ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                                                            : `${CATEGORY_COLORS[category] ?? 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'} cursor-pointer`
                                                    }`}
                                                >
                                                    {tag}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {selectedTags.length === 0 && (
                            <p className="text-xs text-red-400 mt-2">Please select at least one interest</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isLoading ? 'Processing...' : 'Continue to Mint →'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            localStorage.removeItem('emailVerified');
                            router.push('/');
                        }}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                        ← Back to home
                    </button>
                </div>
            </div>
        </div>
    );
}
