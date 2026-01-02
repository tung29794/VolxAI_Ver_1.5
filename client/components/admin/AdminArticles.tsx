import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Archive, Plus } from "lucide-react";
import { toast } from "sonner";
import { buildAdminApiUrl } from "@/lib/api";

interface Article {
  id: number;
  user_id: number;
  title: string;
  username: string;
  status: "draft" | "published" | "archived";
  views_count: number;
  tokens_used: number;
  created_at: string;
  published_at: string | null;
}

export default function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "draft" | "published" | "archived"
  >("all");

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(buildAdminApiUrl("/api/admin/articles"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setArticles(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
      toast.error("Không thể tải danh sách bài viết");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArticle = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(`/api/admin/articles/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setArticles(articles.filter((a) => a.id !== id));
        toast.success("Bài viết đã được xóa");
      }
    } catch (error) {
      console.error("Failed to delete article:", error);
      toast.error("Không thể xóa bài viết");
    }
  };

  const handleArchiveArticle = async (id: number) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(`/api/admin/articles/${id}/archive`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setArticles(
          articles.map((a) =>
            a.id === id ? { ...a, status: "archived" as const } : a,
          ),
        );
        toast.success("Bài viết đã được lưu trữ");
      }
    } catch (error) {
      console.error("Failed to archive article:", error);
      toast.error("Không thể lưu trữ bài viết");
    }
  };

  const filteredArticles = articles.filter((a) =>
    filter === "all" ? true : a.status === filter,
  );

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      draft: { bg: "bg-gray-100", text: "text-gray-800" },
      published: { bg: "bg-green-100", text: "text-green-800" },
      archived: { bg: "bg-yellow-100", text: "text-yellow-800" },
    };
    return badges[status] || badges.draft;
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Quản lý bài viết
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-2">
          Xem và quản lý tất cả bài viết trong hệ thống
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "draft", "published", "archived"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize text-xs md:text-sm py-1 h-auto"
              size="sm"
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
        <Link to="/admin/articles/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Viết bài
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Chưa có bài viết nào</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Tiêu đề</th>
                  <th className="text-left py-3 px-4 font-semibold">Tác giả</th>
                  <th className="text-left py-3 px-4 font-semibold">Trạng thái</th>
                  <th className="text-left py-3 px-4 font-semibold">Lượt xem</th>
                  <th className="text-left py-3 px-4 font-semibold">Token</th>
                  <th className="text-left py-3 px-4 font-semibold">Ngày tạo</th>
                  <th className="text-left py-3 px-4 font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredArticles.map((article) => (
                  <tr
                    key={article.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <p className="font-medium text-foreground line-clamp-2">
                          {article.title}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <p className="text-muted-foreground">
                        {article.username}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          getStatusBadge(article.status).bg
                        } ${getStatusBadge(article.status).text}`}
                      >
                        {article.status === "draft"
                          ? "Nháp"
                          : article.status === "published"
                            ? "Đã xuất bản"
                            : "Lưu trữ"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {article.views_count}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <p className="text-muted-foreground">
                        {article.tokens_used.toLocaleString("vi-VN")}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <p className="text-muted-foreground">
                        {new Date(article.created_at).toLocaleDateString(
                          "vi-VN",
                        )}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {article.status !== "archived" && (
                          <Button
                            onClick={() => handleArchiveArticle(article.id)}
                            variant="outline"
                            size="sm"
                            title="Lưu trữ"
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDeleteArticle(article.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          title="Xóa"
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

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground line-clamp-2">
                    {article.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    By {article.username}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      getStatusBadge(article.status).bg
                    } ${getStatusBadge(article.status).text}`}
                  >
                    {article.status === "draft"
                      ? "Nháp"
                      : article.status === "published"
                        ? "Đã xuất bản"
                        : "Lưu trữ"}
                  </span>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {article.views_count} views
                  </p>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    Token: {article.tokens_used.toLocaleString("vi-VN")}
                  </p>
                  <p>
                    {new Date(article.created_at).toLocaleDateString(
                      "vi-VN",
                    )}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  {article.status !== "archived" && (
                    <Button
                      onClick={() => handleArchiveArticle(article.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      <Archive className="w-4 h-4 mr-1" />
                      Lưu trữ
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDeleteArticle(article.id)}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Xóa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
