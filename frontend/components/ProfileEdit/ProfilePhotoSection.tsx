import { User, Edit } from 'lucide-react';

interface ProfilePhotoSectionProps {
    newPhotoUrl: string;
    avatarUrl: string;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onTriggerFileInput: () => void;
}

export default function ProfilePhotoSection({
    newPhotoUrl,
    avatarUrl,
    fileInputRef,
    onPhotoChange,
    onTriggerFileInput,
}: ProfilePhotoSectionProps) {
    return (
        <div className="flex flex-col items-center">
            <div className="relative mb-4">
                {newPhotoUrl ? (
                    <img
                        src={newPhotoUrl}
                        alt="Profile"
                        className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                    />
                ) : avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt="Auto-generated avatar"
                        className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                    />
                ) : (
                    <div className="bg-gray-200 border-4 border-white rounded-full w-32 h-32 flex items-center justify-center shadow-lg">
                        <User className="text-gray-500" size={64} />
                    </div>
                )}
                <button
                    type="button"
                    onClick={onTriggerFileInput}
                    className="absolute bottom-2 right-2 bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                >
                    <Edit size={20} />
                </button>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={onPhotoChange}
                accept="image/*"
                className="hidden"
            />
            <p className="text-gray-600 text-sm">Click the pencil to upload your photo (max 3MB)</p>
        </div>
    );
}
