import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteAccountSectionProps {
    hasWallet: boolean;
    profileExists: boolean;
    showDeleteConfirm: boolean;
    showDeleteFinalConfirm: boolean;
    isDeleting: boolean;
    isPending: boolean;
    isConfirming: boolean;
    onShowConfirm: (show: boolean) => void;
    onShowFinalConfirm: (show: boolean) => void;
    onDelete: () => void;
}

export default function DeleteAccountSection({
    hasWallet,
    profileExists,
    showDeleteConfirm,
    showDeleteFinalConfirm,
    isDeleting,
    isPending,
    isConfirming,
    onShowConfirm,
    onShowFinalConfirm,
    onDelete,
}: DeleteAccountSectionProps) {
    if (!hasWallet || !profileExists) return null;

    return (
        <div className="mt-8 pt-6 border-t-2 border-gray-200">
            <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <AlertTriangle size={20} /> Danger Zone
                </h3>
                <p className="text-sm text-red-700 mb-4">
                    Deleting your account will permanently remove your profile NFT and all associated data. This action cannot be undone.
                </p>

                {!showDeleteConfirm ? (
                    <button
                        type="button"
                        onClick={() => onShowConfirm(true)}
                        disabled={isPending || isConfirming || isDeleting}
                        className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                        Delete My Account
                    </button>
                ) : !showDeleteFinalConfirm ? (
                    <div className="space-y-3">
                        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3">
                            <p className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-1">
                                <AlertTriangle size={16} /> First Confirmation
                            </p>
                            <p className="text-sm text-yellow-700 mb-3">
                                Are you sure? This will permanently delete everything.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    onShowConfirm(false);
                                    onShowFinalConfirm(false);
                                }}
                                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => onShowFinalConfirm(true)}
                                className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                            >
                                Yes, Continue
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="bg-red-100 border-2 border-red-500 rounded-lg p-3">
                            <p className="text-sm font-bold text-red-900 mb-2 flex items-center gap-1">
                                <AlertTriangle size={16} className="text-red-600" /> FINAL CONFIRMATION
                            </p>
                            <p className="text-sm text-red-800">This is your last chance!</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    onShowConfirm(false);
                                    onShowFinalConfirm(false);
                                }}
                                disabled={isDeleting}
                                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={isPending || isConfirming || isDeleting}
                                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : <span className="flex items-center gap-2"><Trash2 size={16} /> Permanently Delete</span>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
