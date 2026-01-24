import { useState } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, MessageSquare, Loader2 } from "lucide-react";

const AdminLoginPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { login, isLoading } = useAdmin();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const success = await login(formData.email, formData.password);
    if (success) {
      navigate("/admin/dashboard");
    }
  };

  return (
    <div className="h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="bg-base-100 rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MessageSquare className="size-10 text-primary" />
            <h1 className="text-2xl font-bold">SORSU TALK</h1>
          </div>
          <h2 className="text-xl font-semibold">Admin Login</h2>
          <p className="text-base-content/60 mt-2">
            Sign in to access the admin panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Email</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-base-content/40" />
              </div>
              <input
                type="email"
                className="input input-bordered w-full pl-10"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Password</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-base-content/40" />
              </div>
              <input
                type="password"
                className="input input-bordered w-full pl-10"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="link link-primary text-sm"
          >
            ← Back to guest chat
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
