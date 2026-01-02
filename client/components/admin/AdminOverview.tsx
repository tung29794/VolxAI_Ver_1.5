import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildAdminApiUrl } from "@/lib/api";

interface StatisticsData {
  totalUsers: number;
  freeUsers: number;
  upgradedUsers: number;
  totalRevenue: number;
  dailyRevenue: { date: string; amount: number }[];
  monthlyRevenue: { month: string; amount: number }[];
  quarterlyRevenue: { quarter: string; amount: number }[];
  yearlyRevenue: { year: number; amount: number }[];
}

type PeriodType = "day" | "month" | "quarter" | "year";

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatisticsData>({
    totalUsers: 0,
    freeUsers: 0,
    upgradedUsers: 0,
    totalRevenue: 0,
    dailyRevenue: [],
    monthlyRevenue: [],
    quarterlyRevenue: [],
    yearlyRevenue: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("month");

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await fetch(buildAdminApiUrl("/api/admin/statistics"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  const getChartData = () => {
    switch (selectedPeriod) {
      case "day":
        return stats.dailyRevenue;
      case "month":
        return stats.monthlyRevenue;
      case "quarter":
        return stats.quarterlyRevenue;
      case "year":
        return stats.yearlyRevenue;
    }
  };

  const chartData = getChartData();
  const maxValue = Math.max(...chartData.map((d) => d.amount), 1);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Tổng quan
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-2">
          Xem thống kê và phân tích doanh số bán hàng
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Card className="p-3 md:p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
            <CardTitle className="text-xs md:text-sm font-medium">
              Tổng người dùng
            </CardTitle>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-xl md:text-2xl font-bold">
              {stats.totalUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.upgradedUsers} đã nâng cấp
            </p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
            <CardTitle className="text-xs md:text-sm font-medium">
              Người dùng miễn phí
            </CardTitle>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-xl md:text-2xl font-bold">
              {stats.freeUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalUsers > 0
                ? Math.round((stats.freeUsers / stats.totalUsers) * 100)
                : 0}
              % tổng số
            </p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
            <CardTitle className="text-xs md:text-sm font-medium">
              Người dùng nâng cấp
            </CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-xl md:text-2xl font-bold">
              {stats.upgradedUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalUsers > 0
                ? Math.round((stats.upgradedUsers / stats.totalUsers) * 100)
                : 0}
              % tổng số
            </p>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
            <CardTitle className="text-xs md:text-sm font-medium">
              Tổng doanh thu
            </CardTitle>
            <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-xl md:text-2xl font-bold">
              {stats.totalRevenue.toLocaleString("vi-VN")}₫
            </div>
            <p className="text-xs text-muted-foreground">
              Từ tất cả các giao dịch
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card>
        <CardHeader className="space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg md:text-xl">
              Doanh số bán hàng
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedPeriod === "day" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("day")}
                className="text-xs py-1 h-auto px-2"
                size="sm"
              >
                Ngày
              </Button>
              <Button
                variant={selectedPeriod === "month" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("month")}
                className="text-xs py-1 h-auto px-2"
                size="sm"
              >
                Tháng
              </Button>
              <Button
                variant={selectedPeriod === "quarter" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("quarter")}
                className="text-xs py-1 h-auto px-2"
                size="sm"
              >
                Quý
              </Button>
              <Button
                variant={selectedPeriod === "year" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("year")}
                className="text-xs py-1 h-auto px-2"
                size="sm"
              >
                Năm
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 md:h-96 flex items-center justify-center">
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 md:h-96 flex items-center justify-center">
              <p className="text-muted-foreground">Chưa có dữ liệu</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="h-64 md:h-96 flex items-end gap-1 md:gap-3 justify-between min-w-full">
                {chartData.map((item, index) => (
                  <div
                    key={index}
                    className="flex-1 min-w-[30px] md:min-w-0 flex flex-col items-center gap-1 md:gap-2"
                  >
                    <div className="w-full bg-gray-200 rounded-t-lg relative group">
                      <div
                        className="w-full bg-primary rounded-t-lg transition-all hover:bg-primary/80"
                        style={{
                          height: `${(item.amount / maxValue) * 250}px`,
                          minHeight: item.amount > 0 ? "4px" : "0px",
                        }}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {item.amount.toLocaleString("vi-VN")}₫
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center break-words">
                      {item.date || item.month || item.quarter || item.year}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
