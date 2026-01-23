import { useState, useEffect } from 'react';

interface Profile {
  name: string;
  birthYear: number;
  gender: string;
  interests: string;
  photoUrl: string;
  exists: boolean;
}

export function useProfileByAddress(address: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/profile/${address}`);
        if (!res.ok) throw new Error('Failed to fetch profile');

        const data = await res.json();
        setProfile({
          name: data.name || `User`,
          birthYear: data.birthYear || 0,
          gender: data.gender || 'Not specified',
          interests: data.interests || '',
          photoUrl: data.photoUrl || '',
          exists: data.exists ?? true,
        });
      } catch (err) {
        console.warn('Failed to fetch profile for notifications chat:', err);
        setProfile({
          name: `User`,
          birthYear: 0,
          gender: 'Not specified',
          interests: '',
          photoUrl: '',
          exists: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [address]);

  return { profile, loading };
    }
