import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  FileText,
  CreditCard,
  Package,
  Sparkles,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Brain,
  Users,
} from "lucide-react";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminArticles from "@/components/admin/AdminArticles";
import AdminPayments from "@/components/admin/AdminPayments";
import AdminPlans from "@/components/admin/AdminPlans";
import AdminFeatures from "@/components/admin/AdminFeatures";
import AdminAPIs from "@/components/admin/AdminAPIs";
import AdminPrompts from "@/components/admin/AdminPrompts";
import AdminModelsManager from "@/components/AdminModelsManager";
import AdminTokenCosts from "@/components/admin/AdminTokenCosts";
import { Settings, Zap } from "lucide-react";

type AdminTab =
  | "overview"
  | "articles"
  | "payments"
  | "plans"
  | "features"
  | "apis"
  | "prompts"
  | "models"
  | "token-costs"
  | "users";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" && window.innerWidth >= 768,
  );

  // Check if user is admin
  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

  const handleLogout = async () => {
    await logoutUser();
    navigate("/");
  };

  const menuItems = [
    {
      id: "overview",
      label: "Tổng quan",
      icon: BarChart3,
      description: "Thống kê và phân tích",
    },
    {
      id: "articles",
      label: "Bài viết",
      icon: FileText,
      description: "Quản lý bài viết",
    },
    {
      id: "users",
      label: "Người dùng",
      icon: Users,
      description: "Quản lý người dùng",
    },
    {
      id: "payments",
      label: "Thanh toán",
      icon: CreditCard,
      description: "Duyệt thanh toán nâng cấp",
    },
    {
      id: "features",
      label: "Tính năng",
      icon: Sparkles,
      description: "Quản lý tính năng",
    },
    {
      id: "plans",
      label: "Các gói dịch vụ",
      icon: Package,
      description: "Quản lý gói dịch vụ",
    },
    {
      id: "apis",
      label: "Quản lý API",
      icon: Settings,
      description: "Quản lý API keys",
    },
    {
      id: "prompts",
      label: "AI Prompts",
      icon: MessageSquare,
      description: "Quản lý prompts cho AI",
    },
    {
      id: "models",
      label: "AI Models",
      icon: Brain,
      description: "Quản lý các AI models",
    },
    {
      id: "token-costs",
      label: "Token Costs",
      icon: Zap,
      description: "Quản lý chi phí token",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="flex flex-1">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? "w-64" : "w-20"
          } bg-white border-r border-border transition-all duration-300 flex flex-col`}
        >
          {/* Toggle Button */}
          <div className="p-4 border-b border-border flex items-center justify-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    // Navigate to dedicated page for users
                    if (item.id === "users") {
                      navigate("/admin/users");
                      return;
                    }
                    
                    setActiveTab(item.id as AdminTab);
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === item.id
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {item.label}
                      </div>
                      <div className="text-xs opacity-75 hidden sm:block truncate">
                        {item.description}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-border space-y-3">
            {sidebarOpen && (
              <div className="text-sm min-w-0">
                <p className="font-medium text-foreground truncate">
                  {user?.username || "Admin"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || "admin@volxai.com"}
                </p>
              </div>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              className={`w-full text-sm ${sidebarOpen ? "" : "p-2"}`}
              size="sm"
            >
              <LogOut className="w-4 h-4" />
              {sidebarOpen && "Đăng xuất"}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {activeTab === "overview" && <AdminOverview />}
            {activeTab === "articles" && <AdminArticles />}
            {activeTab === "payments" && <AdminPayments />}
            {activeTab === "features" && <AdminFeatures />}
            {activeTab === "plans" && <AdminPlans />}
            {activeTab === "apis" && <AdminAPIs />}
            {activeTab === "prompts" && <AdminPrompts />}
            {activeTab === "models" && <AdminModelsManager />}
            {activeTab === "token-costs" && <AdminTokenCosts />}
          </div>
        </div>
      </div>
    </div>
  );
}
