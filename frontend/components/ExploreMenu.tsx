import { X, MessageCircle, Users, LayoutDashboard, Twitter, MessageSquare } from 'lucide-react';

interface ExploreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: 'browse' | 'matches' | 'profile' | 'notifications') => void;
}

export function ExploreMenu({ isOpen, onClose, setActiveTab }: ExploreMenuProps) {
  const handleNavClick = (tab: 'browse' | 'matches' | 'profile' | 'notifications') => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Slide-in Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>

          <h2 className="text-2xl font-bold mb-8 text-gray-800 dark:text-white">Menu</h2>

          <nav className="space-y-4">
            <button
              onClick={() => handleNavClick('notifications')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Notifications</span>
            </button>

            <button
              onClick={() => handleNavClick('matches')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Matches</span>
            </button>

            <button
              onClick={() => handleNavClick('profile')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>

            <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

            <a
              href="https://x.com/basematch_"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
            >
              <Twitter className="w-5 h-5" />
              <span className="font-medium">X.com</span>
            </a>

            <a
              href="https://discord.gg/basematch"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Discord</span>
            </a>
          </nav>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Report or send feedback</p>
          </div>
        </div>
      </div>
    </>
  );
}
