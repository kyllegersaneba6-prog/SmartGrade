import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const MainLayout = () => {
  const location = useLocation();
  
  const getTitle = () => {
    switch (location.pathname) {
      case '/': return 'Reports Central';
      case '/classes': return 'My Classes';
      case '/analytics': return 'Analytics Central';
      case '/gradebook': return 'Gradebook';
      case '/reports': return 'Reports';
      default: return 'SmartGrade';
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
