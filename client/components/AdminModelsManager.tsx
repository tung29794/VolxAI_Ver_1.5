import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Pencil, Trash2, Plus, ArrowUpDown } from "lucide-react";

interface AIModel {
  id: number;
  display_name: string;
  provider: string;
  model_id: string;
  description: string;
  is_active: boolean;
  display_order: number;
  max_tokens: number;
  cost_multiplier: number;
  created_at: string;
  updated_at: string;
}

export default function AdminModelsManager() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [formData, setFormData] = useState({
    display_name: "",
    provider: "openai",
    model_id: "",
    description: "",
    is_active: true,
    display_order: 0,
    max_tokens: 4096,
    cost_multiplier: 1.0,
  });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      console.log("=== FETCHING MODELS ===");
      console.log("Token:", token);
      console.log("Token length:", token?.length);
      console.log("First 20 chars:", token?.substring(0, 20));
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || "https://api.volxai.com"}/api/models/admin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);
      
      if (data.success) {
        setModels(data.models);
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi tải models",
          description: data.message || data.error || "Không thể tải danh sách models",
        });
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể kết nối đến server",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (model?: AIModel) => {
    if (model) {
      setEditingModel(model);
      setFormData({
        display_name: model.display_name,
        provider: model.provider,
        model_id: model.model_id,
        description: model.description || "",
        is_active: model.is_active,
        display_order: model.display_order,
        max_tokens: model.max_tokens,
        cost_multiplier: model.cost_multiplier,
      });
    } else {
      setEditingModel(null);
      setFormData({
        display_name: "",
        provider: "openai",
        model_id: "",
        description: "",
        is_active: true,
        display_order: 0,
        max_tokens: 4096,
        cost_multiplier: 1.0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingModel(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      console.log("Submitting model:", formData);
      console.log("Editing model:", editingModel);
      
      const url = editingModel
        ? `${import.meta.env.VITE_API_URL || "https://api.volxai.com"}/api/models/${editingModel.id}`
        : `${import.meta.env.VITE_API_URL || "https://api.volxai.com"}/api/models`;

      console.log("Request URL:", url);
      console.log("Request method:", editingModel ? "PUT" : "POST");

      const response = await fetch(url, {
        method: editingModel ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (data.success) {
        toast({
          title: editingModel ? "Cập nhật thành công!" : "Tạo mới thành công!",
          description: editingModel 
            ? `Model "${formData.display_name}" đã được cập nhật`
            : `Model "${formData.display_name}" đã được thêm vào hệ thống`,
        });
        handleCloseDialog();
        fetchModels();
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi lưu model",
          description: data.error || data.message || "Không thể lưu model",
        });
      }
    } catch (error) {
      console.error("Error saving model:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể kết nối đến server",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa model này?")) {
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "https://api.volxai.com"}/api/models/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Xóa thành công!",
          description: "Model đã được xóa khỏi hệ thống",
        });
        fetchModels();
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi xóa model",
          description: data.error || "Không thể xóa model",
        });
      }
    } catch (error) {
      console.error("Error deleting model:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể kết nối đến server",
      });
    }
  };

  const handleToggleActive = async (model: AIModel) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "https://api.volxai.com"}/api/models/${model.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            is_active: !model.is_active,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: model.is_active ? "Đã tắt model" : "Đã bật model",
          description: `Model "${model.display_name}" ${model.is_active ? "không còn hiển thị" : "đã sẵn sàng sử dụng"}`,
        });
        fetchModels();
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi cập nhật model",
          description: data.error || "Không thể cập nhật trạng thái model",
        });
      }
    } catch (error) {
      console.error("Error updating model:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể kết nối đến server",
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản lý AI Models</h1>
          <p className="text-muted-foreground mt-2">
            Thêm, sửa, xóa các AI models có sẵn cho người dùng
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Thêm Model
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <ArrowUpDown className="w-4 h-4" />
              </TableHead>
              <TableHead>Tên hiển thị</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Model ID</TableHead>
              <TableHead>Max Tokens</TableHead>
              <TableHead>Cost Multiplier</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Chưa có model nào
                </TableCell>
              </TableRow>
            ) : (
              models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell className="font-medium">{model.display_order}</TableCell>
                  <TableCell className="font-medium">{model.display_name}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        model.provider === "openai"
                          ? "bg-green-100 text-green-800"
                          : model.provider === "google-ai"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {model.provider}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{model.model_id}</TableCell>
                  <TableCell>{model.max_tokens.toLocaleString()}</TableCell>
                  <TableCell>{model.cost_multiplier}x</TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleActive(model)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        model.is_active
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {model.is_active ? "Active" : "Inactive"}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(model)}
                        className="hover:bg-blue-50"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(model.id)}
                        className="hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingModel ? "Chỉnh sửa Model" : "Thêm Model mới"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="display_name">Tên hiển thị *</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) =>
                    setFormData({ ...formData, display_name: e.target.value })
                  }
                  placeholder="VD: GPT 4.1 MINI"
                  required
                />
              </div>

              <div>
                <Label htmlFor="provider">Provider *</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) =>
                    setFormData({ ...formData, provider: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="google-ai">Google AI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="model_id">Model ID *</Label>
              <Input
                id="model_id"
                value={formData.model_id}
                onChange={(e) =>
                  setFormData({ ...formData, model_id: e.target.value })
                }
                placeholder="VD: gpt-3.5-turbo"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Mô tả chi tiết về model này..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="max_tokens">Max Tokens</Label>
                <Input
                  id="max_tokens"
                  type="number"
                  value={formData.max_tokens}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_tokens: parseInt(e.target.value),
                    })
                  }
                  min={1}
                />
              </div>

              <div>
                <Label htmlFor="cost_multiplier">Cost Multiplier</Label>
                <Input
                  id="cost_multiplier"
                  type="number"
                  step="0.1"
                  value={formData.cost_multiplier}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cost_multiplier: parseFloat(e.target.value),
                    })
                  }
                  min={0.1}
                />
              </div>

              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked as boolean })
                }
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Model hoạt động (hiển thị cho người dùng)
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Hủy
              </Button>
              <Button type="submit">
                {editingModel ? "Cập nhật" : "Thêm mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
