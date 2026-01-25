import { useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { useNavigate } from "react-router-dom";
import AdminDashboard from "../components/admin/AdminDashboard";
import ActiveChats from "../components/admin/ActiveChats";
import ReportsList from "../components/admin/ReportsList";
import BannedUsers from "../components/admin/BannedUsers";
import FlaggedMessages from "../components/admin/FlaggedMessages";
import { LayoutDashboard, MessageSquare, AlertTriangle, Shield, Flag, LogOut, User } from "lucide-react";

const AdminLayout = ({ children, activeTab }) => {
  const { isAuthenticated, name, logout } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/admin/login");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    { id: "chats", label: "Active Chats", icon: MessageSquare, path: "/admin/chats" },
    { id: "reports", label: "Reports", icon: AlertTriangle, path: "/admin/reports" },
    { id: "banned", label: "Banned Users", icon: Shield, path: "/admin/banned" },
    { id: "flagged", label: "Flagged Messages", icon: Flag, path: "/admin/flagged" },
  ];

  return (
    <div className="min-h-screen bg-base-200">
      <nav className="bg-base-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-8 text-primary" />
                <span className="text-xl font-bold">Sochat</span>
              </div>
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`btn btn-ghost btn-sm gap-2 ${
                      activeTab === item.id ? "btn-active" : ""
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User size={20} className="text-base-content/60" />
                <span className="text-sm font-medium">{name}</span>
              </div>
              <button onClick={logout} className="btn btn-ghost btn-sm gap-2">
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

const AdminDashboardPage = () => (
  <AdminLayout activeTab="dashboard">
    <AdminDashboard />
  </AdminLayout>
);

const AdminChatsPage = () => (
  <AdminLayout activeTab="chats">
    <ActiveChats />
  </AdminLayout>
);

const AdminReportsPage = () => (
  <AdminLayout activeTab="reports">
    <ReportsList />
  </AdminLayout>
);

const AdminBannedPage = () => (
  <AdminLayout activeTab="banned">
    <BannedUsers />
  </AdminLayout>
);

const AdminFlaggedPage = () => (
  <AdminLayout activeTab="flagged">
    <FlaggedMessages />
  </AdminLayout>
);

export {
  AdminDashboardPage,
  AdminChatsPage,
  AdminReportsPage,
  AdminBannedPage,
  AdminFlaggedPage,
};
