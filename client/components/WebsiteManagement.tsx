import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Globe, CheckCircle2, XCircle, Loader2, RefreshCw, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { buildApiUrl } from "@/lib/api";
import PostTypeSelectorModal from "./PostTypeSelectorModal";

interface Website {
  id: number;
  name: string;
  url: string;
  api_token: string;
  is_active: boolean;
  last_sync: string | null;
  created_at: string;
  knowledge?: string | null;
}

interface PostType {
  name: string;
  label: string;
  singular: string;
  description?: string;
  count: number;
  hierarchical: boolean;
  has_archive: boolean;
}

export default function WebsiteManagement() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncingWebsiteId, setSyncingWebsiteId] = useState<number | null>(null);
  
  // Post type selector state
  const [postTypeSelectorOpen, setPostTypeSelectorOpen] = useState(false);
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [loadingPostTypes, setLoadingPostTypes] = useState(false);
  const [selectedWebsiteForSync, setSelectedWebsiteForSync] = useState<Website | null>(null);

  // Knowledge modal state
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [selectedWebsiteForKnowledge, setSelectedWebsiteForKnowledge] = useState<Website | null>(null);
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [savingKnowledge, setSavingKnowledge] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    apiToken: "",
  });

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại");
        return;
      }

      const response = await fetch(buildApiUrl("/api/websites"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setWebsites(data.data || []);
      } else {
        toast.error(data.message || "Không thể tải danh sách website");
      }
    } catch (error) {
      console.error("Failed to fetch websites:", error);
      toast.error("Không thể tải danh sách website");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.url || !formData.apiToken) {
      toast.error("Vui lòng nhập URL và API Token");
      return;
    }

    try {
      setTesting(true);
      const token = localStorage.getItem("authToken");
      
      console.log("Testing connection with:", {
        url: formData.url,
        apiToken: formData.apiToken.substring(0, 10) + "...",
        hasToken: !!token
      });
      
      const apiUrl = buildApiUrl("/api/websites/test");
      console.log("API URL:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: formData.url,
          apiToken: formData.apiToken,
        }),
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);
      
      if (data.success) {
        toast.success("Kết nối thành công! Plugin đang hoạt động");
      } else {
        toast.error(data.message || "Không thể kết nối. Kiểm tra URL và API Token");
      }
    } catch (error) {
      console.error("Test connection failed:", error);
      toast.error("Không thể kiểm tra kết nối");
    } finally {
      setTesting(false);
    }
  };

  const handleAddWebsite = async () => {
    if (!formData.name || !formData.url || !formData.apiToken) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("authToken");
      
      const response = await fetch(buildApiUrl("/api/websites"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          url: formData.url,
          apiToken: formData.apiToken,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Website đã được thêm thành công");
        setIsAddModalOpen(false);
        setFormData({ name: "", url: "", apiToken: "" });
        fetchWebsites();
      } else {
        toast.error(data.message || "Không thể thêm website");
      }
    } catch (error) {
      console.error("Add website failed:", error);
      toast.error("Không thể thêm website");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWebsite = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa website này?")) return;

    try {
      const token = localStorage.getItem("authToken");
      
      const response = await fetch(buildApiUrl(`/api/websites/${id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Website đã được xóa");
        fetchWebsites();
      } else {
        toast.error(data.message || "Không thể xóa website");
      }
    } catch (error) {
      console.error("Delete website failed:", error);
      toast.error("Không thể xóa website");
    }
  };

  const handleSyncPosts = async (website: Website) => {
    try {
      // First, fetch available post types
      setSelectedWebsiteForSync(website);
      setLoadingPostTypes(true);
      setPostTypeSelectorOpen(true);

      const token = localStorage.getItem("authToken");
      const response = await fetch(buildApiUrl(`/api/websites/${website.id}/post-types`), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setPostTypes(data.data || []);
      } else {
        toast.error("Không thể tải danh sách loại nội dung");
        setPostTypeSelectorOpen(false);
      }
    } catch (error) {
      console.error("Fetch post types failed:", error);
      toast.error("Không thể tải danh sách loại nội dung");
      setPostTypeSelectorOpen(false);
    } finally {
      setLoadingPostTypes(false);
    }
  };

  const handleConfirmSync = async (postType: string) => {
    if (!selectedWebsiteForSync) return;

    try {
      setSyncingWebsiteId(selectedWebsiteForSync.id);
      setPostTypeSelectorOpen(false);
      
      const token = localStorage.getItem("authToken");
      const response = await fetch(buildApiUrl(`/api/websites/${selectedWebsiteForSync.id}/sync`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ post_type: postType }),
      });

      const data = await response.json();
      if (data.success) {
        const postTypeLabel = postTypes.find(pt => pt.name === postType)?.label || postType;
        toast.success(
          `Đồng bộ ${postTypeLabel} thành công! ${data.data.created} bài mới, ${data.data.updated} bài cập nhật`
        );
        fetchWebsites();
      } else {
        toast.error(data.message || "Không thể đồng bộ bài viết");
      }
    } catch (error) {
      console.error("Sync posts failed:", error);
      toast.error("Không thể đồng bộ bài viết");
    } finally {
      setSyncingWebsiteId(null);
      setSelectedWebsiteForSync(null);
    }
  };

  const handleOpenKnowledgeModal = (website: Website) => {
    setSelectedWebsiteForKnowledge(website);
    setKnowledgeContent(website.knowledge || "");
    setIsKnowledgeModalOpen(true);
  };

  const handleSaveKnowledge = async () => {
    if (!selectedWebsiteForKnowledge) return;

    try {
      setSavingKnowledge(true);
      const token = localStorage.getItem("authToken");
      
      const response = await fetch(
        buildApiUrl(`/api/websites/${selectedWebsiteForKnowledge.id}/knowledge`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ knowledge: knowledgeContent }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Đã lưu kiến thức website thành công");
        setIsKnowledgeModalOpen(false);
        fetchWebsites(); // Refresh list
      } else {
        toast.error(data.message || "Không thể lưu kiến thức");
      }
    } catch (error) {
      console.error("Save knowledge failed:", error);
      toast.error("Không thể lưu kiến thức");
    } finally {
      setSavingKnowledge(false);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            Quản lý Website
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Kết nối các website WordPress với VolxAI để đăng bài tự động
          </p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Thêm Website
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Thêm Website Mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin website WordPress đã cài đặt plugin Article Writer
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên Website</Label>
                <Input
                  id="name"
                  placeholder="Ví dụ: Blog Cá Nhân"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL Website</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  URL đầy đủ của website WordPress (có https://)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiToken">API Token</Label>
                <Input
                  id="apiToken"
                  type="password"
                  placeholder="aw-xxxxxxxxxxxx"
                  value={formData.apiToken}
                  onChange={(e) =>
                    setFormData({ ...formData, apiToken: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  API Token từ plugin Article Writer trên WordPress
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing || !formData.url || !formData.apiToken}
                  className="flex-1"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang kiểm tra...
                    </>
                  ) : (
                    "Kiểm tra kết nối"
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setFormData({ name: "", url: "", apiToken: "" });
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                onClick={handleAddWebsite}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang thêm...
                  </>
                ) : (
                  "Thêm Website"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Instructions Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Hướng dẫn kết nối
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Cài đặt plugin <strong>Article Writer</strong> trên website WordPress của bạn</p>
          <p>2. Vào <strong>Settings → Article Writer</strong> để tạo API Token</p>
          <p>3. Copy API Token và thêm vào đây để kết nối</p>
          <p>4. Sau khi kết nối, bạn có thể đăng bài tự động từ VolxAI lên WordPress</p>
        </CardContent>
      </Card>

      {/* Websites List */}
      {websites.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Chưa có website nào
          </h2>
          <p className="text-muted-foreground mb-4">
            Thêm website WordPress đầu tiên để bắt đầu đăng bài tự động
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm Website
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {websites.map((website) => (
            <Card key={website.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate flex items-center gap-2">
                      <Globe className="w-5 h-5 flex-shrink-0" />
                      {website.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {website.url}
                    </p>
                  </div>
                  {website.is_active ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <span className={website.is_active ? "text-green-600 font-medium" : "text-red-600"}>
                      {website.is_active ? "Hoạt động" : "Tạm dừng"}
                    </span>
                  </div>
                  {website.last_sync && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sync cuối:</span>
                      <span className="text-foreground">
                        {new Date(website.last_sync).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncPosts(website)}
                      disabled={syncingWebsiteId === website.id}
                      className="flex-1"
                    >
                      {syncingWebsiteId === website.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Đang sync...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Đồng bộ
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteWebsite(website.id)}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Xóa
                    </Button>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenKnowledgeModal(website)}
                      className="w-full"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Kiến thức
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Post Type Selector Modal */}
      <PostTypeSelectorModal
        open={postTypeSelectorOpen}
        onClose={() => {
          setPostTypeSelectorOpen(false);
          setSelectedWebsiteForSync(null);
        }}
        postTypes={postTypes}
        loading={loadingPostTypes}
        onConfirm={handleConfirmSync}
        websiteName={selectedWebsiteForSync?.name || ""}
      />

      {/* Knowledge Modal */}
      <Dialog open={isKnowledgeModalOpen} onOpenChange={setIsKnowledgeModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Kiến thức Website: {selectedWebsiteForKnowledge?.name}
            </DialogTitle>
            <DialogDescription>
              Nhập kiến thức và nội dung cốt lõi của website này. AI sẽ dựa vào đây để viết các nội dung liên quan đến website.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="knowledge-content" className="text-base font-semibold">
                Nội dung kiến thức
              </Label>
              <p className="text-sm text-muted-foreground">
                Mô tả về website, lĩnh vực hoạt động, đối tượng khách hàng, phong cách viết, từ ngữ thường dùng, v.v.
              </p>
              <Textarea
                id="knowledge-content"
                placeholder={`Ví dụ:

Website: Chuyên về ẩm thực Việt Nam
Lĩnh vực: Chia sẻ công thức nấu ăn, đánh giá nhà hàng, văn hóa ẩm thực
Đối tượng: Người yêu thích nấu ăn, thích khám phá món ngon
Phong cách: Thân thiện, gần gũi, đời thường
Đặc điểm nội dung:
- Luôn có phần nguyên liệu chi tiết
- Hướng dẫn từng bước cụ thể
- Có mẹo nấu ăn hay
- Thêm câu chuyện về món ăn
- Dùng nhiều từ ngữ địa phương

Điều cần tránh:
- Không dùng từ ngữ quá học thuật
- Không viết theo kiểu sách giáo khoa
- Tránh câu văn quá dài, khó hiểu`}
                value={knowledgeContent}
                onChange={(e) => setKnowledgeContent(e.target.value)}
                className="min-h-[250px] resize-y"
              />
              <p className="text-xs text-muted-foreground">
                💡 Tip: Càng chi tiết càng tốt. AI sẽ sử dụng thông tin này để tạo nội dung phù hợp với phong cách và mục đích của website.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsKnowledgeModalOpen(false)}
              disabled={savingKnowledge}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSaveKnowledge}
              disabled={savingKnowledge}
            >
              {savingKnowledge ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu kiến thức"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
