import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/teacher/Sidebar';
import Header from '../components/teacher/Header';

const TeacherLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const getTitle = () => {
    switch (location.pathname) {
      case '/teacher': return 'Reports Central';
      case '/teacher/classes': return 'My Classes';
      case '/teacher/analytics': return 'Analytics Central';
      case '/teacher/gradebook': return 'Gradebook';
      case '/teacher/reports': return 'Reports';
      default: return 'SmartGrade';
    }
  };

  return (
    <div className="flex min-h-screen bg-bg-light font-sans text-text-main">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={getTitle()} onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
