import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Plus, Trash2, X, Save } from "lucide-react";
import { toast } from "sonner";
import { buildAdminApiUrl } from "@/lib/api";

interface Feature {
  id: number;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

interface SubscriptionPlan {
  id: number;
  plan_key: string;
  plan_name: string;
  description: string;
  monthly_price: number;
  annual_price?: number;
  tokens_limit: number;
  articles_limit: number;
  features?: any[];
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  plan_key: string;
  plan_name: string;
  description: string;
  monthly_price: number;
  annual_price?: number;
  tokens_limit: number;
  articles_limit: number;
  icon_name: string;
  display_order: number;
  selectedFeatureIds: number[];
}

const DEFAULT_FORM_DATA: FormData = {
  plan_key: "",
  plan_name: "",
  description: "",
  monthly_price: 0,
  annual_price: 0,
  tokens_limit: 10000,
  articles_limit: 2,
  icon_name: "Sparkles",
  display_order: 0,
  selectedFeatureIds: [],
};

const PLANS_API = buildAdminApiUrl("/api/admin/plans");
const FEATURES_API = buildAdminApiUrl("/api/admin/features");


export default function AdminPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchFeatures();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(PLANS_API, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error(
          `Failed to fetch plans: ${response.status} ${response.statusText}`,
        );
        setPlans([]);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setPlans(data.data || []);
      } else {
        console.error("Plans API returned success: false", data);
        setPlans([]);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatures = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLoadingFeatures(false);
        return;
      }

      const response = await fetch(FEATURES_API, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeatures(data.data || []);
        } else {
          console.warn("Features API returned success: false", data);
          setFeatures([]);
        }
      } else {
        // Features loading is optional - don't show error
        console.warn(
          `Features API returned ${response.status}: ${response.statusText}`,
        );
        setFeatures([]);
      }
    } catch (error) {
      // Features loading is optional - don't show error if features table doesn't exist
      console.warn("Failed to fetch features (this is optional):", error);
      setFeatures([]);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    // Parse selected feature IDs from the plan's features
    let selectedIds: number[] = [];
    if (plan.features) {
      if (typeof plan.features === "string") {
        try {
          const parsed = JSON.parse(plan.features);
          if (Array.isArray(parsed)) {
            // Check if it's an array of IDs or Feature objects
            selectedIds = parsed
              .map((item) => {
                if (typeof item === "number") return item;
                if (typeof item === "object" && item?.id) return item.id;
                return null;
              })
              .filter((id): id is number => id !== null);
          }
        } catch (e) {
          console.error("Failed to parse features:", e);
        }
      } else if (Array.isArray(plan.features)) {
        // Handle array of Feature objects
        selectedIds = plan.features
          .map((item) => {
            if (typeof item === "number") return item;
            if (typeof item === "object" && item?.id) return item.id;
            return null;
          })
          .filter((id): id is number => id !== null);
      }
    }

    setFormData({
      plan_key: plan.plan_key,
      plan_name: plan.plan_name,
      description: plan.description,
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price || 0,
      tokens_limit: plan.tokens_limit,
      articles_limit: plan.articles_limit,
      icon_name: plan.icon_name,
      display_order: plan.display_order,
      selectedFeatureIds: selectedIds,
    });
    setEditingId(plan.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plan_key || !formData.plan_name) {
      toast.error("Vui lòng nhập mã gói và tên gói");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const payload = {
        ...formData,
        features: formData.selectedFeatureIds,
        annual_price: formData.annual_price || null,
      };

      const url = editingId ? `${PLANS_API}/${editingId}` : PLANS_API;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          editingId
            ? "Cập nhật gói dịch vụ thành công!"
            : "Tạo gói dịch vụ thành công!",
        );
        resetForm();
        fetchPlans();
      } else {
        toast.error(data.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Failed to save plan:", error);
      toast.error("Có lỗi xảy ra khi lưu gói dịch vụ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa gói dịch vụ này?")) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(`${PLANS_API}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Xóa gói dịch vụ thành công!");
        fetchPlans();
      } else {
        toast.error(data.message || "Không thể xóa gói dịch vụ");
      }
    } catch (error) {
      console.error("Failed to delete plan:", error);
      toast.error("Có lỗi xảy ra khi xóa gói dịch vụ");
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("vi-VN") + "₫";
  };

  const getSelectedFeatureNames = (featureIds: number[]) => {
    return featureIds
      .map((id) => features.find((f) => f.id === id)?.name || `Feature #${id}`)
      .join(", ");
  };

  const getFeatureNamesFromObjects = (featureObjects: any[]) => {
    // Handle both array of IDs and array of Feature objects
    if (!featureObjects || featureObjects.length === 0) return "";
    
    return featureObjects
      .map((item) => {
        // If item is an object with 'name' property, return the name
        if (typeof item === "object" && item?.name) {
          return item.name;
        }
        // If item is a number ID, find the feature by ID
        if (typeof item === "number") {
          return features.find((f) => f.id === item)?.name || `Feature #${item}`;
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Quản lý gói dịch vụ
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-2">
            Tạo, sửa và xóa các gói dịch vụ cho người dùng
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-primary text-white w-full md:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Thêm gói mới
        </Button>
      </div>

      {/* Form Section */}
      {showForm && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {editingId ? "Chỉnh sửa gói dịch vụ" : "Tạo gói dịch vụ mới"}
              </CardTitle>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Plan Key & Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Mã gói *
                  </label>
                  <Input
                    value={formData.plan_key}
                    onChange={(e) =>
                      setFormData({ ...formData, plan_key: e.target.value })
                    }
                    placeholder="e.g., starter, grow"
                    disabled={!!editingId}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Không thể sửa sau khi tạo
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tên gói *
                  </label>
                  <Input
                    value={formData.plan_name}
                    onChange={(e) =>
                      setFormData({ ...formData, plan_name: e.target.value })
                    }
                    placeholder="e.g., Starter, Grow"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g., Bắt đầu với VolxAI"
                />
              </div>

              {/* Row 2: Prices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Giá hàng tháng (₫)
                  </label>
                  <Input
                    type="number"
                    value={formData.monthly_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthly_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Giá hàng năm (₫) - Tùy chọn
                  </label>
                  <Input
                    type="number"
                    value={formData.annual_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        annual_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Row 3: Tokens & Articles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Giới hạn token/tháng
                  </label>
                  <Input
                    type="number"
                    value={formData.tokens_limit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tokens_limit: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Giới hạn bài viết/tháng
                  </label>
                  <Input
                    type="number"
                    value={formData.articles_limit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        articles_limit: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="2"
                  />
                </div>
              </div>

              {/* Row 4: Icon & Order */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Biểu tượng
                  </label>
                  <Input
                    value={formData.icon_name}
                    onChange={(e) =>
                      setFormData({ ...formData, icon_name: e.target.value })
                    }
                    placeholder="e.g., Gift, Sparkles, Zap, Crown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Thứ tự hiển thị
                  </label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display_order: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Features Section */}
              <div className="border-t pt-4">
                <label className="block text-sm font-semibold mb-3">
                  Các tính năng bao gồm
                </label>
                {loadingFeatures ? (
                  <p className="text-xs text-muted-foreground">
                    Đang tải danh sách tính năng...
                  </p>
                ) : features.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Chưa có tính năng nào. Vui lòng tạo tính năng trước.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {features.map((feature) => (
                      <label
                        key={feature.id}
                        className="flex items-center gap-2 cursor-pointer p-2 hover:bg-primary/10 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedFeatureIds.includes(
                            feature.id,
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedFeatureIds: [
                                  ...formData.selectedFeatureIds,
                                  feature.id,
                                ],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selectedFeatureIds:
                                  formData.selectedFeatureIds.filter(
                                    (id) => id !== feature.id,
                                  ),
                              });
                            }
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {feature.name}
                          </div>
                          {feature.description && (
                            <div className="text-xs text-muted-foreground">
                              {feature.description}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-white flex-1 md:flex-none"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {submitting ? "Đang xử lý..." : "Lưu gói dịch vụ"}
                </Button>
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="outline"
                  className="flex-1 md:flex-none"
                >
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Plans List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danh sách gói dịch vụ</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Chưa có gói dịch vụ nào</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-3 md:p-4 transition-colors ${
                    plan.is_active
                      ? "border-border hover:border-primary/50"
                      : "border-red-300 bg-red-50"
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {/* Left Column: Plan Info */}
                    <div className="space-y-2 md:space-y-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm md:text-base text-foreground">
                            {plan.plan_name}
                          </p>
                          {!plan.is_active && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Bị vô hiệu hóa
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Mã: {plan.plan_key}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          Mô tả
                        </p>
                        <p className="text-sm text-foreground">
                          {plan.description || "—"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">
                            Token/tháng
                          </p>
                          <p className="font-semibold text-sm">
                            {plan.tokens_limit.toLocaleString("vi-VN")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">
                            Bài viết/tháng
                          </p>
                          <p className="font-semibold text-sm">
                            {plan.articles_limit}
                          </p>
                        </div>
                      </div>

                      {/* Features List */}
                      {plan.features && plan.features.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium uppercase">
                            Tính năng
                          </p>
                          <p className="text-xs text-foreground">
                            {getFeatureNamesFromObjects(plan.features)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Pricing & Actions */}
                    <div className="space-y-2 md:space-y-3 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          Giá cả
                        </p>
                        <div className="space-y-1">
                          <p className="text-lg md:text-xl font-bold text-primary">
                            {formatPrice(plan.monthly_price)}
                            <span className="text-xs text-muted-foreground font-normal">
                              /tháng
                            </span>
                          </p>
                          {plan.annual_price && plan.annual_price > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(plan.annual_price)}/năm
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleEdit(plan)}
                          variant="outline"
                          className="flex-1 md:flex-none text-xs md:text-sm py-1 h-auto"
                          size="sm"
                        >
                          <Edit2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          Sửa
                        </Button>
                        <Button
                          onClick={() => handleDelete(plan.id)}
                          variant="outline"
                          className="flex-1 md:flex-none text-red-600 hover:text-red-700 text-xs md:text-sm py-1 h-auto"
                          size="sm"
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          Xóa
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
