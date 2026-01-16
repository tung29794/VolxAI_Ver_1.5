import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Loader2, Newspaper, ArrowLeft } from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Reuse language list from WriteByKeywordForm
const languages = [
  { code: "vi", name: "Vietnamese" },
  { code: "en", name: "English" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "th", name: "Thai" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
];

interface Website {
  id: number;
  name: string;
  knowledge: string;
}

interface WriteNewsFormProps {
  onArticleGenerated: (articleId: number) => void;
  onBack?: () => void;
}

export default function WriteNewsForm({ onArticleGenerated, onBack }: WriteNewsFormProps) {
  const { toast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState("vi");
  const [model, setModel] = useState("gemini-2.5-flash"); // Default to Gemini 2.5 Flash
  const [websiteId, setWebsiteId] = useState<number | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [autoInsertImages, setAutoInsertImages] = useState(false); // NEW: Auto insert images
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  // Fetch websites for knowledge selection
  useEffect(() => {
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
        console.error("Error fetching websites:", error);
      }
    };

    fetchWebsites();
  }, []);

  const handleGenerate = async () => {
    if (!keyword.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập từ khóa",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStatusMessage("Đang tìm kiếm tin tức...");

    try {
      const response = await fetch(buildApiUrl("/api/ai/generate-news"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          keyword: keyword.trim(),
          language,
          model,
          websiteId: websiteId || undefined,
          autoInsertImages, // NEW: Send auto insert images flag
        }),
      });

      // For SSE, we should NOT check response.ok first
      // Instead, read the stream and handle errors from SSE events
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        
        // Keep last incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "progress") {
                setProgress(data.progress || 0);
                setStatusMessage(data.message || "Đang xử lý...");
              } else if (data.type === "complete") {
                setProgress(100);
                setStatusMessage("Hoàn thành!");
                
                toast({
                  title: "Thành công!",
                  description: `Đã tạo bài viết tin tức. Đã sử dụng ${data.tokensUsed} tokens.`,
                });

                // Navigate to editor
                if (data.articleId) {
                  onArticleGenerated(data.articleId);
                }
              } else if (data.type === "error") {
                throw new Error(data.message || data.details || "Generation failed");
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError, "Line:", line);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error generating news:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể tạo bài viết tin tức",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setStatusMessage("");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex items-center gap-2 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </Button>
          )}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              AI Viết Tin Tức
            </h1>
            <div className="flex items-center gap-4">
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                🔥 Mới!
              </div>
              <p className="text-base text-muted-foreground">
                AI tìm kiếm tin tức mới nhất và viết bài chuyên nghiệp
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <span>📚</span>
          Cách sử dụng
        </Button>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-2xl border border-border p-8 space-y-6">
        {/* Keyword Section */}
        <div className="space-y-3">
          <Label htmlFor="keyword" className="text-base font-semibold">
            Từ khóa tin tức <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-muted-foreground -mt-2">
            Nhập chủ đề tin tức bạn muốn viết về
          </p>
          <Input
            id="keyword"
            placeholder="Ví dụ: Apple ra mắt iPhone 16, Bão Yagi ảnh hưởng Việt Nam..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={isGenerating}
            className="text-base p-3"
          />
        </div>

      {/* Language Selection */}
      <div className="space-y-3">
        <Label htmlFor="language" className="text-base font-semibold flex items-center gap-2">
          <span>🌍</span>
          Ngôn ngữ bài viết
        </Label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isGenerating}
          className="w-full p-3 border border-border rounded-lg bg-white focus:outline-none focus:border-primary"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Model Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="model" className="text-base font-semibold">
            Chọn Model AI
          </Label>
        </div>
        <select
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={isGenerating}
          className="w-full p-3 border border-border rounded-lg bg-white focus:outline-none focus:border-primary"
        >
          <option value="gemini-2.5-flash">Gemini 2.5 Flash (Khuyên dùng) ⚡ - 3.0x</option>
          <option value="gpt-3.5-turbo">GPT 4.1 MINI - 2.0x</option>
          <option value="gpt-4o-mini">GPT 4o MINI - 3.0x</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Gemini được khuyên dùng cho tin tức vì có khả năng tìm kiếm Google Search
        </p>
      </div>

      {/* Website Knowledge (Optional) */}
      <div className="space-y-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-center justify-between">
          <Label htmlFor="website" className="text-base font-semibold">
            📚 Kiến thức Website (Tùy chọn)
          </Label>
        </div>
        <select
          id="website"
          value={websiteId || ""}
          onChange={(e) => setWebsiteId(e.target.value ? Number(e.target.value) : null)}
          disabled={isGenerating}
          className="w-full p-3 border border-border rounded-lg bg-white focus:outline-none focus:border-primary"
        >
          <option value="">Không sử dụng kiến thức website</option>
          {websites.map((website) => (
            <option key={website.id} value={website.id}>
              {website.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Chọn website để AI viết theo phong cách và ngữ cảnh riêng của website đó
        </p>
      </div>

      {/* Auto Insert Images Checkbox */}
      <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoInsertImages}
            onChange={(e) => setAutoInsertImages(e.target.checked)}
            className="mt-1 w-4 h-4"
            disabled={isGenerating}
          />
          <div className="flex-1">
            <span className="font-semibold text-sm">🖼️ Tự động tìm và chèn ảnh cho mỗi heading</span>
            <p className="text-xs text-muted-foreground mt-1">
              AI sẽ tự động tìm và chèn 1 hình ảnh sau mỗi heading (H2, H3) trong bài tin tức.
            </p>
          </div>
        </label>
      </div>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{statusMessage}</span>
            <span className="text-blue-700 font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full h-12 text-lg font-semibold"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Đang tạo tin tức...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5 mr-2" />
            AI Write
          </>
        )}
      </Button>
      </div>
      {/* End of bg-white wrapper */}
    </div>
  );
}
