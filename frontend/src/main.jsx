import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import BackendAvailability from './components/common/BackendAvailability.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BackendAvailability>
      <App />
    </BackendAvailability>
  </StrictMode>,
)


