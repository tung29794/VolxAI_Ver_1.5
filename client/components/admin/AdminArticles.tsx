import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { buildAdminApiUrl } from "@/lib/api";

interface Article {
  id: number;
  user_id: number;
  title: string;
  username: string;
  status: "draft" | "published" | "archived";
  meta_title?: string;
  meta_description?: string;
  slug?: string;
  created_at: string;
  published_at: string | null;
}

// Calculate SEO score based on meta data
function calculateSeoScore(article: Article): number {
  let score = 0;
  
  // Check meta title (max 30 points)
  if (article.meta_title) {
    if (article.meta_title.length >= 50 && article.meta_title.length <= 60) {
      score += 30;
    } else if (article.meta_title.length >= 40 && article.meta_title.length <= 70) {
      score += 20;
    } else if (article.meta_title.length > 0) {
      score += 10;
    }
  }
  
  // Check meta description (max 30 points)
  if (article.meta_description) {
    if (article.meta_description.length >= 150 && article.meta_description.length <= 160) {
      score += 30;
    } else if (article.meta_description.length >= 120 && article.meta_description.length <= 180) {
      score += 20;
    } else if (article.meta_description.length > 0) {
      score += 10;
    }
  }
  
  // Check slug (max 20 points)
  if (article.slug) {
    const slugWords = article.slug.split('-').length;
    if (slugWords >= 3 && slugWords <= 6) {
      score += 20;
    } else if (slugWords >= 2 && slugWords <= 8) {
      score += 10;
    } else if (slugWords > 0) {
      score += 5;
    }
  }
  
  // Check title exists (max 20 points)
  if (article.title && article.title.length > 10) {
    score += 20;
  } else if (article.title) {
    score += 10;
  }
  
  return Math.min(score, 100);
}

function getSeoScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

function getSeoScoreBg(score: number): string {
  if (score >= 80) return "bg-green-100";
  if (score >= 60) return "bg-yellow-100";
  if (score >= 40) return "bg-orange-100";
  return "bg-red-100";
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
      if (!token) {
        console.error("No auth token found");
        toast.error("Vui lòng đăng nhập lại");
        return;
      }

      const url = buildAdminApiUrl("/api/articles");
      console.log("Fetching articles from:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (data.success) {
        setArticles(data.data || []);
      } else {
        toast.error(data.message || "Không thể tải danh sách bài viết");
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
                  <th className="text-left py-3 px-4 font-semibold">Điểm SEO</th>
                  <th className="text-left py-3 px-4 font-semibold">Ngày tạo</th>
                  <th className="text-left py-3 px-4 font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredArticles.map((article) => {
                  const seoScore = calculateSeoScore(article);
                  return (
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
                        <span
                          className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${getSeoScoreBg(seoScore)} ${getSeoScoreColor(seoScore)}`}
                        >
                          {seoScore}
                        </span>
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
                          <Link to={`/admin/articles/${article.id}/edit`}>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Chỉnh sửa"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </Link>
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredArticles.map((article) => {
              const seoScore = calculateSeoScore(article);
              return (
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
                    <span
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getSeoScoreBg(seoScore)} ${getSeoScoreColor(seoScore)}`}
                    >
                      {seoScore}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>
                      {new Date(article.created_at).toLocaleDateString(
                        "vi-VN",
                      )}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link to={`/admin/articles/${article.id}/edit`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Sửa
                      </Button>
                    </Link>
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
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
