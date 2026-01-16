import { useState, useEffect } from "react";
import { Clock, CheckCircle, XCircle, Pause, Play, Eye, Trash2, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { buildApiUrl } from "../lib/api";
import { toast } from "./ui/use-toast";
import { useNavigate } from "react-router-dom";
import BatchJobProgress from "./BatchJobProgress";

interface BatchJob {
  id: number;
  user_id: number;
  job_type: string;
  status: string;
  total_items: number;
  completed_items: number;
  failed_items: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export default function BatchJobsList() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        buildApiUrl(`/api/batch-jobs?status=${statusFilter}&limit=50`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const result = await response.json();
      setJobs(result.data.jobs || []);
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách jobs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [statusFilter]);

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
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Batch Jobs</h1>
          <p className="text-lg text-muted-foreground">
            Theo dõi tiến độ viết bài hàng loạt
          </p>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Batch Jobs</h1>
          <p className="text-lg text-muted-foreground">
            Theo dõi tiến độ viết bài hàng loạt ({jobs.length} jobs)
          </p>
        </div>
        <Button
          onClick={fetchJobs}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {["all", "pending", "processing", "completed", "failed", "paused", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              statusFilter === status
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {status === "all"
              ? "Tất cả"
              : status === "pending"
              ? "Đang chờ"
              : status === "processing"
              ? "Đang xử lý"
              : status === "completed"
              ? "Hoàn thành"
              : status === "failed"
              ? "Thất bại"
              : status === "paused"
              ? "Tạm dừng"
              : "Đã hủy"}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium mb-2">Chưa có batch job nào</p>
          <p className="text-sm text-gray-500">
            Tạo batch job mới từ trang "Viết bài" → "Viết theo danh sách từ khóa"
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const progressPercent = Math.round(
              (job.completed_items / job.total_items) * 100
            );

            return (
              <div
                key={job.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Batch Job #{job.id}
                      </h3>
                      {getStatusBadge(job.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Tạo lúc: {formatDate(job.created_at)}
                    </p>
                  </div>
                  <Button
                    onClick={() => setSelectedJobId(job.id)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Chi tiết
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      Tiến độ: {job.completed_items} / {job.total_items}
                    </span>
                    <span className="font-semibold text-blue-600">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {job.failed_items > 0 && (
                    <p className="text-xs text-red-600">
                      {job.failed_items} bài viết thất bại
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Modal */}
      {selectedJobId && (
        <BatchJobProgress
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onJobDeleted={() => {
            setSelectedJobId(null);
            fetchJobs();
          }}
        />
      )}
    </div>
  );
}
