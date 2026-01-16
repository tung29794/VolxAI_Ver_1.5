import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SaveDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId?: number;
  articleData: {
    title: string;
    content: string;
    metaTitle?: string;
    metaDescription?: string;
    slug?: string;
    keywords?: string[];
    featuredImage?: string;
  };
  onSaveSuccess: () => void;
}

export default function SaveDraftModal({
  isOpen,
  onClose,
  articleId,
  articleData,
  onSaveSuccess,
}: SaveDraftModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveDraft = async () => {
    setIsSaving(true);

    try {
      const token = localStorage.getItem("authToken");
      const url = articleId
        ? buildApiUrl(`/api/articles/${articleId}`)
        : buildApiUrl("/api/articles");

      const method = articleId ? "PUT" : "POST";

      const payload = {
        title: articleData.title,
        content: articleData.content,
        meta_title: articleData.metaTitle || articleData.title,
        meta_description: articleData.metaDescription || "",
        slug: articleData.slug || "",
        keywords: articleData.keywords || [],
        featured_image: articleData.featuredImage || "",
        status: "draft", // Always save as draft
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save article");
      }

      const result = await response.json();
      
      toast.success(
        articleId
          ? "✅ Bài viết đã được cập nhật thành công"
          : "✅ Bài viết đã được lưu thành công"
      );

      onSaveSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving article:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi lưu bài viết"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {articleId ? "Cập nhật bài viết" : "Lưu bài viết"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <strong>Tiêu đề:</strong> {articleData.title || "(Chưa có tiêu đề)"}
            </p>
            <p className="mb-2">
              <strong>Nội dung:</strong>{" "}
              {articleData.content
                ? `${articleData.content.substring(0, 100)}...`
                : "(Chưa có nội dung)"}
            </p>
            <p>
              <strong>Trạng thái:</strong> Bản nháp (Draft)
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSaveDraft}
              disabled={isSaving || !articleData.title || !articleData.content}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Tạm lưu ở VolxAI.com"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
