import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../lib/api";
import { Header } from "../components/Header";
import { Button } from "../components/ui/button";
import { 
  Users, Search, Plus, Edit2, Trash2, Lock, Unlock, 
  RefreshCw, Filter, ChevronLeft, ChevronRight, X,
  DollarSign, FileText, Calendar, Shield, User, Mail
} from "lucide-react";
import { toast } from "../components/ui/use-toast";
import EditUserModal from "../components/admin/EditUserModal";
import CreateUserModal from "../components/admin/CreateUserModal";
import DeleteConfirmModal from "../components/admin/DeleteConfirmModal";

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
  is_verified: boolean;
  admin_notes: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  plan_type: string | null;
  plan_name: string | null;
  tokens_limit: number | null;
  articles_limit: number | null;
  expires_at: string | null;
  subscription_active: boolean;
  total_articles: number;
  published_articles: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login");
        return;
      }

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(
        buildApiUrl(`/api/admin/users?${params.toString()}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          toast({
            title: "Không có quyền truy cập",
            description: "Bạn không có quyền admin",
            variant: "destructive",
          });
          navigate("/account");
          return;
        }
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách người dùng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        buildApiUrl(`/api/admin/users/${userId}`),
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
          title: "Thành công",
          description: "Đã xóa người dùng",
        });
        fetchUsers();
        setShowDeleteConfirm(false);
        setSelectedUser(null);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa người dùng",
        variant: "destructive",
      });
    }
  };

  const handleToggleLock = async (user: User) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        buildApiUrl(`/api/admin/users/${user.id}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            is_locked: !user.is_locked,
            locked_reason: user.is_locked ? null : "Locked by admin"
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Thành công",
          description: user.is_locked ? "Đã mở khóa người dùng" : "Đã khóa người dùng",
        });
        fetchUsers();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thay đổi trạng thái",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Chưa có";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPlanBadgeColor = (planType: string | null) => {
    switch (planType) {
      case "free": return "bg-gray-100 text-gray-700";
      case "starter": return "bg-blue-100 text-blue-700";
      case "grow": return "bg-purple-100 text-purple-700";
      case "professional": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    return role === "admin" 
      ? "bg-red-100 text-red-700" 
      : "bg-green-100 text-green-700";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Quản Lý Người Dùng
                </h1>
                <p className="text-sm text-gray-500">
                  Tổng: {pagination.total} người dùng
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Thêm User
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm email, username, tên..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button onClick={handleSearch} variant="outline">
                <Search className="w-4 h-4" />
              </Button>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Bộ lọc
            </Button>
            
            <Button
              variant="outline"
              onClick={fetchUsers}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vai trò
                  </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="locked">Đã khóa</option>
                    <option value="inactive">Không hoạt động</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setRoleFilter("");
                      setStatusFilter("");
                      setSearch("");
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Xóa bộ lọc
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Đang tải...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Không tìm thấy người dùng nào</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Người dùng
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Vai trò
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                        Gói dịch vụ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                        Tokens
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                        Bài viết
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                        Trạng thái
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                        Ngày tạo
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.full_name || user.username}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                            {user.last_login && (
                              <div className="text-xs text-gray-400 mt-1">
                                Đăng nhập: {formatDate(user.last_login)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                            {user.role === "admin" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {user.role === "admin" ? "Admin" : "User"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(user.plan_type)}`}>
                              {user.plan_name || "Chưa có gói"}
                            </span>
                            {user.expires_at && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Hết hạn: {formatDate(user.expires_at)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm">
                            <DollarSign className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            <span className="font-medium">{user.tokens_remaining?.toLocaleString() || 0}</span>
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            Giới hạn: {user.article_limit || 0} bài
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm">
                            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="font-medium">{user.total_articles}</span>
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            Công khai: {user.published_articles}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {user.is_locked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium whitespace-nowrap">
                                <Lock className="w-3 h-3" />
                                Đã khóa
                              </span>
                            ) : user.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium whitespace-nowrap">
                                <Unlock className="w-3 h-3" />
                                Hoạt động
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium whitespace-nowrap">
                                Không hoạt động
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {formatDate(user.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditModal(true);
                              }}
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleLock(user)}
                              title={user.is_locked ? "Mở khóa" : "Khóa"}
                            >
                              {user.is_locked ? (
                                <Unlock className="w-4 h-4 text-green-600" />
                              ) : (
                                <Lock className="w-4 h-4 text-yellow-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteConfirm(true);
                              }}
                              title="Xóa"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} của{" "}
                  {pagination.total} người dùng
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-700">
                    Trang {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={fetchUsers}
        />
      )}

      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchUsers}
      />

      <DeleteConfirmModal
        user={selectedUser}
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteUser}
      />
    </div>
  );
}
