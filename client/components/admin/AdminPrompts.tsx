import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Edit,
  Trash2,
  Plus,
  Code,
  Save,
  X,
  Power,
  PowerOff,
  MessageSquare,
} from "lucide-react";
import { buildAdminApiUrl } from "@/lib/api";

// Available AI features that use OpenAI prompts
const AVAILABLE_FEATURES = [
  { value: "expand_content", label: "Mở rộng nội dung (Expand Content)" },
  { value: "rewrite_content", label: "Viết lại nội dung (Rewrite Content)" },
  { value: "generate_article", label: "Tạo bài viết (Generate Article)" },
  { value: "generate_seo_title", label: "Tạo tiêu đề SEO (Generate SEO Title)" },
  { value: "generate_meta_description", label: "Tạo Meta Description (Generate Meta Description)" },
] as const;

interface AIPrompt {
  id: number;
  feature_name: string;
  display_name: string;
  description: string | null;
  prompt_template: string;
  // system_prompt: string; // ⚠️ REMOVED - System prompts are now hardcoded in server/config/systemPrompts.ts
  available_variables: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EditPromptData {
  display_name: string;
  description: string;
  prompt_template: string;
  // system_prompt: string; // ⚠️ REMOVED - System prompts are now hardcoded
  available_variables: string;
  is_active: boolean;
}

interface NewPromptData extends EditPromptData {
  feature_name: string;
}

export default function AdminPrompts() {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
  const [editData, setEditData] = useState<EditPromptData>({
    display_name: "",
    description: "",
    prompt_template: "",
    // system_prompt: "", // ⚠️ REMOVED
    available_variables: "",
    is_active: true,
  });
  const [newPromptData, setNewPromptData] = useState<NewPromptData>({
    feature_name: "",
    display_name: "",
    description: "",
    prompt_template: "",
    // system_prompt: "", // ⚠️ REMOVED
    available_variables: "[]",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại");
        return;
      }

      const response = await fetch(
        buildAdminApiUrl("/api/admin/prompts"),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        setPrompts(data.prompts);
      } else {
        throw new Error(data.message || "Failed to fetch prompts");
      }
    } catch (error: any) {
      console.error("Error fetching prompts:", error);
      toast.error(error.message || "Không thể tải danh sách prompts");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (prompt: AIPrompt) => {
    setSelectedPrompt(prompt);
    setEditData({
      display_name: prompt.display_name,
      description: prompt.description || "",
      prompt_template: prompt.prompt_template,
      // system_prompt: prompt.system_prompt, // ⚠️ REMOVED
      available_variables: JSON.stringify(prompt.available_variables || [], null, 2),
      is_active: prompt.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedPrompt) return;

    try {
      setSaving(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại");
        return;
      }

      // Parse available_variables back to array
      let parsedVariables = [];
      try {
        parsedVariables = JSON.parse(editData.available_variables);
      } catch (e) {
        toast.error("Available variables phải là JSON array hợp lệ");
        return;
      }

      const response = await fetch(
        buildAdminApiUrl(`/api/admin/prompts/${selectedPrompt.id}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            display_name: editData.display_name,
            description: editData.description,
            prompt_template: editData.prompt_template,
            // system_prompt: editData.system_prompt, // ⚠️ REMOVED - Not sending to backend
            available_variables: parsedVariables,
            is_active: editData.is_active,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Cập nhật prompt thành công");
        setEditDialogOpen(false);
        fetchPrompts();
      } else {
        throw new Error(data.message || "Failed to update");
      }
    } catch (error: any) {
      console.error("Error updating prompt:", error);
      toast.error(error.message || "Không thể cập nhật prompt");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (promptId: number) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại");
        return;
      }

      const response = await fetch(
        buildAdminApiUrl(`/api/admin/prompts/${promptId}/toggle`),
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        fetchPrompts();
      } else {
        throw new Error(data.message || "Failed to toggle");
      }
    } catch (error: any) {
      console.error("Error toggling prompt:", error);
      toast.error(error.message || "Không thể thay đổi trạng thái");
    }
  };

  const handleDelete = async (promptId: number, featureName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa prompt "${featureName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại");
        return;
      }

      const response = await fetch(
        buildAdminApiUrl(`/api/admin/prompts/${promptId}`),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Xóa prompt thành công");
        fetchPrompts();
      } else {
        throw new Error(data.message || "Failed to delete");
      }
    } catch (error: any) {
      console.error("Error deleting prompt:", error);
      toast.error(error.message || "Không thể xóa prompt");
    }
  };

  const handleCreateNew = () => {
    setNewPromptData({
      feature_name: "",
      display_name: "",
      description: "",
      prompt_template: "",
      // system_prompt: "", // ⚠️ REMOVED
      available_variables: "[]",
      is_active: true,
    });
    setCreateDialogOpen(true);
  };

  const handleCreateSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại");
        return;
      }

      // Validate required fields
      if (!newPromptData.feature_name || !newPromptData.display_name) {
        toast.error("Feature Name và Display Name là bắt buộc");
        return;
      }

      // Parse available_variables
      let parsedVariables = [];
      try {
        parsedVariables = JSON.parse(newPromptData.available_variables);
      } catch (e) {
        toast.error("Available variables phải là JSON array hợp lệ");
        return;
      }

      const response = await fetch(
        buildAdminApiUrl("/api/admin/prompts"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            feature_name: newPromptData.feature_name,
            display_name: newPromptData.display_name,
            description: newPromptData.description,
            prompt_template: newPromptData.prompt_template,
            // system_prompt: newPromptData.system_prompt, // ⚠️ REMOVED - Not sending to backend
            available_variables: parsedVariables,
            is_active: newPromptData.is_active,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Tạo prompt mới thành công");
        setCreateDialogOpen(false);
        fetchPrompts();
      } else {
        throw new Error(data.message || "Failed to create");
      }
    } catch (error: any) {
      console.error("Error creating prompt:", error);
      toast.error(error.message || "Không thể tạo prompt");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Quản lý AI Prompts
          </h2>
          <p className="text-muted-foreground">
            Tùy chỉnh prompts cho các tính năng AI
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm Prompt Mới
        </Button>
      </div>

      {/* Prompts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {prompts.map((prompt) => (
          <Card
            key={prompt.id}
            className={`relative ${!prompt.is_active ? "opacity-60" : ""}`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">
                    {prompt.display_name}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      handleToggleActive(prompt.id)
                    }
                    title={
                      prompt.is_active ? "Tắt prompt" : "Bật prompt"
                    }
                  >
                    {prompt.is_active ? (
                      <Power className="h-4 w-4 text-green-600" />
                    ) : (
                      <PowerOff className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                {prompt.feature_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prompt.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {prompt.description}
                </p>
              )}

              <div className="space-y-3 mb-4">
                {/* System Prompt display REMOVED - now hardcoded in server */}
                
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Prompt Template
                  </Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono max-h-20 overflow-y-auto">
                    {prompt.prompt_template.substring(0, 100)}
                    {prompt.prompt_template.length > 100 && "..."}
                  </div>
                </div>

                {prompt.available_variables && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Variables
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(Array.isArray(prompt.available_variables)
                        ? prompt.available_variables
                        : JSON.parse(prompt.available_variables as any)
                      ).map((variable: string) => (
                        <span
                          key={variable}
                          className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {`{${variable}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(prompt)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Chỉnh sửa
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(prompt.id, prompt.feature_name)}
                  disabled
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Chỉnh sửa Prompt: {selectedPrompt?.feature_name}
            </DialogTitle>
            <DialogDescription>
              Tùy chỉnh prompt template cho tính năng AI này
            </DialogDescription>
          </DialogHeader>

          {/* ⚠️ WARNING BANNER */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex gap-3">
              <MessageSquare className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900 mb-1">
                  ⚠️ Quan trọng: System Prompts đã được hardcode
                </h4>
                <p className="text-sm text-amber-800">
                  Từ bản cập nhật mới, <strong>System Prompts</strong> đã được hardcode trong code 
                  (<code className="bg-amber-100 px-1 rounded">server/config/systemPrompts.ts</code>) 
                  để đảm bảo tính nhất quán và bảo mật. Bạn chỉ có thể chỉnh sửa <strong>Prompt Template</strong> (user prompt).
                  Để thay đổi System Prompt, vui lòng liên hệ developer.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 py-4">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display_name">Tên hiển thị</Label>
              <Input
                id="display_name"
                value={editData.display_name}
                onChange={(e) =>
                  setEditData({ ...editData, display_name: e.target.value })
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Input
                id="description"
                value={editData.description}
                onChange={(e) =>
                  setEditData({ ...editData, description: e.target.value })
                }
                placeholder="Mô tả chức năng của prompt này..."
              />
            </div>

            {/* System Prompt field REMOVED - now hardcoded in server/config/systemPrompts.ts */}

            {/* Prompt Template */}
            <div className="space-y-2">
              <Label htmlFor="prompt_template">
                Prompt Template
                <span className="text-xs text-muted-foreground ml-2">
                  (Sử dụng {`{variable}`} để insert biến)
                </span>
              </Label>
              <Textarea
                id="prompt_template"
                value={editData.prompt_template}
                onChange={(e) =>
                  setEditData({ ...editData, prompt_template: e.target.value })
                }
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {/* Available Variables */}
            <div className="space-y-2">
              <Label htmlFor="available_variables">
                Available Variables (JSON Array)
                <span className="text-xs text-muted-foreground ml-2">
                  Ví dụ: ["content", "title", "language_instruction"]
                </span>
              </Label>
              <Textarea
                id="available_variables"
                value={editData.available_variables}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    available_variables: e.target.value,
                  })
                }
                rows={3}
                className="font-mono text-sm"
              />
            </div>

            {/* Is Active */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={editData.is_active}
                onCheckedChange={(checked) =>
                  setEditData({ ...editData, is_active: checked })
                }
              />
              <Label htmlFor="is_active">
                Kích hoạt prompt này
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-1" />
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Prompt Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo Prompt Mới</DialogTitle>
            <DialogDescription>
              Tạo prompt mới cho một tính năng AI
            </DialogDescription>
          </DialogHeader>

          {/* ⚠️ WARNING BANNER */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex gap-3">
              <MessageSquare className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900 mb-1">
                  ⚠️ Lưu ý: System Prompts không thể tùy chỉnh
                </h4>
                <p className="text-sm text-amber-800">
                  System Prompts đã được hardcode trong code để đảm bảo tính nhất quán. 
                  Bạn chỉ cần điền <strong>Prompt Template</strong>. System Prompt sẽ được tự động 
                  áp dụng từ cấu hình mặc định.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Feature Name - Select Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="new_feature_name">
                Feature Name *
                <span className="text-xs text-muted-foreground ml-2">
                  (Chọn tính năng AI cần tạo prompt)
                </span>
              </Label>
              <Select
                value={newPromptData.feature_name}
                onValueChange={(value) =>
                  setNewPromptData({ ...newPromptData, feature_name: value })
                }
              >
                <SelectTrigger id="new_feature_name">
                  <SelectValue placeholder="Chọn tính năng AI..." />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_FEATURES.map((feature) => (
                    <SelectItem key={feature.value} value={feature.value}>
                      {feature.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                💡 Chú ý: Mỗi feature chỉ có thể có 1 prompt active
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="new_display_name">Tên hiển thị *</Label>
              <Input
                id="new_display_name"
                value={newPromptData.display_name}
                onChange={(e) =>
                  setNewPromptData({ ...newPromptData, display_name: e.target.value })
                }
                placeholder="Mở rộng nội dung"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="new_description">Mô tả</Label>
              <Input
                id="new_description"
                value={newPromptData.description}
                onChange={(e) =>
                  setNewPromptData({ ...newPromptData, description: e.target.value })
                }
                placeholder="Mô tả chức năng của prompt này..."
              />
            </div>

            {/* System Prompt field REMOVED - now hardcoded in server/config/systemPrompts.ts */}

            {/* Prompt Template */}
            <div className="space-y-2">
              <Label htmlFor="new_prompt_template">
                Prompt Template
                <span className="text-xs text-muted-foreground ml-2">
                  (Sử dụng {`{variable}`} để insert biến)
                </span>
              </Label>
              <Textarea
                id="new_prompt_template"
                value={newPromptData.prompt_template}
                onChange={(e) =>
                  setNewPromptData({ ...newPromptData, prompt_template: e.target.value })
                }
                rows={8}
                className="font-mono text-sm"
                placeholder={`Expand and elaborate on this content: "{content}". {language_instruction}`}
              />
            </div>

            {/* Available Variables */}
            <div className="space-y-2">
              <Label htmlFor="new_available_variables">
                Available Variables (JSON Array)
                <span className="text-xs text-muted-foreground ml-2">
                  Ví dụ: ["content", "title", "language_instruction"]
                </span>
              </Label>
              <Textarea
                id="new_available_variables"
                value={newPromptData.available_variables}
                onChange={(e) =>
                  setNewPromptData({ ...newPromptData, available_variables: e.target.value })
                }
                rows={3}
                className="font-mono text-sm"
                placeholder='["content", "language_instruction"]'
              />
            </div>

            {/* Is Active */}
            <div className="flex items-center space-x-2">
              <Switch
                id="new_is_active"
                checked={newPromptData.is_active}
                onCheckedChange={(checked) =>
                  setNewPromptData({ ...newPromptData, is_active: checked })
                }
              />
              <Label htmlFor="new_is_active">
                Kích hoạt prompt này ngay
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-1" />
              Hủy
            </Button>
            <Button onClick={handleCreateSave} disabled={saving}>
              <Plus className="h-4 w-4 mr-1" />
              {saving ? "Đang tạo..." : "Tạo Prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
