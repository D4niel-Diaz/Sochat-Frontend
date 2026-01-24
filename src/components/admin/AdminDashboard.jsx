import { useEffect, useState } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import { adminService } from "../../api/services/adminService";
import { Users, MessageSquare, AlertTriangle, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const { isAuthenticated, name } = useAdmin();
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await adminService.getMetrics();

        const responseData = response.data.data || response.data;
        setMetrics(responseData);
      } catch (error) {
        error("Failed to fetch metrics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchMetrics();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Online Users",
      value: metrics?.online_users || 0,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Active Chats",
      value: metrics?.active_chats || 0,
      icon: MessageSquare,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Total Reports",
      value: metrics?.total_reports || 0,
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Banned Users",
      value: metrics?.banned_users || 0,
      icon: Shield,
      color: "text-error",
      bgColor: "bg-error/10",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-base-content/60">Welcome back, {name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div key={card.title} className="bg-base-100 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-content/60 mb-1">{card.title}</p>
                <p className="text-3xl font-bold">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`size-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-base-100 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/admin/chats"
              className="block btn btn-ghost justify-start"
            >
              <MessageSquare className="size-5 mr-2" />
              View Active Chats
            </Link>
            <Link
              to="/admin/reports"
              className="block btn btn-ghost justify-start"
            >
              <AlertTriangle className="size-5 mr-2" />
              Manage Reports
            </Link>
            <Link
              to="/admin/banned"
              className="block btn btn-ghost justify-start"
            >
              <Shield className="size-5 mr-2" />
              Banned Users
            </Link>
            <Link
              to="/admin/flagged"
              className="block btn btn-ghost justify-start"
            >
              <AlertTriangle className="size-5 mr-2" />
              Flagged Messages
            </Link>
          </div>
        </div>

        <div className="bg-base-100 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base-content/70">API Server</span>
              <span className="badge badge-success">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base-content/70">Database</span>
              <span className="badge badge-success">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base-content/70">Content Filter</span>
              <span className="badge badge-success">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base-content/70">Rate Limiting</span>
              <span className="badge badge-success">Enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
