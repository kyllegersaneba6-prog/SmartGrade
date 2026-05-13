import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/dean/Sidebar';
import Header from '../components/dean/Header';

const DeanLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const getTitle = () => {
    switch (location.pathname) {
      case '/dean': return 'Academic Year 2023/24 - Q3';
      case '/dean/submissions': return 'Teacher Submissions Approval';
      case '/dean/analytics': return 'Institutional Analytics';
      case '/dean/reports': return 'Report Generator';
      case '/dean/settings': return 'Template Settings';
      default: return 'Reviewer Module';
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

export default DeanLayout;
