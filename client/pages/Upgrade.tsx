import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ArrowRight,
  Zap,
  Crown,
  Sparkles,
  Gift,
  Package,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PlanSelectionModal } from "@/components/PlanSelectionModal";
import { PaymentModal } from "@/components/PaymentModal";
import { toast } from "sonner";
import { buildApiUrl } from "@/lib/api";

interface PlanFeature {
  name: string;
  included: boolean;
}

interface Plan {
  id: number;
  plan_key: string;
  plan_name: string;
  description: string;
  monthly_price: number;
  annual_price?: number;
  tokens_limit: number;
  articles_limit: number;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  features?: PlanFeature[];
}

const formatTokens = (tokens: number): string => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}K`;
  }
  return tokens.toString();
};

// Format price with proper Vietnamese number format (1500000 -> 1.500.000)
const formatPrice = (price: number): string => {
  if (price === 0) return "0";
  // Convert to integer to remove any decimals, then format with thousand separators
  const intPrice = Math.round(price);
  return intPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Map icon names to React components
const getIconComponent = (
  iconName: string,
): React.ComponentType<{ className?: string }> => {
  const iconMap: {
    [key: string]: React.ComponentType<{ className?: string }>;
  } = {
    Gift,
    Sparkles,
    Zap,
    Crown,
    Package,
  };
  return iconMap[iconName] || Package;
};

// Generate comparison data from plans
const generateComparisonData = (plansData: Plan[]) => {
  if (!plansData || plansData.length === 0) return [];

  // Get all unique features from all plans and sort by display_order
  const featureMap = new Map<
    number,
    { id: number; name: string; display_order: number }
  >();

  plansData.forEach((plan) => {
    if (plan.features && Array.isArray(plan.features)) {
      plan.features.forEach((feature: any) => {
        if (feature.id) {
          featureMap.set(feature.id, {
            id: feature.id,
            name: feature.name,
            display_order: feature.display_order || 0,
          });
        }
      });
    }
  });

  // Sort features by display_order
  const sortedFeatures = Array.from(featureMap.values()).sort(
    (a, b) => a.display_order - b.display_order,
  );

  // Build comparison data
  const comparisonData = [
    {
      category: "Bài viết & Token",
      items: [
        {
          name: "Bài viết mỗi tháng",
          data: plansData.reduce(
            (acc, plan) => {
              acc[plan.plan_key] = plan.articles_limit.toLocaleString("vi-VN");
              return acc;
            },
            {} as { [key: string]: string },
          ),
        },
        {
          name: "Token",
          data: plansData.reduce(
            (acc, plan) => {
              acc[plan.plan_key] = formatTokens(plan.tokens_limit);
              return acc;
            },
            {} as { [key: string]: string },
          ),
        },
      ],
    },
    {
      category: "Tính năng",
      items: sortedFeatures.map((feature) => ({
        name: feature.name,
        data: plansData.reduce(
          (acc, plan) => {
            const hasFeature =
              plan.features &&
              Array.isArray(plan.features) &&
              plan.features.some((f: any) => f.id === feature.id);
            acc[plan.plan_key] = hasFeature ? "✓" : "-";
            return acc;
          },
          {} as { [key: string]: string },
        ),
      })),
    },
  ];

  return comparisonData;
};

/**
 * Calculate average savings percentage across all plans that have annual pricing
 */
const calculateAverageSavings = (plans: Plan[]): number => {
  const plansWithAnnualPrice = plans.filter(
    (plan) => plan.monthly_price > 0 && plan.annual_price && plan.annual_price > 0
  );

  if (plansWithAnnualPrice.length === 0) return 10; // Default to 10% if no plans with annual price

  const totalSavings = plansWithAnnualPrice.reduce((sum, plan) => {
    const monthlyYearlyPrice = plan.monthly_price * 12;
    const savingsPercent = ((monthlyYearlyPrice - plan.annual_price) / monthlyYearlyPrice) * 100;
    return sum + savingsPercent;
  }, 0);

  return Math.round(totalSavings / plansWithAnnualPrice.length);
};

export default function Upgrade() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [currentPlan, setCurrentPlan] = useState("free");
  const [showPlanSelectionModal, setShowPlanSelectionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({ username: "" });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [averageSavingsPercent, setAverageSavingsPercent] = useState(0);

  // Fallback plans if API fails
  const fallbackPlans: Plan[] = [
    {
      id: 1,
      plan_key: "free",
      plan_name: "Free",
      description: "Thử nghiệm VolxAI",
      monthly_price: 0,
      tokens_limit: 10000,
      articles_limit: 2,
      icon_name: "Gift",
      display_order: 1,
      is_active: true,
      features: [],
    },
    {
      id: 2,
      plan_key: "starter",
      plan_name: "Starter",
      description: "Bắt đầu với VolxAI",
      monthly_price: 150000,
      tokens_limit: 400000,
      articles_limit: 60,
      icon_name: "Sparkles",
      display_order: 2,
      is_active: true,
      features: [],
    },
    {
      id: 3,
      plan_key: "grow",
      plan_name: "Grow",
      description: "Cho những người viết nhiều",
      monthly_price: 300000,
      tokens_limit: 1000000,
      articles_limit: 150,
      icon_name: "Zap",
      display_order: 3,
      is_active: true,
      features: [],
    },
    {
      id: 4,
      plan_key: "pro",
      plan_name: "Pro",
      description: "Cho nhà viết chuyên nghiệp",
      monthly_price: 475000,
      tokens_limit: 2000000,
      articles_limit: 300,
      icon_name: "Zap",
      display_order: 4,
      is_active: true,
      features: [],
    },
    {
      id: 5,
      plan_key: "corp",
      plan_name: "Corp",
      description: "Cho công ty nhỏ",
      monthly_price: 760000,
      tokens_limit: 4000000,
      articles_limit: 600,
      icon_name: "Crown",
      display_order: 5,
      is_active: true,
      features: [],
    },
    {
      id: 6,
      plan_key: "premium",
      plan_name: "Premium",
      description: "Giải pháp hoàn chỉnh cho doanh nghiệp",
      monthly_price: 1200000,
      tokens_limit: 6500000,
      articles_limit: 1000,
      icon_name: "Crown",
      display_order: 6,
      is_active: true,
      features: [],
    },
  ];

  // Fetch plans from backend
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(buildApiUrl("/api/auth/plans"));
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          setPlans(data.data);
          // Calculate and set average savings
          const avgSavings = calculateAverageSavings(data.data);
          setAverageSavingsPercent(avgSavings);
        } else {
          setPlans(fallbackPlans);
          const avgSavings = calculateAverageSavings(fallbackPlans);
          setAverageSavingsPercent(avgSavings);
        }
      } catch (error) {
        setPlans(fallbackPlans);
        const avgSavings = calculateAverageSavings(fallbackPlans);
        setAverageSavingsPercent(avgSavings);
      } finally {
        setPlansLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Fetch current user's plan if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const fetchUserData = async () => {
        try {
          const token = localStorage.getItem("authToken");
          if (!token) return;

          const response = await fetch(buildApiUrl("/api/auth/me"), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await response.json();
          if (data.success && data.user) {
            setUserFormData({ username: data.user.username || "" });
            setCurrentPlan(data.subscription?.plan_type || "free");
          }
        } catch (error) {
        }
      };

      fetchUserData();
    }
  }, [isAuthenticated]);

  const handleUpgradeClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setShowPlanSelectionModal(true);
  };

  const handlePlanSelected = (plan: any) => {
    setSelectedUpgradePlan(plan);
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
          newPlan: selectedUpgradePlan.plan_key,
          amount: billingPeriod === "annual" && selectedUpgradePlan.annual_price
            ? selectedUpgradePlan.annual_price
            : selectedUpgradePlan.monthly_price,
          billingPeriod: billingPeriod,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const userResponse = await fetch(buildApiUrl("/api/auth/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const userData = await userResponse.json();
        if (userData.success) {
          setCurrentPlan(userData.subscription?.plan_type || "free");
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

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-block">
            <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
              💎 Nâng cấp ngay
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Chọn gói phù hợp với bạn
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Mở khóa tất cả các tính năng mạnh mẽ của VolxAI. Không có hợp đồng
            dài hạn, hủy bất kỳ lúc nào.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mt-12">
          <div className="inline-flex items-center bg-muted p-1 rounded-full gap-1">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                billingPeriod === "monthly"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Hàng tháng
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                billingPeriod === "annual"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Hàng năm
              <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
                Tiết kiệm {averageSavingsPercent}%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plansLoading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">Đang tải gói dịch vụ...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">Chưa có gói dịch vụ nào</p>
            </div>
          ) : (
            plans.map((plan) => {
              const Icon = getIconComponent(plan.icon_name);
              // Highlight middle plan (Grow is typically the most popular)
              const isFeatured = plan.plan_key === "grow";
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl transition-all duration-300 ${
                    isFeatured
                      ? "md:scale-105 bg-gradient-to-br from-primary to-secondary text-white shadow-2xl ring-2 ring-primary/50"
                      : "bg-white border border-border hover:border-primary/50 hover:shadow-lg text-foreground"
                  }`}
                >
                  {isFeatured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="bg-accent text-white px-4 py-1 rounded-full text-sm font-bold">
                        ⭐ YÊU THÍCH
                      </div>
                    </div>
                  )}

                  <div className="p-8 md:p-10 space-y-8">
                    {/* Header */}
                    <div className="space-y-4">
                      <div
                        className={`inline-block p-3 rounded-lg ${
                          isFeatured ? "bg-white/20" : "bg-primary/10"
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            isFeatured ? "text-white" : "text-primary"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{plan.plan_name}</h3>
                        <p
                          className={`text-sm mt-1 ${
                            isFeatured
                              ? "text-white/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {plan.description}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-1">
                        {plan.monthly_price === 0 ? (
                          <span className="text-4xl font-bold">Miễn phí</span>
                        ) : (
                          <>
                            <span className="text-4xl font-bold">
                              {billingPeriod === "annual" && plan.annual_price
                                ? formatPrice(plan.annual_price)
                                : formatPrice(plan.monthly_price)}
                            </span>
                            <span className="text-sm">₫</span>
                          </>
                        )}
                      </div>
                      {plan.monthly_price !== 0 && (
                        <p
                          className={`text-sm ${
                            isFeatured
                              ? "text-white/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {billingPeriod === "annual" ? "mỗi năm" : "mỗi tháng"}
                        </p>
                      )}
                      {plan.monthly_price !== 0 &&
                        billingPeriod === "annual" &&
                        plan.annual_price && (
                          <p
                            className={`text-xs font-medium ${
                              isFeatured ? "text-white/70" : "text-accent"
                            }`}
                          >
                            Tiết kiệm{" "}
                            {Math.round(
                              ((plan.monthly_price * 12 - plan.annual_price) /
                                (plan.monthly_price * 12)) *
                                100
                            )}
                            % so với hàng tháng
                          </p>
                        )}
                    </div>

                    {/* Info Section */}
                    <div className="space-y-2 text-sm mb-8">
                      <div
                        className={`flex justify-between ${
                          isFeatured ? "text-white/80" : "text-muted-foreground"
                        }`}
                      >
                        <span>Token:</span>
                        <span className="font-semibold">
                          {formatTokens(plan.tokens_limit)}
                        </span>
                      </div>
                      <div
                        className={`flex justify-between ${
                          isFeatured ? "text-white/80" : "text-muted-foreground"
                        }`}
                      >
                        <span>Bài viết/tháng:</span>
                        <span className="font-semibold">
                          {plan.articles_limit.toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    {isAuthenticated ? (
                      <Button
                        onClick={() => {
                          setSelectedUpgradePlan(plan);
                          setShowPaymentModal(true);
                        }}
                        className={`w-full h-12 font-semibold justify-center gap-2 mt-5 ${
                          isFeatured
                            ? "bg-white text-primary hover:bg-gray-100"
                            : "bg-primary text-white hover:bg-primary/90"
                        }`}
                      >
                        {plan.plan_key === currentPlan
                          ? "Gói hiện tại"
                          : plan.monthly_price === 0
                            ? "Bắt đầu miễn phí"
                            : "Bắt đầu ngay"}
                        {plan.plan_key !== currentPlan && (
                          <ArrowRight className="w-4 h-4" />
                        )}
                      </Button>
                    ) : (
                      <Link to="/register" className="w-full">
                        <Button
                          className={`w-full h-12 font-semibold justify-center gap-2 mt-5 ${
                            isFeatured
                              ? "bg-white text-primary hover:bg-gray-100"
                              : "bg-primary text-white hover:bg-primary/90"
                          }`}
                        >
                          {plan.monthly_price === 0
                            ? "Bắt đầu miễn phí"
                            : "Bắt đầu ngay"}
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}

                    {/* Features */}
                    {plan.features && plan.features.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-white/20 mt-5">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <CheckCircle2
                              className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                                isFeatured ? "text-white" : "text-primary"
                              } ${!feature.included && "opacity-50"}`}
                            />
                            <span
                              className={`text-sm font-medium ${
                                isFeatured
                                  ? !feature.included
                                    ? "text-white/70"
                                    : "text-white"
                                  : !feature.included
                                    ? "text-foreground/70"
                                    : "text-foreground"
                              }`}
                            >
                              {feature.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="bg-foreground/5 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              So sánh chi tiết
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tất cả những gì bạn cần biết về mỗi gói dịch vụ
            </p>
          </div>

          <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-border overflow-x-auto">
            {plansLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Đang tải dữ liệu...</p>
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Chưa có gói dịch vụ nào</p>
              </div>
            ) : (
              <>
                {generateComparisonData(plans).map((section, idx) => (
                  <div
                    key={idx}
                    className={idx > 0 ? "border-t border-border" : ""}
                  >
                    <div className="bg-muted/50 px-8 py-4">
                      <h3 className="font-bold text-foreground">
                        {section.category}
                      </h3>
                    </div>
                    {section.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className={`grid px-8 py-4 ${
                          itemIdx > 0 ? "border-t border-border" : ""
                        }`}
                        style={{
                          gridTemplateColumns: `1.5fr repeat(${plans.length}, 1fr)`,
                        }}
                      >
                        <div className="font-medium text-foreground min-w-max">
                          {item.name}
                        </div>
                        {plans.map((plan) => (
                          <div
                            key={plan.id}
                            className="text-muted-foreground text-sm text-center"
                          >
                            {item.data[plan.plan_key] || "-"}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
                <div
                  className="bg-muted/50 px-8 py-4 border-t border-border grid"
                  style={{
                    gridTemplateColumns: `1.5fr repeat(${plans.length}, 1fr)`,
                  }}
                >
                  <div className="font-medium text-foreground">Paket</div>
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="text-center font-semibold text-sm text-foreground"
                    >
                      {plan.plan_name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Các câu hỏi thường gặp
          </h2>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          {[
            {
              q: "Tôi có thể hủy bất kỳ lúc nào không?",
              a: "Có, bạn có thể hủy dịch vụ của mình bất kỳ lúc nào. Không có phí hủy hoặc hợp đồng dài hạn.",
            },
            {
              q: "Nếu tôi chuyển đổi gói, điều gì sẽ xảy ra?",
              a: "Khi bạn chuyển đổi gói, chúng tôi sẽ tính toán lại hóa đơn của bạn. Bạn sẽ được hoàn lại tiền thặng dư hoặc thanh toán phần chênh lệch.",
            },
            {
              q: "Có thử nghiệm miễn phí không?",
              a: "Có! Gói Miễn phí của chúng tôi cho phép bạn tạo 5 bài viết mỗi tháng mà không cần thẻ tín dụng.",
            },
            {
              q: "Bạn hỗ trợ những phương thức thanh toán nào?",
              a: "Chúng tôi hỗ trợ thẻ tín dụng, chuyển khoản ngân hàng, ví điện tử và các phương thức thanh toán địa phương.",
            },
          ].map((faq, idx) => (
            <div
              key={idx}
              className="bg-white border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <h4 className="font-semibold text-foreground mb-2">{faq.q}</h4>
              <p className="text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-primary via-secondary to-primary py-16 md:py-24">
        <div className="container mx-auto px-4 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Sẵn sàng nâng cấp?
            </h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              Chọn gói của bạn và bắt đầu tạo nội dung chất lượng cao ngay hôm
              nay
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/register">
              <Button className="bg-white text-primary hover:bg-gray-100 text-base h-12 px-8 font-semibold">
                Đăng ký để bắt đầu <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button
              variant="outline"
              className="bg-white/10 border-white text-white hover:bg-white/20 text-base h-12 px-8 font-semibold"
            >
              Liên hệ bán hàng
            </Button>
          </div>
        </div>
      </section>

      {/* Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={showPlanSelectionModal}
        onClose={() => setShowPlanSelectionModal(false)}
        currentPlan={currentPlan}
        onSelectPlan={handlePlanSelected}
      />

      {/* Payment Modal */}
      {selectedUpgradePlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          planName={selectedUpgradePlan.plan_name}
          planPrice={
            billingPeriod === "annual" && selectedUpgradePlan.annual_price
              ? selectedUpgradePlan.annual_price
              : selectedUpgradePlan.monthly_price
          }
          planTokens={selectedUpgradePlan.tokens_limit}
          planArticles={selectedUpgradePlan.articles_limit}
          onPaymentConfirmed={handlePaymentConfirmed}
          username={userFormData.username}
          billingPeriod={billingPeriod}
        />
      )}

      <Footer />
    </div>
  );
}
