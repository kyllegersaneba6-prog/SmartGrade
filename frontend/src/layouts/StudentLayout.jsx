import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/student/Sidebar';
import Header from '../components/student/Header';

const StudentLayout = () => {
  const location = useLocation();
  
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

export default StudentLayout;
