import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Upload, CheckSquare, Square, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { buildApiUrl } from "@/lib/api";

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

export default function UserArticles() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "draft" | "published" | "archived"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 30;
  
  // Bulk actions state
  const [selectedArticles, setSelectedArticles] = useState<Set<number>>(new Set());
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [postTypes, setPostTypes] = useState<any[]>([]);
  const [selectedPostType, setSelectedPostType] = useState<string>("post");
  const [taxonomies, setTaxonomies] = useState<any[]>([]);
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<Record<string, number>>({});
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    fetchArticles();
    fetchWebsites();
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

      const url = buildApiUrl("/api/articles");
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

      const response = await fetch(buildApiUrl(`/api/articles/${id}`), {
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

  const fetchWebsites = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(buildApiUrl("/api/websites"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setWebsites(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch websites:", error);
    }
  };

  const fetchPostTypes = async (websiteId: string) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(buildApiUrl(`/api/websites/${websiteId}/post-types`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setPostTypes(data.data || []);
        // Set default to 'post' if available
        const defaultPostType = data.data.find((pt: any) => pt.name === 'post');
        if (defaultPostType) {
          setSelectedPostType('post');
        } else if (data.data.length > 0) {
          setSelectedPostType(data.data[0].name);
        }
      }
    } catch (error) {
      console.error("Failed to fetch post types:", error);
    }
  };

  const fetchTaxonomies = async (websiteId: string, postType: string) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(
        buildApiUrl(`/api/websites/${websiteId}/taxonomies?post_type=${postType}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setTaxonomies(data.data || []);
        // Reset selected taxonomy when taxonomies change
        setSelectedTaxonomy({});
      }
    } catch (error) {
      console.error("Failed to fetch taxonomies:", error);
    }
  };

  // Fetch post types when website is selected
  useEffect(() => {
    if (selectedWebsite) {
      fetchPostTypes(selectedWebsite);
    } else {
      setPostTypes([]);
      setSelectedPostType("post");
      setTaxonomies([]);
      setSelectedTaxonomy({});
    }
  }, [selectedWebsite]);

  // Fetch taxonomies when post type changes
  useEffect(() => {
    if (selectedWebsite && selectedPostType) {
      fetchTaxonomies(selectedWebsite, selectedPostType);
    } else {
      setTaxonomies([]);
      setSelectedTaxonomy({});
    }
  }, [selectedWebsite, selectedPostType]);

  const handleToggleArticle = (id: number) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedArticles(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedArticles.size === filteredArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(filteredArticles.map(a => a.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedArticles.size === 0) {
      toast.error("Vui lòng chọn ít nhất một bài viết");
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedArticles.size} bài viết?`)) return;

    try {
      setBulkActionLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const deletePromises = Array.from(selectedArticles).map(id =>
        fetch(buildApiUrl(`/api/articles/${id}`), {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      await Promise.all(deletePromises);
      
      setArticles(articles.filter(a => !selectedArticles.has(a.id)));
      setSelectedArticles(new Set());
      toast.success(`Đã xóa ${selectedArticles.size} bài viết`);
    } catch (error) {
      console.error("Failed to bulk delete:", error);
      toast.error("Không thể xóa các bài viết đã chọn");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkPublish = async () => {
    if (selectedArticles.size === 0) {
      toast.error("Vui lòng chọn ít nhất một bài viết");
      return;
    }

    if (!selectedWebsite) {
      toast.error("Vui lòng chọn website để đăng bài");
      return;
    }

    if (!selectedPostType) {
      toast.error("Vui lòng chọn post type");
      return;
    }

    try {
      setBulkActionLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const publishPromises = Array.from(selectedArticles).map(articleId => {
        const body: any = { 
          articleId,
          postType: selectedPostType 
        };
        
        // Add taxonomy terms if selected
        if (Object.keys(selectedTaxonomy).length > 0) {
          body.taxonomies = selectedTaxonomy;
        }
        
        return fetch(buildApiUrl(`/api/websites/${selectedWebsite}/publish`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      });

      const results = await Promise.all(publishPromises);
      const successResults = await Promise.all(
        results.filter(r => r.ok).map(r => r.json())
      );
      
      const successCount = successResults.length;
      const updatedCount = successResults.filter((r: any) => r.data?.action === 'updated').length;
      const createdCount = successResults.filter((r: any) => r.data?.action === 'created').length;
      
      if (successCount > 0) {
        let message = `Đã xử lý ${successCount}/${selectedArticles.size} bài viết`;
        if (createdCount > 0) message += ` (${createdCount} mới)`;
        if (updatedCount > 0) message += ` (${updatedCount} cập nhật)`;
        
        toast.success(message);
        setSelectedArticles(new Set());
        fetchArticles(); // Refresh to get updated data
      } else {
        toast.error("Không thể đăng bài viết");
      }
    } catch (error) {
      console.error("Failed to bulk publish:", error);
      toast.error("Không thể đăng bài viết lên website");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const filteredArticles = articles.filter((article) => {
    // Filter by status
    const statusMatch = filter === "all" || article.status === filter;
    
    // Filter by search query
    const searchMatch = searchQuery === "" || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    return statusMatch && searchMatch;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  // Helper to render windowed page buttons with ellipses
  const renderPageButtons = (
    total: number,
    current: number,
    go: (p: number) => void,
  ) => {
    const delta = 2; // pages to show on each side of current
    const left = Math.max(1, current - delta);
    const right = Math.min(total, current + delta);
    const buttons: any[] = [];

    const pushPage = (p: number) => {
      buttons.push(
        <Button
          key={`p-${p}`}
          variant={current === p ? "default" : "outline"}
          size="sm"
          onClick={() => go(p)}
          className={`h-8 w-8 p-0 ${current === p ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          {p}
        </Button>
      );
    };

    // First page
    if (left > 1) {
      pushPage(1);
      if (left > 2) {
        buttons.push(
          <div key="start-ellipsis" className="px-2 text-muted-foreground">…</div>
        );
      }
    }

    for (let p = left; p <= right; p++) pushPage(p);

    // Last page
    if (right < total) {
      if (right < total - 1) {
        buttons.push(
          <div key="end-ellipsis" className="px-2 text-muted-foreground">…</div>
        );
      }
      pushPage(total);
    }

    return buttons;
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const statusText = (status: string) => {
    switch (status) {
      case "published":
        return "Đã đăng";
      case "draft":
        return "Nháp";
      case "archived":
        return "Lưu trữ";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Section - Responsive */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-foreground">
            Tất cả bài viết
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground mt-1">
            Quản lý tất cả bài viết của bạn
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 w-full"
            />
          </div>
          <Button
            onClick={() => navigate("/write-article")}
            className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Viết bài mới
          </Button>
        </div>
      </div>

      {/* Filter Tabs - Responsive with scrolling on mobile */}
      <div className="flex gap-2 border-b border-border overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 md:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm md:text-base ${
            filter === "all"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setFilter("draft")}
          className={`px-3 md:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm md:text-base ${
            filter === "draft"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Nháp
        </button>
        <button
          onClick={() => setFilter("published")}
          className={`px-3 md:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm md:text-base ${
            filter === "published"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Đã đăng
        </button>
        <button
          onClick={() => setFilter("archived")}
          className={`px-3 md:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm md:text-base ${
            filter === "archived"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Lưu trữ
        </button>
      </div>

      {/* Bulk Actions Bar - Responsive */}
      {selectedArticles.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm font-medium text-blue-900">
              Đã chọn {selectedArticles.size} bài viết
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedArticles(new Set())}
              className="text-xs md:text-sm h-8"
            >
              Bỏ chọn
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Chọn website" />
                </SelectTrigger>
                <SelectContent>
                  {websites.map((website) => (
                    <SelectItem key={website.id} value={website.id.toString()}>
                      {website.name || website.url}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedWebsite && postTypes.length > 0 && (
                <Select value={selectedPostType} onValueChange={setSelectedPostType}>
                  <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                    <SelectValue placeholder="Post Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {postTypes.map((postType) => (
                      <SelectItem key={postType.name} value={postType.name}>
                        {postType.label} ({postType.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {/* Taxonomies Selection - Only show if post type is not "page" */}
            {selectedWebsite && selectedPostType && selectedPostType !== 'page' && taxonomies.length > 0 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                {taxonomies.map((taxonomy) => (
                  <Select
                    key={taxonomy.name}
                    value={selectedTaxonomy[taxonomy.name]?.toString() || ""}
                    onValueChange={(value) => {
                      setSelectedTaxonomy({
                        ...selectedTaxonomy,
                        [taxonomy.name]: parseInt(value)
                      });
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
                      <SelectValue placeholder={`Chọn ${taxonomy.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Không chọn {taxonomy.label}</SelectItem>
                      {taxonomy.terms.map((term: any) => (
                        <SelectItem key={term.id} value={term.id.toString()}>
                          {term.name} ({term.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkPublish}
                disabled={bulkActionLoading || !selectedWebsite || !selectedPostType}
                className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-initial h-9 text-xs md:text-sm"
              >
                <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                {bulkActionLoading ? "Đang đăng..." : "Đăng lên Website"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="flex-1 sm:flex-initial h-9 text-xs md:text-sm"
              >
                <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Xóa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Articles List */}
      {filteredArticles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <p className="text-muted-foreground text-lg">
            Chưa có bài viết nào
          </p>
          <Button
            onClick={() => navigate("/write-article")}
            className="mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tạo bài viết đầu tiên
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground w-12">
                    <button
                      onClick={handleToggleAll}
                      className="hover:bg-muted rounded p-1 transition-colors"
                    >
                      {selectedArticles.size === filteredArticles.length && filteredArticles.length > 0 ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Tiêu đề
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Điểm SEO
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedArticles.map((article) => {
                  const seoScore = calculateSeoScore(article);
                  const isSelected = selectedArticles.has(article.id);
                  return (
                    <tr key={article.id} className={`hover:bg-muted/30 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleArticle(article.id)}
                          className="hover:bg-muted rounded p-1 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground max-w-md truncate">
                          {article.title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(
                            article.status,
                          )}`}
                        >
                          {statusText(article.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getSeoScoreBg(
                              seoScore,
                            )} ${getSeoScoreColor(seoScore)}`}
                          >
                            {seoScore}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-muted-foreground">
                          {new Date(article.created_at).toLocaleDateString(
                            "vi-VN",
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/write-article/${article.id}`)}
                            className="hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteArticle(article.id)}
                            className="hover:bg-red-50 hover:text-red-600"
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

          {/* Mobile Cards - Enhanced Layout */}
          <div className="md:hidden space-y-3">
            {paginatedArticles.map((article) => {
              const seoScore = calculateSeoScore(article);
              const isSelected = selectedArticles.has(article.id);
              return (
                <Card key={article.id} className={`overflow-hidden ${isSelected ? 'border-blue-500 bg-blue-50' : ''}`}>
                  <CardHeader className="pb-3 px-4 pt-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleArticle(article.id)}
                        className="mt-0.5 hover:bg-muted rounded p-1 transition-colors flex-shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight line-clamp-2">
                          {article.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(
                              article.status,
                            )}`}
                          >
                            {statusText(article.status)}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">SEO:</span>
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${getSeoScoreBg(
                                seoScore,
                              )} ${getSeoScoreColor(seoScore)}`}
                            >
                              {seoScore}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {new Date(article.created_at).toLocaleDateString(
                          "vi-VN",
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/write-article/${article.id}`)}
                          className="hover:bg-blue-50 hover:text-blue-600 h-8 w-8 p-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteArticle(article.id)}
                          className="hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination - Responsive */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-border pt-4 mt-4 md:mt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs md:text-sm text-muted-foreground">
                  Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredArticles.length)} trong số {filteredArticles.length} bài viết
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0 hidden sm:flex"
                    title="Trang đầu"
                  >
                    «
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {/* Windowed page numbers - hidden on mobile */}
                  <div className="hidden sm:flex items-center gap-1">
                    {renderPageButtons(totalPages, currentPage, setCurrentPage)}
                  </div>

                  {/* Compact current/total for mobile */}
                  <div className="sm:hidden text-sm px-2 font-medium">
                    {currentPage}/{totalPages}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                    title="Trang tiếp"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0 hidden sm:flex"
                    title="Trang cuối"
                  >
                    »
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
