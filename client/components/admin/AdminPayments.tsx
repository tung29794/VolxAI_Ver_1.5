import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { buildAdminApiUrl } from "@/lib/api";

interface PaymentApproval {
  id: number;
  user_id: number;
  username: string;
  email: string;
  from_plan: string;
  to_plan: string;
  amount: number;
  billing_period: "monthly" | "annual";
  status: "pending" | "approved" | "rejected";
  payment_date: string;
  created_at: string;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<PaymentApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");

  useEffect(() => {
    fetchPayments();
    // Refresh payments every 10 seconds
    const interval = setInterval(fetchPayments, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(buildAdminApiUrl("/api/admin/payments"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setPayments(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (id: number) => {
    try {
      setApproving(id);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(buildAdminApiUrl(`/api/admin/payments/${id}/approve`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        // Update payment status
        setPayments(
          payments.map((p) => (p.id === id ? { ...p, status: "approved" } : p)),
        );
        toast.success("Đã duyệt thanh toán thành công!");
      } else {
        toast.error(data.message || "Không thể duyệt thanh toán");
      }
    } catch (error) {
      console.error("Failed to approve payment:", error);
      toast.error("Có lỗi xảy ra khi duyệt thanh toán");
    } finally {
      setApproving(null);
    }
  };

  const handleRejectPayment = async (id: number) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (!reason) return;

    try {
      setApproving(id);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(buildAdminApiUrl(`/api/admin/payments/${id}/reject`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();
      if (data.success) {
        // Update payment status
        setPayments(
          payments.map((p) => (p.id === id ? { ...p, status: "rejected" } : p)),
        );
        toast.success("Đã từ chối thanh toán");
      } else {
        toast.error(data.message || "Không thể từ chối thanh toán");
      }
    } catch (error) {
      console.error("Failed to reject payment:", error);
      toast.error("Có lỗi xảy ra khi từ chối thanh toán");
    } finally {
      setApproving(null);
    }
  };

  const filteredPayments = payments.filter((p) =>
    filter === "all" ? true : p.status === filter,
  );

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
            <Clock className="w-3 h-3" />
            Chờ duyệt
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
            <Check className="w-3 h-3" />
            Đã duyệt
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
            <X className="w-3 h-3" />
            Từ chối
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Quản lý thanh toán
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-2">
          Duyệt các yêu cầu nâng cấp gói dịch vụ
        </p>
      </div>

      {/* Alert if pending payments */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4">
          <p className="text-xs md:text-sm text-yellow-900 font-medium">
            ⚠️ Có {pendingCount} thanh toán đang chờ duyệt
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="text-xs md:text-sm py-1 h-auto"
            size="sm"
          >
            {f === "pending"
              ? `Chờ duyệt (${payments.filter((p) => p.status === "pending").length})`
              : f === "approved"
                ? "Đã duyệt"
                : f === "rejected"
                  ? "Từ chối"
                  : "Tất cả"}
          </Button>
        ))}
      </div>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">
            Danh sách thanh toán
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {filter === "pending"
                  ? "Không có thanh toán nào chờ duyệt"
                  : "Không có thanh toán nào"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="border border-border rounded-lg p-3 md:p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {/* Left Column: User Info */}
                    <div className="space-y-2 md:space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          Người dùng
                        </p>
                        <p className="font-semibold text-sm md:text-base text-foreground">
                          {payment.username}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground break-all">
                          {payment.email}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          Gói nâng cấp
                        </p>
                        <p className="font-semibold text-sm md:text-base text-foreground">
                          {payment.from_plan} → {payment.to_plan}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          Ngày thanh toán
                        </p>
                        <p className="text-xs md:text-sm text-foreground">
                          {new Date(payment.created_at).toLocaleDateString(
                            "vi-VN",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right Column: Amount & Actions */}
                    <div className="space-y-2 md:space-y-3 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          Số tiền
                        </p>
                        <p className="text-2xl md:text-3xl font-bold text-primary">
                          {payment.amount.toLocaleString("vi-VN")}₫
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {payment.billing_period === "annual"
                            ? "Hàng năm"
                            : "Hàng tháng"}
                        </p>
                      </div>

                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                        <div>{getStatusBadge(payment.status)}</div>

                        {payment.status === "pending" && (
                          <div className="flex gap-2 w-full md:w-auto">
                            <Button
                              onClick={() => handleApprovePayment(payment.id)}
                              disabled={approving === payment.id}
                              className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm py-1 h-auto"
                              size="sm"
                            >
                              <Check className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                              {approving === payment.id ? "Xử lý..." : "Duyệt"}
                            </Button>
                            <Button
                              onClick={() => handleRejectPayment(payment.id)}
                              disabled={approving === payment.id}
                              variant="outline"
                              className="flex-1 md:flex-none text-red-600 hover:text-red-700 text-xs md:text-sm py-1 h-auto"
                              size="sm"
                            >
                              <X className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                              Từ chối
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
