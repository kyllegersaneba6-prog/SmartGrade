import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import MyClasses from './pages/MyClasses';
import Analytics from './pages/Analytics';
import Gradebook from './pages/Gradebook';
import Reports from './pages/Reports';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="classes" element={<MyClasses />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="gradebook" element={<Gradebook />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
