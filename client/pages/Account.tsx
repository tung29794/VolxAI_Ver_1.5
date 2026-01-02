import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Zap, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentModal } from "@/components/PaymentModal";
import { PlanSelectionModal } from "@/components/PlanSelectionModal";
import { toast } from "sonner";
import { buildApiUrl } from "@/lib/api";

export default function Account() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-gradient-to-b from-white to-primary/5">
      <Header />

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto space-y-8">
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
                  const isPending =
                    history.status === "⏳ Chờ duyệt";
                  const isRejected = 
                    history.status === "Từ chối";
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
                            {isPending
                              ? "⏳ Chờ duyệt"
                              : history.status}
                          </p>
                        </div>
                      </div>
                      {isRejected && history.rejectionReason && (
                        <div className="mt-2 pt-2 border-t border-red-200">
                          <p className="text-xs text-red-700 font-medium">Lý do từ chối:</p>
                          <p className="text-sm text-red-600 mt-1">{history.rejectionReason}</p>
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
