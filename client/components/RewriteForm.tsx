import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, FileText, Sparkles, Zap, Loader2 } from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { toast } from "sonner";
import MemoizedQuill from "@/components/MemoizedQuill";
import ReactQuill from "react-quill";

const languages = [
  { code: "vi", name: "Vietnamese" },
  { code: "en", name: "English" },
  { code: "pt", name: "Portuguese" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
];

const writingStyles = [
  "Chuyên nghiệp",
  "Thân thiện",
  "Chính thức",
  "Sáng tạo",
  "Kỹ thuật",
];

const voiceAndTones = [
  "Trung lập",
  "Hài hước",
  "Tích cực",
  "Tiêu cực",
  "Xác định",
  "Khiêm tốn",
  "Tự tin",
];

const writingMethods = [
  {
    value: "keep-headings",
    label: "Rewrite nội dung - Giữ nguyên H2, H3, H4",
  },
  {
    value: "rewrite-all",
    label: "Rewrite cả nội dung và Heading",
  },
  {
    value: "deep-rewrite",
    label: "Rewrite Deep - Tránh trùng lặp nội dung 100%",
  },
];

const creativityLevels = [
  {
    value: "low",
    label: "Thấp: Ít thay đổi nội dung",
  },
  {
    value: "medium",
    label: "Trung bình: Thay đổi độ dài và cấu trúc nội dung",
  },
  {
    value: "high",
    label: "Cao: Thay đổi phong cách, cấu trúc và độ dài",
  },
];

interface AIModel {
  id: number;
  display_name: string;
  provider: string;
  model_id: string;
  description: string;
  is_active: boolean;
  display_order: number;
  max_tokens: number;
  cost_multiplier: string;
}

interface Website {
  id: number;
  name: string;
  url: string;
  knowledge?: string | null;
  is_active: boolean;
}

type RewriteMode = "paragraph" | "keywords" | "url" | "news";

interface RewriteFormProps {
  onBack?: () => void;
}

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ["bold", "italic", "underline", "strike"],
    ["blockquote", "code-block"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "image"],
    ["clean"],
  ],
};

export default function RewriteForm({ onBack }: RewriteFormProps) {
  const [rewriteMode, setRewriteMode] = useState<RewriteMode>("paragraph");
  const [models, setModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loadingWebsites, setLoadingWebsites] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Quill refs
  const paragraphQuillRef = useRef<ReactQuill>(null);
  const keywordsQuillRef = useRef<ReactQuill>(null);
  const newsQuillRef = useRef<ReactQuill>(null);

  // Common form data
  const [commonData, setCommonData] = useState({
    language: "vi",
    model: "",
    websiteId: "none",
    autoInsertImages: false,
  });

  // Mode 1: Paragraph Rewrite
  const [paragraphData, setParagraphData] = useState({
    content: "",
    writingStyle: "Chuyên nghiệp",
  });

  // Mode 2: Keywords Rewrite
  const [keywordsData, setKeywordsData] = useState({
    content: "", // Article content to rewrite
    keywords: "", // Format: main keyword, sub keyword, sub keyword
    voiceAndTone: "Trung lập",
    writingMethod: "keep-headings",
  });

  // Mode 3: URL Rewrite (same as keywords)
  const [urlData, setUrlData] = useState({
    url: "",
    keywords: "",
    voiceAndTone: "Trung lập",
    writingMethod: "keep-headings",
  });

  // Mode 4: News Rewrite
  const [newsData, setNewsData] = useState({
    content: "",
    creativityLevel: "medium",
  });

  // Fetch models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(buildApiUrl("/api/models"));
        const data = await response.json();
        if (data.success && data.models.length > 0) {
          setModels(data.models);
          setCommonData((prev) => ({
            ...prev,
            model: data.models[0].model_id,
          }));
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        toast.error("Lỗi khi tải danh sách model");
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  // Fetch websites
  useEffect(() => {
    const fetchWebsites = async () => {
      try {
        setLoadingWebsites(true);
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
      } finally {
        setLoadingWebsites(false);
      }
    };

    fetchWebsites();
  }, []);

  // Validate and submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commonData.model) {
      toast.error("Vui lòng chọn model AI");
      return;
    }

    try {
      setIsLoading(true);

      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập");
        return;
      }

      let mode = rewriteMode;
      let payload: any = {
        mode: mode,
        model: commonData.model,
        language: commonData.language,
        autoInsertImages: commonData.autoInsertImages,
      };

      // Add website knowledge if selected (ignore "none" value)
      if (commonData.websiteId && commonData.websiteId !== "none") {
        const website = websites.find(
          (w) => w.id === parseInt(commonData.websiteId),
        );
        if (website?.knowledge) {
          payload.websiteKnowledge = website.knowledge;
        }
      }

      switch (rewriteMode) {
        case "paragraph":
          if (!paragraphData.content.trim()) {
            toast.error("Vui lòng nhập hoặc tải lên nội dung đoạn văn");
            return;
          }
          payload = {
            ...payload,
            content: paragraphData.content,
            writingStyle: paragraphData.writingStyle,
          };
          break;

        case "keywords":
          if (!keywordsData.content.trim()) {
            toast.error("Vui lòng nhập hoặc dán nội dung bài viết");
            return;
          }
          if (!keywordsData.keywords.trim()) {
            toast.error("Vui lòng nhập từ khóa");
            return;
          }
          payload = {
            ...payload,
            content: keywordsData.content,
            keywords: keywordsData.keywords,
            voiceAndTone: keywordsData.voiceAndTone,
            writingMethod: keywordsData.writingMethod,
          };
          break;

        case "url":
          if (!urlData.url.trim()) {
            toast.error("Vui lòng nhập URL");
            return;
          }
          if (!urlData.keywords.trim()) {
            toast.error("Vui lòng nhập từ khóa");
            return;
          }
          payload = {
            ...payload,
            url: urlData.url,
            keywords: urlData.keywords,
            voiceAndTone: urlData.voiceAndTone,
            writingMethod: urlData.writingMethod,
          };
          break;

        case "news":
          if (!newsData.content.trim()) {
            toast.error("Vui lòng nhập hoặc tải lên nội dung tin tức");
            return;
          }
          payload = {
            ...payload,
            content: newsData.content,
            creativityLevel: newsData.creativityLevel,
          };
          break;
      }

      const apiUrl = buildApiUrl("/api/ai/rewrite");
      console.log("📤 Submitting rewrite request:", {
        mode: rewriteMode,
        apiUrl,
        payloadKeys: Object.keys(payload),
      });

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log("📥 Rewrite response:", {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Rewrite API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(
          errorData.error ||
            errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (data.success) {
        toast.success("Bài viết đã được viết lại thành công!");
        // TODO: Handle the rewritten content - show it or redirect to editor
        if (data.articleId) {
          window.location.href = `/article/${data.articleId}`;
        }
      } else {
        toast.error(data.message || "Lỗi khi viết lại bài viết");
      }
    } catch (error) {
      console.error("Error submitting rewrite form:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Lỗi khi gửi yêu cầu";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const modeOptions = [
    {
      id: "paragraph" as RewriteMode,
      label: "Viết lại đoạn văn",
      icon: FileText,
      description: "Viết lại nội dung đoạn văn hoặc tải lên file",
    },
    {
      id: "keywords" as RewriteMode,
      label: "Viết lại bài viết theo từ khoá",
      icon: Sparkles,
      description: "Viết lại bài viết dựa trên từ khoá được chỉ định",
    },
    {
      id: "url" as RewriteMode,
      label: "Viết lại URL theo từ khoá",
      icon: Zap,
      description: "Tải URL và viết lại dựa trên từ khoá",
    },
    {
      id: "news" as RewriteMode,
      label: "Viết lại tin tức",
      icon: FileText,
      description: "Viết lại nội dung tin tức với tùy chỉnh sáng tạo",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="font-medium">Quay lại</span>
      </button>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">
          Viết lại bài viết
        </h1>
        <p className="text-lg text-muted-foreground">
          Chọn phương pháp viết lại phù hợp với nhu cầu của bạn
        </p>
      </div>

      {/* Mode Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => setRewriteMode(option.id)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                rewriteMode === option.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Icon className="w-6 h-6 text-primary mb-2" />
              <h3 className="font-semibold text-foreground mb-1">
                {option.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Common Options */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Tùy chọn chung
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language Selection */}
            <div className="space-y-2">
              <Label htmlFor="language">Ngôn ngữ viết</Label>
              <Select
                value={commonData.language}
                onValueChange={(value) =>
                  setCommonData((prev) => ({ ...prev, language: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">Chọn Model</Label>
              <Select
                value={commonData.model}
                onValueChange={(value) =>
                  setCommonData((prev) => ({ ...prev, model: value }))
                }
                disabled={loadingModels}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingModels ? "Đang tải..." : "Chọn model"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.model_id} value={model.model_id}>
                      {model.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Website Knowledge */}
            <div className="space-y-2">
              <Label htmlFor="website">Kiến thức Website (Tùy chọn)</Label>
              <Select
                value={commonData.websiteId}
                onValueChange={(value) =>
                  setCommonData((prev) => ({ ...prev, websiteId: value }))
                }
                disabled={loadingWebsites}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn website" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không sử dụng</SelectItem>
                  {websites.map((website) => (
                    <SelectItem key={website.id} value={website.id.toString()}>
                      {website.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto Insert Images */}
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={commonData.autoInsertImages}
                  onChange={(e) =>
                    setCommonData((prev) => ({
                      ...prev,
                      autoInsertImages: e.target.checked,
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Chèn ảnh tự động</span>
              </label>
            </div>
          </div>
        </div>

        {/* Mode-Specific Content */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {rewriteMode === "paragraph" && "Nội dung đoạn văn"}
            {rewriteMode === "keywords" && "Bài viết, từ khóa và tùy chọn"}
            {rewriteMode === "url" && "URL và từ khóa"}
            {rewriteMode === "news" && "Nội dung tin tức"}
          </h2>

          {/* Mode 1: Paragraph Rewrite */}
          {rewriteMode === "paragraph" && (
            <div className="space-y-4">
              {/* Writing Style */}
              <div className="space-y-2">
                <Label htmlFor="writingStyle">Phong cách viết</Label>
                <Select
                  value={paragraphData.writingStyle}
                  onValueChange={(value) =>
                    setParagraphData((prev) => ({
                      ...prev,
                      writingStyle: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {writingStyles.map((style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content Editor */}
              <div className="space-y-2">
                <Label htmlFor="content">Nội dung đoạn văn</Label>
                <div className="border rounded-md overflow-hidden">
                  <MemoizedQuill
                    quillRef={paragraphQuillRef}
                    content={paragraphData.content}
                    setContent={(value) =>
                      setParagraphData((prev) => ({
                        ...prev,
                        content: value,
                      }))
                    }
                    modules={quillModules}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Nhập hoặc dán nội dung đoạn văn tại đây...
                </p>
              </div>
            </div>
          )}

          {/* Mode 2: Keywords Rewrite */}
          {rewriteMode === "keywords" && (
            <div className="space-y-4">
              {/* Article Content Editor */}
              <div className="space-y-2">
                <Label htmlFor="keywordsContent">Nội dung bài viết</Label>
                <div className="border rounded-md overflow-hidden">
                  <MemoizedQuill
                    quillRef={keywordsQuillRef}
                    content={keywordsData.content}
                    setContent={(value) =>
                      setKeywordsData((prev) => ({
                        ...prev,
                        content: value,
                      }))
                    }
                    modules={quillModules}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Nhập hoặc dán nội dung bài viết cần viết lại...
                </p>
              </div>

              {/* Keywords Input */}
              <div className="space-y-2">
                <Label htmlFor="keywords">Từ khóa</Label>
                <Textarea
                  id="keywords"
                  placeholder="Nhập từ khóa chính, từ khóa phụ, từ khóa phụ, ..."
                  value={keywordsData.keywords}
                  onChange={(e) =>
                    setKeywordsData((prev) => ({
                      ...prev,
                      keywords: e.target.value,
                    }))
                  }
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Định dạng: từ khóa chính, từ khóa phụ, từ khóa phụ, ...
                </p>
              </div>

              {/* Voice & Tone */}
              <div className="space-y-2">
                <Label htmlFor="voiceAndTone">Giọng văn & Ngữ điệu</Label>
                <Select
                  value={keywordsData.voiceAndTone}
                  onValueChange={(value) =>
                    setKeywordsData((prev) => ({
                      ...prev,
                      voiceAndTone: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceAndTones.map((tone) => (
                      <SelectItem key={tone} value={tone}>
                        {tone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Writing Method */}
              <div className="space-y-2">
                <Label htmlFor="writingMethod">Phương pháp viết</Label>
                <Select
                  value={keywordsData.writingMethod}
                  onValueChange={(value) =>
                    setKeywordsData((prev) => ({
                      ...prev,
                      writingMethod: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {writingMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Mode 3: URL Rewrite */}
          {rewriteMode === "url" && (
            <div className="space-y-4">
              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="url">URL bài viết</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/article"
                  value={urlData.url}
                  onChange={(e) =>
                    setUrlData((prev) => ({
                      ...prev,
                      url: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Keywords Input */}
              <div className="space-y-2">
                <Label htmlFor="urlKeywords">Từ khóa</Label>
                <Textarea
                  id="urlKeywords"
                  placeholder="Nhập từ khóa chính, từ khóa phụ, từ khóa phụ, ..."
                  value={urlData.keywords}
                  onChange={(e) =>
                    setUrlData((prev) => ({
                      ...prev,
                      keywords: e.target.value,
                    }))
                  }
                  className="min-h-[100px]"
                />
              </div>

              {/* Voice & Tone */}
              <div className="space-y-2">
                <Label htmlFor="urlVoiceAndTone">Giọng văn & Ngữ điệu</Label>
                <Select
                  value={urlData.voiceAndTone}
                  onValueChange={(value) =>
                    setUrlData((prev) => ({
                      ...prev,
                      voiceAndTone: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceAndTones.map((tone) => (
                      <SelectItem key={tone} value={tone}>
                        {tone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Writing Method */}
              <div className="space-y-2">
                <Label htmlFor="urlWritingMethod">Phương pháp viết</Label>
                <Select
                  value={urlData.writingMethod}
                  onValueChange={(value) =>
                    setUrlData((prev) => ({
                      ...prev,
                      writingMethod: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {writingMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Mode 4: News Rewrite */}
          {rewriteMode === "news" && (
            <div className="space-y-4">
              {/* Creativity Level */}
              <div className="space-y-2">
                <Label htmlFor="creativityLevel">Độ sáng tạo</Label>
                <Select
                  value={newsData.creativityLevel}
                  onValueChange={(value) =>
                    setNewsData((prev) => ({
                      ...prev,
                      creativityLevel: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {creativityLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content Editor */}
              <div className="space-y-2">
                <Label htmlFor="newsContent">Nội dung tin tức</Label>
                <div className="border rounded-md overflow-hidden">
                  <MemoizedQuill
                    quillRef={newsQuillRef}
                    content={newsData.content}
                    setContent={(value) =>
                      setNewsData((prev) => ({
                        ...prev,
                        content: value,
                      }))
                    }
                    modules={quillModules}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Nhập hoặc dán nội dung tin tức tại đây...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-primary hover:bg-primary/90 h-12 text-base"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Viết lại bài viết
              </>
            )}
          </Button>
          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1 h-12 text-base"
              disabled={isLoading}
            >
              Hủy
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
