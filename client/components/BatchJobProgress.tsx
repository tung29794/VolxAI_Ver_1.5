import { useState, useEffect } from "react";
import { X, CheckCircle, XCircle, Clock, Pause, Play, Trash2, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { buildApiUrl } from "../lib/api";
import { toast } from "./ui/use-toast";
import { useNavigate } from "react-router-dom";

interface BatchJobProgressProps {
  jobId: number;
  onClose: () => void;
  onJobDeleted?: () => void;
}

interface BatchJob {
  id: number;
  user_id: number;
  job_type: string;
  status: string;
  total_items: number;
  completed_items: number;
  failed_items: number;
  job_data: {
    keywords: string[];
    settings: any;
  };
  article_ids: number[];
  current_item_index: number;
  tokens_at_start: number;
  tokens_used: number;
  articles_limit_at_start: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  created_at: string;
}

export default function BatchJobProgress({ jobId, onClose, onJobDeleted }: BatchJobProgressProps) {
  const navigate = useNavigate();
  const [job, setJob] = useState<BatchJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Fetch job details
  const fetchJob = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(buildApiUrl(`/api/batch-jobs/${jobId}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch job");
      }

      const result = await response.json();
      setJob(result.data);
    } catch (error: any) {
      console.error("Error fetching job:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải thông tin job",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh while processing
  useEffect(() => {
    fetchJob();

    // Auto-refresh every 3 seconds if job is pending or processing
    const interval = setInterval(() => {
      if (job?.status === "pending" || job?.status === "processing") {
        fetchJob();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  const handleCancel = async () => {
    if (!confirm("Bạn có chắc muốn hủy job này?")) return;

    setIsActionLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(buildApiUrl(`/api/batch-jobs/${jobId}/cancel`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to cancel job");
      }

      toast({
        title: "Thành công",
        description: "Đã hủy job",
      });

      fetchJob();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể hủy job",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xóa job này?")) return;

    setIsActionLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(buildApiUrl(`/api/batch-jobs/${jobId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete job");
      }

      toast({
        title: "Thành công",
        description: "Đã xóa job",
      });

      if (onJobDeleted) onJobDeleted();
      onClose();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa job",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; label: string }> = {
      pending: { color: "bg-gray-100 text-gray-700", icon: Clock, label: "Đang chờ" },
      processing: { color: "bg-blue-100 text-blue-700", icon: Play, label: "Đang xử lý" },
      completed: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Hoàn thành" },
      failed: { color: "bg-red-100 text-red-700", icon: XCircle, label: "Thất bại" },
      paused: { color: "bg-yellow-100 text-yellow-700", icon: Pause, label: "Tạm dừng" },
      cancelled: { color: "bg-gray-100 text-gray-700", icon: XCircle, label: "Đã hủy" },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const progressPercentage = job
    ? Math.round((job.completed_items / job.total_items) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Batch Job #{job.id}
              </h2>
              <p className="text-sm text-gray-500">
                {getStatusBadge(job.status)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                Tiến độ: {job.completed_items} / {job.total_items} bài viết
              </span>
              <span className="font-semibold text-blue-600">
                {progressPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            {job.failed_items > 0 && (
              <p className="text-sm text-red-600">
                {job.failed_items} bài viết thất bại
              </p>
            )}
          </div>

          {/* Error Message */}
          {job.error_message && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <XCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Thông báo</p>
                  <p className="text-sm text-yellow-700 mt-1">{job.error_message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Tokens sử dụng</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {job.tokens_used.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Thời gian</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {job.started_at
                  ? Math.round(
                      (new Date(job.completed_at || new Date()).getTime() -
                        new Date(job.started_at).getTime()) /
                        1000 /
                        60
                    ) + "m"
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Articles Created */}
          {job.article_ids && job.article_ids.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">
                Bài viết đã tạo ({job.article_ids.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {job.article_ids.map((articleId, index) => (
                  <div
                    key={articleId}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">
                        {job.job_data.keywords[index] || `Bài viết #${articleId}`}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/articles/${articleId}`)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Xem
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            {(job.status === "pending" || job.status === "processing") && (
              <Button
                onClick={handleCancel}
                disabled={isActionLoading}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Hủy Job
              </Button>
            )}

            {(job.status === "completed" ||
              job.status === "failed" ||
              job.status === "cancelled") && (
              <Button
                onClick={handleDelete}
                disabled={isActionLoading}
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa Job
              </Button>
            )}

            {job.article_ids && job.article_ids.length > 0 && (
              <Button
                onClick={() => {
                  navigate("/account?tab=articles");
                  onClose();
                }}
                variant="outline"
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Xem tất cả bài viết
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
