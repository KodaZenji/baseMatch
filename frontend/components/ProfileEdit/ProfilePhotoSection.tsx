import { useState, useRef } from 'react';
import { User, Camera, Upload, Loader2 } from 'lucide-react';

interface ProfilePhotoSectionProps {
  newPhotoUrl: string;
  avatarUrl: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTriggerFileInput: () => void;
  // New: called when upload-image API returns a URL
  onPhotoUploaded?: (url: string) => void;
}

export default function ProfilePhotoSection({
  newPhotoUrl,
  avatarUrl,
  fileInputRef,
  onPhotoChange,
  onTriggerFileInput,
  onPhotoUploaded,
}: ProfilePhotoSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = newPhotoUrl || avatarUrl;
  const hasPfp = !!displayUrl && !displayUrl.includes('dicebear');

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || 'Upload failed. Try again.');
        return;
      }

      onPhotoUploaded?.(data.url);
      // Also fire the original onPhotoChange for hook compatibility
      onPhotoChange(e);
    } catch {
      setUploadError('Network error. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-4">
        {/* Avatar display */}
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Profile"
            className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
            onError={(e) => {
              e.currentTarget.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${Date.now()}`;
            }}
          />
        ) : (
          <div className="bg-gray-200 border-4 border-white rounded-full w-32 h-32 flex items-center justify-center shadow-lg">
            <User className="text-gray-500" size={64} />
          </div>
        )}

        {/* Upload/Change button overlay */}
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          disabled={isUploading}
          className="absolute bottom-2 right-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full p-2 shadow-lg hover:opacity-90 transition-all flex items-center justify-center disabled:opacity-60"
        >
          {isUploading
            ? <Loader2 size={18} className="animate-spin" />
            : hasPfp
              ? <Camera size={18} />
              : <Upload size={18} />
          }
        </button>
      </div>

      {/* Hidden upload input — goes to /api/upload-image */}
      <input
        type="file"
        ref={uploadInputRef}
        onChange={handleUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Hidden original input for hook compatibility */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onPhotoChange}
        accept="image/*"
        className="hidden"
      />

      {/* Label */}
      <p className="text-gray-500 text-sm">
        {isUploading
          ? 'Uploading...'
          : hasPfp
            ? 'Tap camera to change photo'
            : 'Tap to upload your photo (max 3MB)'
        }
      </p>

      {uploadError && (
        <p className="text-red-500 text-xs mt-1">{uploadError}</p>
      )}
    </div>
  );
}
