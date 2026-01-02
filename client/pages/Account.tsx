import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Zap,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  Sparkles,
  Zap as ZapIcon,
  Settings,
  BookOpen,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentModal } from "@/components/PaymentModal";
import { PlanSelectionModal } from "@/components/PlanSelectionModal";
import { toast } from "sonner";
import { buildApiUrl } from "@/lib/api";
import WriteByKeywordForm from "@/components/WriteByKeywordForm";

type AccountTab =
  | "profile"
  | "write"
  | "batch"
  | "rewrite"
  | "auto-blog"
  | "optimize"
  | "articles"
  | "auto-index"
  | "website"
  | "knowledge";

export default function Account() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" && window.innerWidth >= 768
  );
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    writing: true,
    config: false,
  });

  const [activeWritingFeature, setActiveWritingFeature] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullName: "",
  });

  const [subscription, setSubscription] = useState<any>(null);
  const [upgradeHistory, setUpgradeHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {},
  );
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [showPlanSelectionModal, setShowPlanSelectionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<any>(null);

  const [isEditingFullName, setIsEditingFullName] = useState(false);
  const [fullNameLoading, setFullNameLoading] = useState(false);
  const [fullNameMessage, setFullNameMessage] = useState("");
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansData, setPlansData] = useState<Record<string, any>>({});

  // Load plans from API
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await fetch(buildApiUrl("/api/auth/plans"));
        const data = await response.json();
        if (data.success && data.data) {
          const plansMap = data.data.reduce(
            (acc: Record<string, any>, plan: any) => {
              acc[plan.plan_key] = {
                name: plan.plan_name,
                price: plan.monthly_price,
                tokens: plan.tokens_limit,
                articles: plan.articles_limit,
              };
              return acc;
            },
            {},
          );
          setPlansData(plansMap);
        }
      } catch (error) {
        console.error("Failed to load plans:", error);
      } finally {
        setPlansLoading(false);
      }
    };

    loadPlans();
  }, []);

  // Fallback to default plans if not loaded
  const plans: Record<string, any> =
    Object.keys(plansData).length > 0
      ? plansData
      : {
          free: {
            name: "Free",
            price: 0,
            tokens: 10000,
            articles: 2,
          },
          starter: {
            name: "Starter",
            price: 150000,
            tokens: 400000,
            articles: 60,
          },
          grow: {
            name: "Grow",
            price: 300000,
            tokens: 1000000,
            articles: 150,
          },
          pro: {
            name: "Pro",
            price: 475000,
            tokens: 2000000,
            articles: 300,
          },
          corp: {
            name: "Corp",
            price: 760000,
            tokens: 4000000,
            articles: 600,
          },
          premium: {
            name: "Premium",
            price: 1200000,
            tokens: 6500000,
            articles: 1000,
          },
        };

  // Load user data from API
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(buildApiUrl("/api/auth/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (data.success && data.user) {
          setFormData({
            username: data.user.username || "",
            email: data.user.email || "",
            fullName: data.user.full_name || "",
          });
          setSubscription(data.subscription || { plan_type: "free" });
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();

    // Auto-refresh subscription data every 5 seconds to detect when admin approves payment
    const refreshInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await fetch(buildApiUrl("/api/auth/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (data.success && data.subscription) {
          setSubscription(data.subscription);
        }
      } catch (error) {
        // Silent fail - don't spam errors
      }
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, [navigate]);

  // Load upgrade history
  useEffect(() => {
    const loadUpgradeHistory = async () => {
      try {
        setHistoryLoading(true);
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await fetch(buildApiUrl("/api/auth/upgrade-history"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (data.success && data.data) {
          setUpgradeHistory(data.data);
        }
      } catch (error) {
        console.error("Failed to load upgrade history:", error);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadUpgradeHistory();
  }, []);

  const validatePassword = () => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "Vui lòng nhập mật khẩu mới";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "Mật khẩu phải có ít nhất 8 ký tự";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Mật khẩu không khớp";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) {
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordSuccess(false);
      setPasswordMessage("");

      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(buildApiUrl("/api/auth/change-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPasswordSuccess(true);
        setPasswordMessage("Mật khẩu đã được thay đổi thành công!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => {
          setShowChangePassword(false);
          setPasswordSuccess(false);
          setPasswordMessage("");
        }, 2000);
      } else {
        setPasswordMessage(data.message || "Không thể thay đổi mật khẩu");
      }
    } catch (error) {
      console.error("Change password error:", error);
      setPasswordMessage("Có lỗi xảy ra khi thay đổi mật khẩu");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await logoutUser();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      navigate("/");
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleSaveFullName = async () => {
    try {
      setFullNameLoading(true);
      setFullNameMessage("");

      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login");
        return;
      }

      if (!formData.fullName.trim()) {
        setFullNameMessage("Vui lòng nhập họ và tên");
        setFullNameLoading(false);
        return;
      }

      const response = await fetch(buildApiUrl("/api/auth/update-profile"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: formData.fullName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFullNameMessage("Cập nhật thành công!");
        toast.success("Họ và tên đã được cập nhật");
        setIsEditingFullName(false);
        setTimeout(() => {
          setFullNameMessage("");
        }, 2000);
      } else {
        setFullNameMessage(data.message || "Không thể cập nhật họ và tên");
      }
    } catch (error) {
      console.error("Update full name error:", error);
      setFullNameMessage("Có lỗi xảy ra khi cập nhật họ và tên");
    } finally {
      setFullNameLoading(false);
    }
  };

  const handleUpgradeClick = () => {
    setShowPlanSelectionModal(true);
  };

  const handlePlanSelected = (selectedPlan: any) => {
    setSelectedUpgradePlan(selectedPlan);
    setBillingPeriod(selectedPlan.billingPeriod || "monthly");
    setShowPaymentModal(true);
  };

  const handlePaymentConfirmed = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login");
        return;
      }

      // Create pending payment approval request
      const response = await fetch(buildApiUrl("/api/auth/request-upgrade"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newPlan: selectedUpgradePlan.id,
          amount: selectedUpgradePlan.monthlyPrice,
          billingPeriod: billingPeriod,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reload subscription data to show pending status
        const userResponse = await fetch(buildApiUrl("/api/auth/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const userData = await userResponse.json();
        if (userData.success) {
          setSubscription(userData.subscription);
          const isDowngrade =
            data.data.type === "downgrade" ||
            (data.data.fromPlan &&
              data.data.toPlan &&
              ["free", "starter", "grow", "pro", "corp", "premium"].indexOf(
                data.data.toPlan,
              ) <
                ["free", "starter", "grow", "pro", "corp", "premium"].indexOf(
                  data.data.fromPlan,
                ));
          toast.success(
            `Đã ghi nhận yêu cầu ${isDowngrade ? "hạ gói" : "nâng cấp"}! ⏳ Vui lòng chờ duyệt từ admin.`,
          );
          setShowPaymentModal(false);
        }
      } else {
        toast.error(data.message || "Không thể xác nhận thanh toán");
      }
    } catch (error) {
      console.error("Payment confirmation error:", error);
      toast.error("Có lỗi xảy ra khi xác nhận thanh toán");
    }
  };

  // Get plan display name and color
  const getPlanInfo = () => {
    const planType = subscription?.plan_type || "free";
    const planNames: Record<string, string> = {
      free: "Miễn phí",
      starter: "Starter",
      grow: "Grow",
      professional: "Professional",
      pro: "Pro",
      corp: "Corp",
      premium: "Premium",
    };
    return planNames[planType] || planType;
  };

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  const menuItems = [
    {
      id: "profile",
      label: "Tài khoản",
      icon: User,
      description: "Thông tin cá nhân",
    },
    {
      id: "writing-group",
      label: "Viết bài",
      icon: FileText,
      description: "Công cụ viết bài",
      isGroup: true,
      children: [
        {
          id: "write",
          label: "Viết bài",
          icon: FileText,
        },
        {
          id: "batch",
          label: "Viết hàng loạt",
          icon: FileText,
        },
        {
          id: "rewrite",
          label: "Viết lại",
          icon: Sparkles,
        },
      ],
    },
    {
      id: "auto-blog",
      label: "Tự động viết blog",
      icon: ZapIcon,
      description: "AI tạo bài viết tự động",
    },
    {
      id: "optimize",
      label: "Tối ưu bài viết",
      icon: TrendingUp,
      description: "Cải thiện SEO",
    },
    {
      id: "articles",
      label: "Tất cả bài viết",
      icon: FileText,
      description: "Quản lý bài viết",
    },
    {
      id: "auto-index",
      label: "Tự động Index",
      icon: ZapIcon,
      description: "Nộp URL tự động",
    },
    {
      id: "config-group",
      label: "Cấu hình",
      icon: Settings,
      description: "Tùy chỉnh hệ thống",
      isGroup: true,
      children: [
        {
          id: "website",
          label: "Website",
          icon: Settings,
        },
        {
          id: "knowledge",
          label: "Kiến thức",
          icon: BookOpen,
        },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-primary/5">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="text-center">
            <p className="text-muted-foreground">
              Đang tải thông tin tài khoản...
            </p>
          </div>
        </div>
      </div>
    );
  }

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
              if (item.isGroup) {
                const Icon = item.icon;
                const isExpanded = expandedMenus[item.id];
                return (
                  <div key={item.id}>
                    <button
                      onClick={() => toggleMenu(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isExpanded
                          ? "bg-primary/10"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && (
                        <div className="text-left flex-1 min-w-0 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm truncate">
                              {item.label}
                            </div>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform flex-shrink-0 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      )}
                    </button>
                    {isExpanded && sidebarOpen && item.children && (
                      <div className="ml-6 space-y-1 mt-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          return (
                            <button
                              key={child.id}
                              onClick={() => {
                                setActiveTab(child.id as AccountTab);
                                if (window.innerWidth < 768) {
                                  setSidebarOpen(false);
                                }
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${
                                activeTab === child.id
                                  ? "bg-primary text-white"
                                  : "text-foreground hover:bg-muted"
                              }`}
                            >
                              <ChildIcon className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{child.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as AccountTab);
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
                  {user?.username || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || "user@example.com"}
                </p>
              </div>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              className={`w-full text-sm ${sidebarOpen ? "" : "p-2"}`}
              size="sm"
              disabled={logoutLoading}
            >
              <LogOut className="w-4 h-4" />
              {sidebarOpen && "Đăng xuất"}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full">
          <div className="p-4 md:p-8 max-w-6xl mx-auto">
            {/* Profile Section */}
            {activeTab === "profile" && (
              <div className="space-y-8">
                {/* Page Title */}
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold text-foreground">
                    Tài khoản của tôi
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Quản lý thông tin tài khoản và cài đặt bảo mật
                  </p>
                </div>

                {/* Username Section */}
                <div className="bg-white rounded-2xl border border-border p-8 space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <User className="w-6 h-6 text-primary" />
                      Thông tin tài khoản
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {/* Username - Disabled */}
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-base font-medium">
                        Tên tài khoản
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        value={formData.username}
                        disabled
                        className="h-12 text-base bg-muted cursor-not-allowed opacity-60"
                      />
                      <p className="text-xs text-muted-foreground">
                        Tên tài khoản không thể thay đổi
                      </p>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-base font-medium">
                        Họ và tên
                      </Label>
                      {!isEditingFullName ? (
                        <div className="flex gap-2">
                          <Input
                            id="fullName"
                            type="text"
                            value={formData.fullName}
                            disabled
                            className="h-12 text-base bg-muted cursor-not-allowed opacity-60"
                          />
                          <Button
                            onClick={() => setIsEditingFullName(true)}
                            variant="outline"
                            className="h-12"
                          >
                            Sửa
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            id="fullName"
                            type="text"
                            value={formData.fullName}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                fullName: e.target.value,
                              }))
                            }
                            placeholder="Nhập họ và tên"
                            className="h-12 text-base"
                          />
                          {fullNameMessage && (
                            <p
                              className={`text-sm ${
                                fullNameMessage.includes("thành công")
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {fullNameMessage}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              onClick={handleSaveFullName}
                              disabled={fullNameLoading}
                              className="flex-1 bg-primary hover:bg-primary/90 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {fullNameLoading ? "Đang lưu..." : "Lưu"}
                            </Button>
                            <Button
                              onClick={() => {
                                setIsEditingFullName(false);
                                setFullNameMessage("");
                              }}
                              variant="outline"
                              className="flex-1 h-10"
                              disabled={fullNameLoading}
                            >
                              Hủy
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-base font-medium">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          disabled
                          className="h-12 text-base pl-10 bg-muted cursor-not-allowed opacity-60"
                        />
                      </div>
                    </div>

                    {/* Account Type */}
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Gói dịch vụ</Label>
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg flex-shrink-0">
                            <Zap className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">
                              {getPlanInfo()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {subscription?.tokens_limit?.toLocaleString() ||
                                "10,000"}{" "}
                              tokens/tháng
                            </p>
                            {subscription?.expires_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Hết hạn:{" "}
                                {new Date(subscription.expires_at).toLocaleDateString(
                                  "vi-VN",
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={handleUpgradeClick}
                          className="bg-gradient-to-r from-primary to-secondary hover:shadow-lg whitespace-nowrap"
                        >
                          {subscription?.plan_type === "free"
                            ? "Nâng cấp"
                            : "Thay đổi gói"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upgrade History Section */}
                <div className="bg-white rounded-2xl border border-border p-8 space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-6 h-6 text-primary" />
                      Lịch sử nâng cấp
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Xem tất cả các lần nâng cấp gói dịch vụ của bạn
                    </p>
                  </div>

                  {historyLoading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Đang tải lịch sử nâng cấp...
                      </p>
                    </div>
                  ) : upgradeHistory.length > 0 ? (
                    <div className="space-y-3">
                      {upgradeHistory.map((history) => {
                        const isPending = history.status === "⏳ Chờ duyệt";
                        const isRejected = history.status === "Từ chối";
                        return (
                          <div
                            key={history.id}
                            className={`flex flex-col p-4 border rounded-lg transition-colors ${
                              isPending
                                ? "border-yellow-300 bg-yellow-50"
                                : isRejected
                                  ? "border-red-300 bg-red-50"
                                  : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="space-y-1 flex-1">
                                <p className="font-semibold text-foreground">
                                  Nâng cấp từ {history.fromPlan} → {history.toPlan}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {history.date}
                                </p>
                              </div>
                              <div className="text-right space-y-1">
                                <p className="font-semibold text-primary">
                                  {history.amount}
                                </p>
                                <p
                                  className={`text-xs font-medium ${
                                    isPending
                                      ? "text-yellow-700 bg-yellow-100 px-2 py-1 rounded"
                                      : isRejected
                                        ? "text-red-700 bg-red-100 px-2 py-1 rounded"
                                        : history.status === "Đã hoàn tất"
                                          ? "text-green-600"
                                          : "text-muted-foreground"
                                  }`}
                                >
                                  {isPending ? "⏳ Chờ duyệt" : history.status}
                                </p>
                              </div>
                            </div>
                            {isRejected && history.rejectionReason && (
                              <div className="mt-2 pt-2 border-t border-red-200">
                                <p className="text-xs text-red-700 font-medium">
                                  Lý do từ chối:
                                </p>
                                <p className="text-sm text-red-600 mt-1">
                                  {history.rejectionReason}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Bạn chưa có lịch sử nâng cấp
                      </p>
                    </div>
                  )}
                </div>

                {/* Security Section */}
                <div className="bg-white rounded-2xl border border-border p-8 space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <Lock className="w-6 h-6 text-primary" />
                      Bảo mật
                    </h2>
                  </div>

                  {!showChangePassword ? (
                    <Button
                      onClick={() => setShowChangePassword(true)}
                      variant="outline"
                      className="w-full h-12 text-base"
                    >
                      Đổi mật khẩu
                    </Button>
                  ) : (
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      {/* Success Message */}
                      {passwordSuccess && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-green-700 font-medium">
                            {passwordMessage}
                          </p>
                        </div>
                      )}

                      {/* Error Message */}
                      {passwordMessage && !passwordSuccess && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-700 font-medium">
                            {passwordMessage}
                          </p>
                        </div>
                      )}
                      {/* Current Password */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="currentPassword"
                          className="text-base font-medium"
                        >
                          Mật khẩu hiện tại
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="currentPassword"
                            name="currentPassword"
                            type="password"
                            placeholder="••••••••"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            className={`h-12 text-base pl-10 ${
                              passwordErrors.currentPassword
                                ? "border-destructive"
                                : ""
                            }`}
                          />
                        </div>
                        {passwordErrors.currentPassword && (
                          <p className="text-destructive text-sm">
                            {passwordErrors.currentPassword}
                          </p>
                        )}
                      </div>

                      {/* New Password */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="newPassword"
                          className="text-base font-medium"
                        >
                          Mật khẩu mới
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            placeholder="••••••••"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            className={`h-12 text-base pl-10 ${
                              passwordErrors.newPassword ? "border-destructive" : ""
                            }`}
                          />
                        </div>
                        {passwordErrors.newPassword && (
                          <p className="text-destructive text-sm">
                            {passwordErrors.newPassword}
                          </p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="confirmPassword"
                          className="text-base font-medium"
                        >
                          Xác nhận mật khẩu
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            className={`h-12 text-base pl-10 ${
                              passwordErrors.confirmPassword
                                ? "border-destructive"
                                : ""
                            }`}
                          />
                        </div>
                        {passwordErrors.confirmPassword && (
                          <p className="text-destructive text-sm">
                            {passwordErrors.confirmPassword}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-4">
                        <Button
                          type="submit"
                          disabled={passwordLoading}
                          className="flex-1 bg-primary hover:bg-primary/90 h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {passwordLoading ? "Đang xử lý..." : "Lưu mật khẩu mới"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowChangePassword(false);
                            setPasswordMessage("");
                            setPasswordSuccess(false);
                          }}
                          disabled={passwordLoading}
                          className="flex-1 h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Hủy
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Writing Section - Viết bài */}
            {activeTab === "write" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-4xl font-bold text-foreground">
                        Viết bài bằng AI
                      </h1>
                      <p className="text-lg text-muted-foreground">
                        Sử dụng AI để viết bài viết với nhiều tùy chọn
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      Cách sử dụng
                    </div>
                  </div>
                </div>

                {/* Writing Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Viết theo từ khóa */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết theo từ khóa
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Nhập từ khóa, độ dài, phong cách, sẽ giúp bạn viết bài nhanh chóng
                    </p>
                  </div>

                  {/* Viết bài ngắn gọn */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                        <FileText className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết bài ngắn gọn
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Bài viết ngắn khoảng 1.200 từ, tập trung vào từ khóa chính
                    </p>
                  </div>

                  {/* Viết Tin Tức */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết Tin Tức
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Nội dung cập nhật theo ngày, phù hợp theo các website tin tức
                    </p>
                  </div>

                  {/* Viết từ Google Search */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết từ Google Search
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Đề dàng lập lộp và viết vào Google AI Overviews
                    </p>
                  </div>

                  {/* Viết theo dàn ý */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                        <FileText className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết theo dàn ý
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Dựa trên dàn ý của bạn, viết bài với độ chính xác cao
                    </p>
                  </div>

                  {/* Write Product Review */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg">
                        <FileText className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Write Product Review
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Viết đánh giá, nhận xét chi tiết sản phẩm
                    </p>
                  </div>

                  {/* Viết dạng toplist */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-lg">
                        <FileText className="w-6 h-6 text-indigo-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết bài dạng toplist
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Viết bài dạng toplist, the best, sản phẩm tốt nhất
                    </p>
                  </div>

                  {/* Viết với trình soạn thảo AI */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-pink-100 rounded-lg">
                        <Sparkles className="w-6 h-6 text-pink-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết với trình soạn thảo AI
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tự do sử dụng trình soạn thảo AI và viết theo ý thích của bạn
                    </p>
                  </div>

                  {/* Viết từ Facebook Post */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết từ Facebook Post
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Chuyển nội dung Facebook Post thành bài viết
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Batch Writing Section - Viết hàng loạt */}
            {activeTab === "batch" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold text-foreground">
                    Viết hàng loạt
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Tạo nhiều bài viết cùng lúc từ nhiều nguồn khác nhau
                  </p>
                </div>

                {/* Batch Writing Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Viết theo danh sách từ khoá */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết theo danh sách từ khoá
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tạo bài viết từ danh sách từ khoá, mỗi từ một bài
                    </p>
                  </div>

                  {/* Viết theo nguồn */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                        <FileText className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết theo nguồn
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Lấy nội dung từ nguồn và tạo bài viết mới từ đó
                    </p>
                  </div>

                  {/* Viết theo dàn ý */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết theo dàn ý
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tạo nhiều bài viết từ nhiều dàn ý khác nhau
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Rewrite Section - Viết lại */}
            {activeTab === "rewrite" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold text-foreground">Viết lại</h1>
                  <p className="text-lg text-muted-foreground">
                    Viết lại bài viết, URL hoặc kiểm tra đạo văn
                  </p>
                </div>

                {/* Rewrite Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Viết theo từ khoá */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                        <Sparkles className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết theo từ khoá
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Viết lại bài viết dựa trên từ khoá cụ thể
                    </p>
                  </div>

                  {/* Viết lại bài viết */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                        <Sparkles className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết lại bài viết
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Đưa nội dung bài viết vào và AI sẽ viết lại
                    </p>
                  </div>

                  {/* Viết lại URL */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
                        <Sparkles className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Viết lại URL
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Cung cấp URL bài viết, AI sẽ lấy và viết lại
                    </p>
                  </div>

                  {/* Kiểm tra đạo văn */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg">
                        <Sparkles className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Kiểm tra đạo văn
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Kiểm tra xem bài viết có bị sao chép hay không
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Auto-blogging Section */}
            {activeTab === "auto-blog" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold text-foreground">
                    Tự động viết blog
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    AI sẽ tự động tạo bài viết từ những chủ đề bạn chỉ định
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-border p-8">
                  <div className="text-center py-16">
                    <ZapIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      Sắp có tính năng này
                    </h2>
                    <p className="text-muted-foreground">
                      Tính năng tự động viết blog sẽ sớm được cải thiện
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Optimize Section */}
            {activeTab === "optimize" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold text-foreground">
                    Tối ưu bài viết
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Cải thiện SEO và chất lượng bài viết
                  </p>
                </div>

                {/* Optimization Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Dùng Google Search Console */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Dùng Google Search Console
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Phân tích số lượng hiển thị, click, từ khóa để tối ưu bài cũ
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Articles Section */}
            {activeTab === "articles" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold text-foreground">
                    Tất cả bài viết
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Quản lý tất cả bài viết của bạn
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-border p-8">
                  <div className="text-center py-16">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      Sắp có tính năng này
                    </h2>
                    <p className="text-muted-foreground">
                      Tính năng quản lý bài viết sẽ sớm được cải thiện
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Auto-indexing Section */}
            {activeTab === "auto-index" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold text-foreground">
                    Tự động Index
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Nộp URL tự động cho Google, Bing...
                  </p>
                </div>

                {/* Auto-indexing Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Index bài viết lên Google */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                        <ZapIcon className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Index bài viết lên Google
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Nộp URL bài viết lên Google để được lập chỉ mục nhanh chóng
                    </p>
                  </div>

                  {/* Index bài viết lên Bing */}
                  <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                        <ZapIcon className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Index bài viết lên Bing
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Nộp URL bài viết lên Bing để được lập chỉ mục nhanh chóng
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Website Config Section */}
            {activeTab === "website" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold text-foreground">
                    Cấu hình Website
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Tùy chỉnh website của bạn
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-border p-8">
                  <div className="text-center py-16">
                    <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      Sắp có tính năng này
                    </h2>
                    <p className="text-muted-foreground">
                      Tính năng cấu hình website sẽ sớm được cải thiện
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Knowledge Config Section */}
            {activeTab === "knowledge" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold text-foreground">
                    Quản lý Kiến thức
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Quản lý cơ sở dữ liệu kiến thức
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-border p-8">
                  <div className="text-center py-16">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      Sắp có tính năng này
                    </h2>
                    <p className="text-muted-foreground">
                      Tính năng quản lý kiến thức sẽ sớm được cải thiện
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={showPlanSelectionModal}
        onClose={() => setShowPlanSelectionModal(false)}
        currentPlan={subscription?.plan_type || "free"}
        currentBillingCycle={subscription?.billing_cycle || "monthly"}
        onSelectPlan={handlePlanSelected}
      />

      {/* Payment Modal */}
      {selectedUpgradePlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          planName={selectedUpgradePlan.name}
          planPrice={selectedUpgradePlan.monthlyPrice}
          planTokens={selectedUpgradePlan.tokens}
          planArticles={selectedUpgradePlan.articles}
          onPaymentConfirmed={handlePaymentConfirmed}
          username={formData.username}
          billingPeriod={billingPeriod}
        />
      )}
    </div>
  );
}
