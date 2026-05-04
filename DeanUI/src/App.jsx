import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import TeacherSubmissions from './pages/TeacherSubmissions';
import InstitutionalAnalytics from './pages/InstitutionalAnalytics';
import ReportGenerator from './pages/ReportGenerator';
import TemplateSettings from './pages/TemplateSettings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="submissions" element={<TeacherSubmissions />} />
          <Route path="analytics" element={<InstitutionalAnalytics />} />
          <Route path="reports" element={<ReportGenerator />} />
          <Route path="settings" element={<TemplateSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
