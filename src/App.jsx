import { Routes, Route, Navigate } from "react-router-dom";
import { GuestProvider } from "./contexts/GuestContext";
import { ChatProvider } from "./contexts/ChatContext";
import { AdminProvider } from "./contexts/AdminContext";
import { Toaster } from "react-hot-toast";

import GuestLandingPage from "./pages/GuestLandingPage";
import ChatRoom from "./components/chat/ChatRoom";
import AdminLoginPage from "./pages/AdminLoginPage";
import {
  AdminDashboardPage,
  AdminChatsPage,
  AdminReportsPage,
  AdminBannedPage,
  AdminFlaggedPage,
} from "./pages/AdminPages";

const App = () => {
  return (
    <GuestProvider>
      <ChatProvider>
        <AdminProvider>
          <div className="min-h-screen bg-base-200">
            <Routes>
              <Route path="/" element={<GuestLandingPage />} />
              <Route path="/chat" element={<ChatRoom />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/chats" element={<AdminChatsPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/banned" element={<AdminBannedPage />} />
              <Route path="/admin/flagged" element={<AdminFlaggedPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Toaster position="top-right" />
        </AdminProvider>
      </ChatProvider>
    </GuestProvider>
  );
};

export default App;
