import { AlertTriangle, X } from "lucide-react";
import { Button } from "../ui/button";

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
}

interface DeleteConfirmModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: number) => void;
  isDeleting?: boolean;
}

export default function DeleteConfirmModal({ 
  user, 
  isOpen, 
  onClose, 
  onConfirm,
  isDeleting = false 
}: DeleteConfirmModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Xác nhận xóa
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600">
            Bạn có chắc chắn muốn xóa người dùng này không?
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Username:</span>
                <span className="font-medium text-gray-900">{user.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-medium text-gray-900">{user.email}</span>
              </div>
              {user.full_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Họ tên:</span>
                  <span className="font-medium text-gray-900">{user.full_name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>Cảnh báo:</strong> Hành động này không thể hoàn tác. Tất cả dữ liệu 
              liên quan đến người dùng này (bài viết, subscription, ...) sẽ bị xóa vĩnh viễn.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(user.id)}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Đang xóa...
              </>
            ) : (
              "Xóa người dùng"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
