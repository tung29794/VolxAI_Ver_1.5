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
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  description: string;
  display_order: number;
}

const DEFAULT_FORM_DATA: FormData = {
  name: "",
  description: "",
  display_order: 0,
};

const FEATURES_API = buildAdminApiUrl("/api/admin/features");


export default function AdminFeatures() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(FEATURES_API, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error(
          `Failed to fetch features: ${response.status} ${response.statusText}`,
        );
        setFeatures([]);
        toast.error(
          `Lỗi khi tải tính năng: ${response.status}. Vui lòng tạo bảng features.`,
        );
        return;
      }

      const data = await response.json();
      if (data.success) {
        setFeatures(data.data || []);
      } else {
        console.error("Features API returned success: false", data);
        setFeatures([]);
        toast.error(data.message || "Lỗi khi tải tính năng");
      }
    } catch (error) {
      console.error("Failed to fetch features:", error);
      setFeatures([]);
      toast.error("Có lỗi xảy ra khi tải tính năng");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (feature: Feature) => {
    setFormData({
      name: feature.name,
      description: feature.description || "",
      display_order: feature.display_order,
    });
    setEditingId(feature.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Vui lòng nhập tên tính năng");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const url = editingId ? `${FEATURES_API}/${editingId}` : FEATURES_API;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          editingId
            ? "Cập nhật tính năng thành công!"
            : "Tạo tính năng thành công!",
        );
        resetForm();
        fetchFeatures();
      } else {
        toast.error(data.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Failed to save feature:", error);
      toast.error("Có lỗi xảy ra khi lưu tính năng");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tính năng này?")) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(`${FEATURES_API}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Xóa tính năng thành công!");
        fetchFeatures();
      } else {
        toast.error(data.message || "Không thể xóa tính năng");
      }
    } catch (error) {
      console.error("Failed to delete feature:", error);
      toast.error("Có lỗi xảy ra khi xóa tính năng");
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Quản lý tính năng
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-2">
            Tạo, sửa và xóa các tính năng hiển thị trên bảng so sánh
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
          Thêm tính năng
        </Button>
      </div>

      {/* Form Section */}
      {showForm && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {editingId ? "Chỉnh sửa tính năng" : "Tạo tính năng mới"}
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
              {/* Feature Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tên tính năng *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., AI Editor, Priority Support"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mô tả - Tùy chọn
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g., Chỉnh sửa bài viết với AI"
                />
              </div>

              {/* Display Order */}
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

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-white flex-1 md:flex-none"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {submitting ? "Đang xử lý..." : "Lưu tính năng"}
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

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danh sách tính năng</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          ) : features.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Chưa có tính năng nào</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.id}
                  className="border rounded-lg p-3 md:p-4 transition-colors border-border hover:border-primary/50"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                    {/* Left Column: Feature Info */}
                    <div className="space-y-2 flex-1">
                      <p className="font-semibold text-sm md:text-base text-foreground">
                        {feature.name}
                      </p>
                      {feature.description && (
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Thứ tự: {feature.display_order}
                      </p>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(feature)}
                        variant="outline"
                        className="flex-1 md:flex-none text-xs md:text-sm py-1 h-auto"
                        size="sm"
                      >
                        <Edit2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        Sửa
                      </Button>
                      <Button
                        onClick={() => handleDelete(feature.id)}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
