
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import EventsPage from './pages/EventsPage';
import EventDetail from './pages/EventDetail';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import LoginPage from './pages/LoginPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import CertificatePage from './pages/CertificatePage';
import TicketScannerPage from './pages/TicketScannerPage';
import PublicTicketPage from './pages/PublicTicketPage';
import './types';

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<EventsPage />} /> 
            <Route path="/event/:slug" element={<EventDetail />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            <Route path="/dashboard/user" element={<UserDashboard />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/certificate/:id" element={<CertificatePage />} />
            <Route path="/scanner/:eventId" element={<TicketScannerPage />} />
            {/* New Public Route */}
            <Route path="/ticket-view/:id" element={<PublicTicketPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
