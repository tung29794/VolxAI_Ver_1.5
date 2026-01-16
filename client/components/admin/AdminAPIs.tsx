import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

interface APIKey {
  id?: number;
  provider: string;
  category: "content" | "search";
  api_key: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

const API_PROVIDERS = {
  content: [
    { value: "openai", label: "OpenAI" },
    { value: "anthropic", label: "Anthropic (Claude)" },
    { value: "google-ai", label: "Google AI" },
  ],
  search: [
    { value: "serpapi", label: "SerpAPI" },
    { value: "serper", label: "Serper.dev" },
    { value: "zenserp", label: "ZenSERP" },
    { value: "pixabay", label: "Pixabay" },
  ],
};

export default function AdminAPIs() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showKey, setShowKey] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<APIKey>({
    provider: "",
    category: "content",
    api_key: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/api-keys`);
      if (!response.ok) throw new Error("Failed to load API keys");

      const data = await response.json();
      setApiKeys(data.apiKeys || []);
    } catch (error) {
      console.error("Error loading API keys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (apiKey?: APIKey) => {
    if (apiKey) {
      setEditingId(apiKey.id!);
      setFormData(apiKey);
    } else {
      setEditingId(null);
      setFormData({
        provider: "",
        category: "content",
        api_key: "",
        description: "",
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.provider || !formData.api_key) {
      alert("Provider dan API key tidak boleh trống");
      return;
    }

    setIsSubmitting(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API_BASE_URL}/api/api-keys/${editingId}` : `${API_BASE_URL}/api/api-keys`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save API key");

      setIsDialogOpen(false);
      await loadAPIKeys();
      alert(editingId ? "API key đã được cập nhật" : "API key đã được thêm");
    } catch (error) {
      console.error("Error saving API key:", error);
      alert("Lỗi khi lưu API key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/api-keys/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete API key");

      setApiKeys(apiKeys.filter((k) => k.id !== id));
      setDeleteConfirm(null);
      alert("API key đã được xóa");
    } catch (error) {
      console.error("Error deleting API key:", error);
      alert("Lỗi khi xóa API key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedByCategory = apiKeys.reduce(
    (acc, key) => {
      if (!acc[key.category]) acc[key.category] = [];
      acc[key.category].push(key);
      return acc;
    },
    {} as Record<string, APIKey[]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản lý API</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý API keys của các dịch vụ
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Thêm API
        </Button>
      </div>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Lưu ý bảo mật:</p>
            <p>
              Các API keys được mã hóa và lưu trữ an toàn. Chỉ hiển thị các ký
              tự cuối để bảo vệ thông tin nhạy cảm.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Keys by Category */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : Object.keys(groupedByCategory).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Chưa có API key nào</p>
            <Button onClick={() => handleOpenDialog()} variant="outline">
              Thêm API key đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Content APIs */}
          {groupedByCategory.content && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <div className="w-1 h-6 bg-blue-600 rounded"></div>
                API Tạo nội dung
              </h2>
              <div className="grid gap-3">
                {groupedByCategory.content.map((key) => (
                  <APIKeyCard
                    key={key.id}
                    apiKey={key}
                    showKey={showKey === key.id}
                    onToggleShow={() =>
                      setShowKey(showKey === key.id ? null : key.id!)
                    }
                    onEdit={() => handleOpenDialog(key)}
                    onDelete={() => setDeleteConfirm(key.id!)}
                    isDeleting={isSubmitting}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Search APIs */}
          {groupedByCategory.search && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <div className="w-1 h-6 bg-green-600 rounded"></div>
                API Tìm kiếm Google
              </h2>
              <div className="grid gap-3">
                {groupedByCategory.search.map((key) => (
                  <APIKeyCard
                    key={key.id}
                    apiKey={key}
                    showKey={showKey === key.id}
                    onToggleShow={() =>
                      setShowKey(showKey === key.id ? null : key.id!)
                    }
                    onEdit={() => handleOpenDialog(key)}
                    onDelete={() => setDeleteConfirm(key.id!)}
                    isDeleting={isSubmitting}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Sửa API Key" : "Thêm API Key mới"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Cập nhật thông tin API key"
                : "Thêm một API key mới vào hệ thống"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Loại API *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    category: v as "content" | "search",
                    provider: "",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="content">API Tạo nội dung</SelectItem>
                  <SelectItem value="search">API Tìm kiếm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="provider">Nhà cung cấp *</Label>
              <Select
                value={formData.provider}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    provider: v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhà cung cấp" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    API_PROVIDERS[formData.category as "content" | "search"] ||
                    []
                  ).map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="api-key">API Key *</Label>
              <Input
                id="api-key"
                value={formData.api_key}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    api_key: e.target.value,
                  })
                }
                type="password"
                placeholder="Nhập API key"
              />
            </div>

            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                placeholder="VD: Khóa OpenAI chính, Backup..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_active: e.target.checked,
                  })
                }
              />
              <Label htmlFor="is-active" className="cursor-pointer">
                Kích hoạt API key này
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : editingId ? (
                "Cập nhật"
              ) : (
                "Thêm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Dialog
          open={deleteConfirm !== null}
          onOpenChange={() => setDeleteConfirm(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xóa API Key</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa API key này? Hành động này không thể
                hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  "Xóa"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Helper Component for API Key Card
interface APIKeyCardProps {
  apiKey: APIKey;
  showKey: boolean;
  onToggleShow: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function APIKeyCard({
  apiKey,
  showKey,
  onToggleShow,
  onEdit,
  onDelete,
  isDeleting,
}: APIKeyCardProps) {
  const displayKey = showKey
    ? apiKey.api_key
    : `${apiKey.api_key.substring(0, 4)}...${apiKey.api_key.slice(-4)}`;

  return (
    <Card className={`${!apiKey.is_active ? "opacity-60 bg-gray-50" : ""}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold capitalize">
                {apiKey.provider.replace("-", " ").replace("api", "API")}
              </h3>
              {!apiKey.is_active && (
                <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                  Vô hiệu hóa
                </span>
              )}
            </div>
            {apiKey.description && (
              <p className="text-sm text-muted-foreground mb-3">
                {apiKey.description}
              </p>
            )}
            <div className="flex items-center gap-2 font-mono text-sm">
              <code className="bg-muted px-2 py-1 rounded">{displayKey}</code>
              <button
                onClick={onToggleShow}
                className="p-1 hover:bg-muted rounded transition-colors"
                title={showKey ? "Ẩn key" : "Hiện key"}
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              disabled={isDeleting}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
