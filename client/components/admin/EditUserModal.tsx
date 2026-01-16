import { useState, useEffect } from "react";
import { X, Save, DollarSign, FileText, Calendar, Shield, Lock } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "../ui/use-toast";
import { buildApiUrl } from "../../lib/api";

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: "user" | "admin";
  tokens_remaining: number;
  article_limit: number;
  is_active: boolean;
  is_locked: boolean;
  locked_reason: string | null;
  admin_notes: string | null;
  plan_type: string | null;
  plan_name: string | null;
  tokens_limit: number | null;
  articles_limit: number | null;
  expires_at: string | null;
}

interface EditUserModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditUserModal({ user, isOpen, onClose, onSuccess }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    full_name: "",
    password: "",
    role: "user",
    tokens_remaining: 0,
    article_limit: 0,
    is_active: true,
    is_locked: false,
    locked_reason: "",
    admin_notes: "",
    plan_type: "free",
    plan_name: "Free",
    tokens_limit: 10000,
    articles_limit: 5,
    expires_at: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        email: user.email || "",
        username: user.username || "",
        full_name: user.full_name || "",
        password: "",
        role: user.role || "user",
        tokens_remaining: user.tokens_remaining || 0,
        article_limit: user.article_limit || 0,
        is_active: user.is_active ?? true,
        is_locked: user.is_locked ?? false,
        locked_reason: user.locked_reason || "",
        admin_notes: user.admin_notes || "",
        plan_type: user.plan_type || "free",
        plan_name: user.plan_name || "Free",
        tokens_limit: user.tokens_limit || 10000,
        articles_limit: user.articles_limit || 5,
        expires_at: user.expires_at 
          ? new Date(user.expires_at).toISOString().slice(0, 16)
          : "",
      });
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem("authToken");
      const updateData: any = {
        email: formData.email,
        username: formData.username,
        full_name: formData.full_name || null,
        role: formData.role,
        tokens_remaining: formData.tokens_remaining,
        article_limit: formData.article_limit,
        is_active: formData.is_active,
        is_locked: formData.is_locked,
        locked_reason: formData.is_locked ? formData.locked_reason : null,
        admin_notes: formData.admin_notes || null,
      };

      // Only include password if changed
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(
        buildApiUrl(`/api/admin/users/${user.id}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      const data = await response.json();
      if (data.success) {
        // Update subscription if changed
        const subscriptionData: any = {
          plan_type: formData.plan_type,
          plan_name: formData.plan_name,
          tokens_limit: formData.tokens_limit,
          articles_limit: formData.articles_limit,
        };

        if (formData.expires_at) {
          subscriptionData.expires_at = new Date(formData.expires_at).toISOString();
        }

        await fetch(
          buildApiUrl(`/api/admin/users/${user.id}/subscription`),
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(subscriptionData),
          }
        );

        toast({
          title: "Thành công",
          description: "Đã cập nhật thông tin người dùng",
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật người dùng",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Chỉnh sửa người dùng: {user.username}
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
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Thông tin cơ bản
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu mới (để trống nếu không đổi)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập mật khẩu mới..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vai trò
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as "user" | "admin" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tokens & Limits */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              Tokens & Giới hạn
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tokens còn lại
                </label>
                <input
                  type="number"
                  value={formData.tokens_remaining}
                  onChange={(e) => setFormData({ ...formData, tokens_remaining: parseInt(e.target.value) || 0 })}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Gói dịch vụ
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại gói
                </label>
                <select
                  value={formData.plan_type}
                  onChange={(e) => {
                    const type = e.target.value;
                    let name = "Free";
                    let tokensLimit = 10000;
                    let articlesLimit = 5;
                    
                    switch(type) {
                      case "starter":
                        name = "Starter";
                        tokensLimit = 100000;
                        articlesLimit = 50;
                        break;
                      case "grow":
                        name = "Grow";
                        tokensLimit = 500000;
                        articlesLimit = 200;
                        break;
                      case "professional":
                        name = "Professional";
                        tokensLimit = 1000000;
                        articlesLimit = 500;
                        break;
                    }
                    
                    setFormData({ 
                      ...formData, 
                      plan_type: type,
                      plan_name: name,
                      tokens_limit: tokensLimit,
                      articles_limit: articlesLimit
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên gói
                </label>
                <input
                  type="text"
                  value={formData.plan_name}
                  onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giới hạn tokens (gói)
                </label>
                <input
                  type="number"
                  value={formData.tokens_limit}
                  onChange={(e) => setFormData({ ...formData, tokens_limit: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giới hạn bài viết (gói)
                </label>
                <input
                  type="number"
                  value={formData.articles_limit}
                  onChange={(e) => setFormData({ ...formData, articles_limit: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Ngày hết hạn
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Status & Lock */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-500" />
              Trạng thái & Khóa
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Đang hoạt động</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_locked}
                    onChange={(e) => setFormData({ ...formData, is_locked: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Khóa tài khoản</span>
                </label>
              </div>

              {formData.is_locked && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lý do khóa
                  </label>
                  <input
                    type="text"
                    value={formData.locked_reason}
                    onChange={(e) => setFormData({ ...formData, locked_reason: e.target.value })}
                    placeholder="Vi phạm điều khoản, spam, ..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Admin Notes */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Ghi chú Admin
            </h3>
            
            <textarea
              value={formData.admin_notes}
              onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
              rows={4}
              placeholder="Ghi chú riêng cho admin về người dùng này..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Lưu thay đổi
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
