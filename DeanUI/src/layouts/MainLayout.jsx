import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const MainLayout = () => {
  const location = useLocation();
  
  const getTitle = () => {
    switch (location.pathname) {
      case '/': return 'Academic Year 2023/24 - Q3';
      case '/submissions': return 'Teacher Submissions Approval';
      case '/analytics': return 'Institutional Analytics';
      case '/reports': return 'Report Generator';
      case '/settings': return 'Template Settings';
      default: return 'Reviewer Module';
    }
  };

  return (
    <div className="flex min-h-screen bg-bg-light font-sans text-text-main">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={getTitle()} />
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
