import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/student/Sidebar';
import Header from '../components/student/Header';

const StudentLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const getTitle = () => {
    switch (location.pathname) {
      case '/student': return 'Academic Performance Overview';
      case '/student/classes': return 'My Classes';
      case '/student/gradebook': return 'Detailed Performance Gradebook';
      case '/student/reports': return 'Academic Performance Reports';
      default: return 'SmartGrade';
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans text-text-main">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64 flex flex-col h-[100dvh] overflow-hidden">
        <Header title={getTitle()} onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
