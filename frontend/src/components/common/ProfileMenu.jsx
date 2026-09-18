import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, MessageSquare } from 'lucide-react';

const ProfileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUserData(JSON.parse(userStr));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleFeedbackClick = () => {
    const feedbackList = JSON.parse(localStorage.getItem('smartgrade_feedback') || '[]');
    feedbackList.push(new Date().toISOString());
    localStorage.setItem('smartgrade_feedback', JSON.stringify(feedbackList));
    window.dispatchEvent(new Event('feedback_added'));
    alert('Feedback submitted!');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="hover:text-white transition-colors flex items-center justify-center sm:block"
      >
        <User size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-sidebar rounded-md shadow-lg border border-sidebar-hover z-50 overflow-hidden">
          <div className="p-4 border-b border-sidebar-hover">
            <h4 className="text-sm font-semibold text-white">{userData?.full_name || userData?.name || 'Unknown User'}</h4>
            <p className="text-xs text-gray-400 mt-1">{userData?.email || 'No email'}</p>
          </div>
          
          <div className="p-4 flex flex-col gap-2 text-sm text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-500">User ID:</span>
              <span className="font-medium text-white">{userData?.id ? `USR-${userData.id.substring(0,4).toUpperCase()}` : 'N/A'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 whitespace-nowrap">Department:</span>
              <span className="font-medium text-white text-right leading-tight max-w-[140px] truncate" title={userData?.department || 'N/A'}>{userData?.department || 'N/A'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 whitespace-nowrap">Course:</span>
              <span className="font-medium text-white text-right leading-tight max-w-[140px] truncate" title={userData?.course_name || 'N/A'}>{userData?.course_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Role:</span>
              <span className="font-medium text-white capitalize">
                {userData?.system_role === 'superadmin' || userData?.role === 'superadmin' ? 'Super Admin' : userData?.system_role === 'admin' || userData?.role === 'admin' ? 'Admin' : userData?.system_role === 'teacher' || userData?.role === 'teacher' ? 'Teacher' : (userData?.system_role || userData?.role || 'N/A')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Role:</span>
              <span className="text-xs font-bold text-gray-700 uppercase">{userData?.role || userData?.system_role || 'N/A'}</span>
            </div>
          </div>

          <div className="border-t border-sidebar-hover p-2 flex flex-col gap-1">
            <button 
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-sidebar-hover rounded transition-colors"
            >
              <Settings size={16} />
              Settings
            </button>
            <button 
              onClick={handleFeedbackClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#D1A638] hover:text-[#C2982B] hover:bg-sidebar-hover rounded transition-colors font-medium"
            >
              <MessageSquare size={16} className="text-[#D1A638]" />
              Feedback
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-sidebar-hover rounded transition-colors"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
