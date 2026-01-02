import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { useState, useEffect } from "react";
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

interface SelectablePlan {
  id: string | number;
  name: string;
  monthlyPrice: number;
  tokens: number;
  articles: number;
  features: string[];
  plan_key?: string;
  tokens_limit?: number;
  articles_limit?: number;
  monthly_price?: number;
  billingPeriod?: "monthly" | "annual";
}

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  currentBillingCycle?: "monthly" | "annual";
  onSelectPlan: (plan: SelectablePlan) => void;
}

// Format price with proper Vietnamese number format (1500000 -> 1.500.000)
const formatPrice = (price: number): string => {
  if (price === 0) return "0";
  // Convert to integer to remove any decimals, then format with thousand separators
  const intPrice = Math.round(price);
  return intPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Fallback plans
const DEFAULT_PLANS: Plan[] = [
  {
    id: 1,
    plan_key: "free",
    plan_name: "Free",
    description: "Thử nghiệm VolxAI",
    monthly_price: 0,
    annual_price: null,
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
    annual_price: 1500000,
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
    annual_price: 3000000,
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
    annual_price: 4750000,
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
    annual_price: 7600000,
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
    annual_price: 12000000,
    tokens_limit: 6500000,
    articles_limit: 1000,
    icon_name: "Crown",
    display_order: 6,
    is_active: true,
    features: [],
  },
];

export function PlanSelectionModal({
  isOpen,
  onClose,
  currentPlan,
  currentBillingCycle,
  onSelectPlan,
}: PlanSelectionModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [plansLoading, setPlansLoading] = useState(true);

  // Fetch plans from backend
  useEffect(() => {
    if (!isOpen) return;

    const fetchPlans = async () => {
      try {
        const response = await fetch(buildApiUrl("/api/auth/plans"));
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          setPlans(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch plans:", error);
      } finally {
        setPlansLoading(false);
      }
    };

    fetchPlans();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-white">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Chọn gói nâng cấp
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Chọn gói phù hợp với nhu cầu của bạn
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Billing Toggle */}
        <div className="sticky top-[73px] flex justify-center p-4 border-b border-border bg-white/95">
          <div className="inline-flex items-center bg-muted p-1 rounded-full gap-1">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingPeriod === "monthly"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Hàng tháng
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingPeriod === "annual"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Hàng năm
              <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                -10%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="p-6">
          {plansLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Đang tải gói dịch vụ...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chưa có gói dịch vụ nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => {
                // Check if this is the current plan by comparing both plan_key and billing cycle
                const isCurrentPlan = currentPlan === plan.plan_key && 
                  (currentBillingCycle === billingPeriod);
                const planOrder = [
                  "free",
                  "starter",
                  "grow",
                  "pro",
                  "corp",
                  "premium",
                ];
                const currentPlanIndex = planOrder.indexOf(
                  currentPlan === "professional" ? "pro" : currentPlan,
                );
                const planIndex = planOrder.indexOf(plan.plan_key);
                const isHigherPlan = planIndex > currentPlanIndex;

                // Get the correct price based on billing period
                const displayPrice =
                  plan.monthly_price === 0
                    ? 0
                    : billingPeriod === "annual" && plan.annual_price
                      ? plan.annual_price
                      : plan.monthly_price;

                // Price to pass to onSelectPlan callback
                const callbackPrice =
                  plan.monthly_price === 0
                    ? 0
                    : billingPeriod === "annual" && plan.annual_price
                      ? plan.annual_price
                      : plan.monthly_price;

                const includedFeatures =
                  plan.features?.filter((f) => f.included).map((f) => f.name) ||
                  [];

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border-2 p-6 transition-all ${
                      isCurrentPlan
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {/* Plan Header */}
                    <div className="space-y-2 mb-6">
                      <h3 className="text-xl font-bold text-foreground">
                        {plan.plan_name}
                      </h3>
                      <div className="flex items-baseline gap-1">
                        {plan.monthly_price === 0 ? (
                          <span className="text-3xl font-bold text-primary">
                            Miễn phí
                          </span>
                        ) : (
                          <>
                            <span className="text-3xl font-bold text-primary">
                              {formatPrice(displayPrice)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ₫
                            </span>
                          </>
                        )}
                      </div>
                      {plan.monthly_price !== 0 && (
                        <p className="text-xs text-muted-foreground">
                          {billingPeriod === "annual" ? "mỗi năm" : "mỗi tháng"}
                        </p>
                      )}
                      {plan.monthly_price !== 0 &&
                        billingPeriod === "annual" &&
                        plan.annual_price && (
                          <p className="text-xs text-accent font-medium">
                            Tiết kiệm{" "}
                            {Math.round(
                              ((plan.monthly_price * 12 - plan.annual_price) /
                                (plan.monthly_price * 12)) *
                                100
                            )}
                            %
                          </p>
                        )}
                    </div>

                    {/* Plan Details */}
                    <div className="space-y-4 mb-6 border-t border-border pt-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Token: {plan.tokens_limit.toLocaleString("vi-VN")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {plan.articles_limit.toLocaleString("vi-VN")} bài
                          viết/tháng
                        </p>
                      </div>

                      {/* Features */}
                      {includedFeatures.length > 0 && (
                        <div className="space-y-2">
                          {includedFeatures.slice(0, 3).map((feature, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-sm font-medium text-foreground"
                            >
                              <Check className="w-4 h-4 text-primary flex-shrink-0" />
                              {feature}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Button */}
                    <Button
                      onClick={() => {
                        onSelectPlan({
                          id: plan.plan_key,
                          name: plan.plan_name,
                          monthlyPrice: callbackPrice,
                          tokens: plan.tokens_limit,
                          articles: plan.articles_limit,
                          features: includedFeatures,
                          plan_key: plan.plan_key,
                          tokens_limit: plan.tokens_limit,
                          articles_limit: plan.articles_limit,
                          monthly_price: callbackPrice,
                          billingPeriod: billingPeriod,
                        });
                        onClose();
                      }}
                      disabled={isCurrentPlan}
                      className={`w-full h-11 font-semibold ${
                        isCurrentPlan
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-primary hover:bg-primary/90"
                      }`}
                    >
                      {isCurrentPlan
                        ? "Gói hiện tại"
                        : isHigherPlan
                          ? "Nâng cấp"
                          : "Hạ gói"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
