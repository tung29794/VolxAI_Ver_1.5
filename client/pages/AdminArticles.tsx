import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Trash2, Edit3, Eye, Plus } from "lucide-react";

interface Article {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "published";
  meta_description: string;
  created_at: string;
}

export default function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "published">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadArticles();
  }, [activeTab]);

  const loadArticles = async () => {
    setIsLoading(true);
    try {
      let url = "/api/articles";
      if (activeTab !== "all") {
        url += `?status=${activeTab}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load articles");

      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error("Error loading articles:", error);
      alert("Failed to load articles");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete article");

      setArticles(articles.filter((a) => a.id !== id));
      setDeleteConfirm(null);
      alert("Bài viết đã được xóa");
    } catch (error) {
      console.error("Error deleting article:", error);
      alert("Không thể xóa bài viết");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bài viết</h1>
            <p className="text-gray-600 mt-2">
              Quản lý tất cả bài viết của bạn
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => (window.location.href = "/admin/articles/new")}
            className="gap-2"
          >
            <Plus className="w-5 h-5" />
            Viết bài mới
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Tìm kiếm bài viết..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          {["all", "draft", "published"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "all" ? "Tất cả" : tab === "draft" ? "Nháp" : "Đã đăng"}(
              {articles.length})
            </button>
          ))}
        </div>

        {/* Articles List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-500 mb-4">Không có bài viết nào</p>
              <Button
                onClick={() => (window.location.href = "/admin/articles/new")}
              >
                Tạo bài viết đầu tiên
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <Card
                key={article.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-semibold text-gray-900">
                          {article.title}
                        </h2>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            article.status === "published"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {article.status === "published" ? "Đã đăng" : "Nháp"}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">
                        {article.meta_description || "Không có mô tả"}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          Slug:{" "}
                          <code className="bg-gray-100 px-2 py-1 rounded">
                            {article.slug}
                          </code>
                        </span>
                        <span>Tạo: {formatDate(article.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {article.status === "published" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(`/blog/${article.slug}`, "_blank")
                          }
                          title="Xem bài viết"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          (window.location.href = `/admin/articles/${article.id}/edit`)
                        }
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Dialog
                        open={deleteConfirm === article.id}
                        onOpenChange={(open) =>
                          setDeleteConfirm(open ? article.id : null)
                        }
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(article.id)}
                          title="Xóa"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Xóa bài viết</DialogTitle>
                            <DialogDescription>
                              Bạn có chắc chắn muốn xóa bài viết "
                              {article.title}"? Hành động này không thể hoàn
                              tác.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setDeleteConfirm(null)}
                              disabled={isDeleting}
                            >
                              Hủy
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleDelete(article.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Đang xóa...
                                </>
                              ) : (
                                "Xóa"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
