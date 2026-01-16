import { useState } from "react";
import { X, UserPlus, DollarSign, FileText } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "../ui/use-toast";
import { buildApiUrl } from "../../lib/api";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    full_name: "",
    password: "",
    role: "user",
    tokens_remaining: 10000,
    article_limit: 5,
    plan_type: "free",
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.username || !formData.password) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        buildApiUrl("/api/admin/users"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            full_name: formData.full_name || null,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Thành công",
          description: "Đã tạo người dùng mới",
        });
        
        // Reset form
        setFormData({
          email: "",
          username: "",
          full_name: "",
          password: "",
          role: "user",
          tokens_remaining: 10000,
          article_limit: 5,
          plan_type: "free",
        });
        
        onSuccess();
        onClose();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo người dùng",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Thêm người dùng mới
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Thông tin đăng nhập
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email * <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  placeholder="username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ tên
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Mật khẩu phải có ít nhất 6 ký tự
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vai trò
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>

          {/* Initial Settings */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              Cài đặt ban đầu
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tokens ban đầu
                </label>
                <input
                  type="number"
                  value={formData.tokens_remaining}
                  onChange={(e) => setFormData({ ...formData, tokens_remaining: parseInt(e.target.value) || 0 })}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giới hạn bài viết
                </label>
                <input
                  type="number"
                  value={formData.article_limit}
                  onChange={(e) => setFormData({ ...formData, article_limit: parseInt(e.target.value) || 0 })}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gói dịch vụ
                </label>
                <select
                  value={formData.plan_type}
                  onChange={(e) => {
                    const type = e.target.value;
                    let tokens = 10000;
                    let articles = 5;
                    
                    switch(type) {
                      case "starter":
                        tokens = 100000;
                        articles = 50;
                        break;
                      case "grow":
                        tokens = 500000;
                        articles = 200;
                        break;
                      case "professional":
                        tokens = 1000000;
                        articles = 500;
                        break;
                    }
                    
                    setFormData({ 
                      ...formData, 
                      plan_type: type,
                      tokens_remaining: tokens,
                      article_limit: articles
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="grow">Grow</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Lưu ý:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>User mới sẽ được tạo với trạng thái "Đang hoạt động"</li>
                    <li>Gói Free mặc định: 10,000 tokens, 5 bài viết</li>
                    <li>Chọn gói khác để tự động cập nhật tokens và giới hạn bài</li>
                    <li>Có thể chỉnh sửa thông tin sau khi tạo</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={creating}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Tạo người dùng
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
