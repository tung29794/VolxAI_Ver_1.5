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

  // Simulated article content - in production, this would come from the API
  const simulatedArticle = `Ngoài Thất Mitsubishi Destinatior: Đánh Giá Chi Tiết Thiết Kế Độc Phá

Ngoài Thất Mitsubishi Destinatior: Thiết Kế Có Gì Nổi Bật? Trong phần khúc xe SUV có trung, Mitsubishi Destinatior đã tạo nên nhiều ấn tượng mạnh mẽ không chỉ về khả năng vận hành tốt mà còn bởi phần ngoài thất mang đầy phong cách đột phá, hiện đại. Với kiểu dáng thế Mitsubishi Destinatior đã dùng chính phục định hình của chủ số hữu.

Trong bài viết này, chúng ta sẽ đi sâu phân tích và ngoài thất của Mitsubishi Destinatior qua từng phần, từ thiết kế đầu xe, thân xe đến đuôi xe, cũng những yếu tố khác như vật liệu, mẫu sắc, tính khí động học và góp phần không những hành toàn diện, chân thực về ngoài thất của Mitsubishi Destinatior.

Hãy cùng khám phá những điểm nổi bật của thiết kế Mitsubishi Destinatior, liệu nó có thất sự làm hài lòng những khách hàng đối hỏi cao nhất về ngoài hình hay không?

Tổng Quan Về Ngoài Thát Mitsubishi Destinatior: Thiết Kế Độc Phá

Mitsubishi Destinatior mang trong mình phong cách thiết kế hiện đại, trung thực, pha trộn giữa sự theo và sang trong. Đầu và nội bất với cấu hình iVoxuan nới thế thế theo và sơng trong. Đây là nơi dùng đánh riêng cho những ai yêu thích sự độc mới trong thiết kế xe ô tô và mong muốn có cái nhìn toàn diện, chân thực về ngoài thất của Mitsubishi Destinatior.`;

  // Typing effect simulation
  useEffect(() => {
    if (!isGenerating) return;

    let currentIndex = 0;
    const typingSpeed = 10; // milliseconds per character

    const typingInterval = setInterval(() => {
      if (currentIndex < simulatedArticle.length) {
        setContent(simulatedArticle.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsGenerating(false);
        setIsComplete(true);
      }
    }, typingSpeed);

    return () => clearInterval(typingInterval);
  }, [isGenerating]);

  const handleContinueEditing = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại");
        return;
      }

      // Generate slug from keyword
      const slug = formData.keyword
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

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
          content: content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Có lỗi xảy ra khi lưu bài viết");
        return;
      }

      const data = await response.json();
      toast.success("Bài viết đã được lưu thành công!");
      onComplete(data.articleId);
    } catch (error) {
      console.error("Error saving article:", error);
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
            AI đang viết bài viết dựa trên từ khóa: <span className="font-semibold text-foreground">{formData.keyword}</span>
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
