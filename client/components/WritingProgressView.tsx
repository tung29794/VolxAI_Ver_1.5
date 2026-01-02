import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { toast } from "sonner";

interface WritingProgressViewProps {
  formData: any;
  onCancel: () => void;
  onComplete: (articleId: string) => void;
}

export default function WritingProgressView({
  formData,
  onCancel,
  onComplete,
}: WritingProgressViewProps) {
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [articleData, setArticleData] = useState<any>(null);

  // Generate article via API
  useEffect(() => {
    const generateArticle = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          toast.error("Vui lòng đăng nhập lại");
          setIsGenerating(false);
          return;
        }

        const response = await fetch(buildApiUrl("/api/ai/generate-article"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            keyword: formData.keyword,
            language: formData.language,
            outlineType: formData.outlineType,
            tone: formData.tone,
            model: formData.model,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          toast.error(error.error || "Có lỗi xảy ra khi tạo bài viết");
          setIsGenerating(false);
          return;
        }

        const data = await response.json();
        setArticleData(data);

        // Simulate typing effect with the generated content
        const generatedContent = data.content || "";
        startTypingEffect(generatedContent);
      } catch (error) {
        console.error("Error generating article:", error);
        toast.error("Có lỗi xảy ra khi tạo bài viết");
        setIsGenerating(false);
      }
    };

    generateArticle();
  }, []);

  const startTypingEffect = (fullContent: string) => {
    let currentIndex = 0;
    const typingSpeed = 5; // milliseconds per character for faster effect

    const typingInterval = setInterval(() => {
      if (currentIndex < fullContent.length) {
        setContent(fullContent.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsGenerating(false);
        setIsComplete(true);
      }
    }, typingSpeed);

    return () => clearInterval(typingInterval);
  };

  const handleContinueEditing = () => {
    if (articleData && articleData.articleId) {
      toast.success("Bài viết đã được lưu thành công!");
      onComplete(articleData.articleId);
    } else {
      toast.error("Có lỗi xảy ra khi lưu bài viết");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Đang tạo bài viết...
          </h1>
          <p className="text-lg text-muted-foreground">
            AI đang viết bài viết dựa trên từ khóa:{" "}
            <span className="font-semibold text-foreground">
              {formData.keyword}
            </span>
          </p>
        </div>
        {!isComplete && (
          <button
            onClick={onCancel}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Hủy</span>
          </button>
        )}
      </div>

      {/* Content Display Box */}
      <div className="bg-white rounded-2xl border border-border p-8 min-h-[500px] max-h-[70vh] overflow-y-auto">
        {/* Article Stats */}
        <div className="mb-8 pb-6 border-b border-border flex gap-8">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              SỐ TỪ
            </p>
            <p className="text-2xl font-bold text-foreground">
              {content.split(/\s+/).filter(Boolean).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              KỲ TỬ
            </p>
            <p className="text-2xl font-bold text-foreground">
              {content.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              SỐ CẦU
            </p>
            <p className="text-2xl font-bold text-foreground">
              {content.split(/[.!?]+/).filter(Boolean).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              ĐOẠN VĂN
            </p>
            <p className="text-2xl font-bold text-foreground">
              {content.split(/\n\n+/).filter(Boolean).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              SỐ TRANG
            </p>
            <p className="text-2xl font-bold text-foreground">
              {(content.length / 3000).toFixed(2)}
            </p>
          </div>
          <div className="ml-auto pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              MODEL
            </p>
            <p className="text-sm font-semibold text-foreground">
              {formData.model}
            </p>
          </div>
        </div>

        {/* Article Content */}
        <div className="text-foreground leading-relaxed whitespace-pre-wrap">
          {content}
          {isGenerating && (
            <span className="inline-block w-2 h-6 ml-1 bg-primary animate-pulse"></span>
          )}
        </div>
      </div>

      {/* Loading or Complete State */}
      <div className="flex items-center justify-center">
        {isGenerating ? (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></div>
            </div>
            <span className="text-muted-foreground font-medium">
              Đang viết bài...
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-green-600">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-sm">✓</span>
            </div>
            <span className="font-medium">Hoàn tất viết bài</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {isComplete && (
        <div className="flex gap-3 justify-end pt-6 border-t border-border">
          <Button
            onClick={handleContinueEditing}
            className="bg-primary hover:bg-primary/90 flex items-center gap-2"
          >
            ➜ Tiếp tục chỉnh sửa bài viết
          </Button>
        </div>
      )}
    </div>
  );
}
