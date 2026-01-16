import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { buildApiUrl } from "@/lib/api";
import { Pencil, Save, X, Zap, CheckCircle2, XCircle } from "lucide-react";

interface TokenCost {
  id: number;
  feature_key: string;
  feature_name: string;
  token_cost: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminTokenCosts() {
  const [tokenCosts, setTokenCosts] = useState<TokenCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    feature_name: string;
    token_cost: number;
    description: string;
  }>({
    feature_name: "",
    token_cost: 0,
    description: "",
  });

  // Load token costs
  const loadTokenCosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const response = await fetch(buildApiUrl("/api/admin/token-costs"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setTokenCosts(data.data);
      } else {
        toast.error("Không thể tải danh sách token costs");
      }
    } catch (error) {
      console.error("Load token costs error:", error);
      toast.error("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokenCosts();
  }, []);

  // Open edit dialog
  const handleEdit = (cost: TokenCost) => {
    setEditingId(cost.id);
    setEditFormData({
      feature_name: cost.feature_name,
      token_cost: cost.token_cost,
      description: cost.description || "",
    });
    setShowEditDialog(true);
  };

  // Save changes
  const handleSave = async () => {
    if (!editingId) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        buildApiUrl(`/api/admin/token-costs/${editingId}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editFormData),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Cập nhật thành công!");
        setShowEditDialog(false);
        setEditingId(null);
        loadTokenCosts();
      } else {
        toast.error(data.message || "Cập nhật thất bại");
      }
    } catch (error) {
      console.error("Save token cost error:", error);
      toast.error("Có lỗi xảy ra khi cập nhật");
    }
  };

  // Toggle active status
  const handleToggle = async (id: number) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        buildApiUrl(`/api/admin/token-costs/${id}/toggle`),
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        loadTokenCosts();
      } else {
        toast.error(data.message || "Thao tác thất bại");
      }
    } catch (error) {
      console.error("Toggle token cost error:", error);
      toast.error("Có lỗi xảy ra");
    }
  };

  // Get category for feature
  const getCategory = (featureKey: string) => {
    if (
      featureKey.startsWith("generate_") &&
      !featureKey.includes("seo") &&
      !featureKey.includes("title") &&
      !featureKey.includes("meta")
    ) {
      return { name: "Tạo bài viết", color: "bg-blue-100 text-blue-700" };
    }
    if (featureKey.includes("seo") || featureKey.includes("title") || featureKey.includes("meta")) {
      return { name: "SEO", color: "bg-green-100 text-green-700" };
    }
    return { name: "Editor", color: "bg-purple-100 text-purple-700" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-8 h-8 text-primary" />
            Quản lý Token Costs
          </h2>
          <p className="text-muted-foreground mt-2">
            Cấu hình số token tiêu hao cho từng tính năng AI
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Tạo bài viết</h3>
          <p className="text-sm text-blue-700">
            Chi phí token cho các tính năng tạo bài viết hoàn chỉnh
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">SEO</h3>
          <p className="text-sm text-green-700">
            Chi phí token cho các tính năng tối ưu SEO
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-900 mb-2">Editor</h3>
          <p className="text-sm text-purple-700">
            Chi phí token cho các công cụ trong trình soạn thảo
          </p>
        </div>
      </div>

      {/* Token Costs Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]">Trạng thái</TableHead>
              <TableHead className="w-[120px]">Loại</TableHead>
              <TableHead>Tên tính năng</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead className="text-right w-[120px]">Token Cost</TableHead>
              <TableHead className="text-right w-[100px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokenCosts.map((cost) => {
              const category = getCategory(cost.feature_key);
              return (
                <TableRow key={cost.id} className={!cost.is_active ? "opacity-50" : ""}>
                  <TableCell>
                    <button
                      onClick={() => handleToggle(cost.id)}
                      className="hover:scale-110 transition-transform"
                      title={cost.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
                    >
                      {cost.is_active ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${category.color}`}>
                      {category.name}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{cost.feature_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-md">
                    {cost.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-primary">
                      {cost.token_cost.toLocaleString("vi-VN")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(cost)}
                      className="gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Sửa
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Chỉnh sửa Token Cost
            </DialogTitle>
            <DialogDescription>
              Cập nhật thông tin chi phí token cho tính năng
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tên tính năng
              </label>
              <Input
                value={editFormData.feature_name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, feature_name: e.target.value })
                }
                placeholder="Nhập tên tính năng"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Token Cost
              </label>
              <Input
                type="number"
                value={editFormData.token_cost}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    token_cost: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="Nhập số token"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mô tả</label>
              <Textarea
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, description: e.target.value })
                }
                placeholder="Nhập mô tả (tùy chọn)"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingId(null);
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Hủy
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
