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
import {
  ChevronLeft,
  Upload,
  FileText,
  Sparkles,
  Zap,
  Loader2,
  X,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { toast } from "sonner";

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

export default function RewriteForm({ onBack }: RewriteFormProps) {
  const [rewriteMode, setRewriteMode] = useState<RewriteMode>("paragraph");
  const [models, setModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loadingWebsites, setLoadingWebsites] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Common form data
  const [commonData, setCommonData] = useState({
    language: "vi",
    model: "",
    websiteId: "",
    autoInsertImages: false,
  });

  // Mode 1: Paragraph Rewrite
  const [paragraphData, setParagraphData] = useState({
    content: "",
    writingStyle: "Chuyên nghiệp",
  });

  // Mode 2: Keywords Rewrite
  const [keywordsData, setKeywordsData] = useState({
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
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "https://api.volxai.com"}/api/models`
        );
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

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!validTypes.includes(file.type)) {
      toast.error("Vui lòng tải lên file PDF, DOC, DOCX hoặc TXT");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("authToken");
      if (!token) return;

      setIsLoading(true);
      const response = await fetch(buildApiUrl("/api/ai/extract-text"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.text) {
        setParagraphData((prev) => ({
          ...prev,
          content: data.text,
        }));
        toast.success("Nội dung file đã được tải lên thành công");
      } else {
        toast.error(data.message || "Không thể trích xuất nội dung từ file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Lỗi khi tải lên file");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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

      let endpoint = "";
      let payload: any = {
        model: commonData.model,
        language: commonData.language,
        autoInsertImages: commonData.autoInsertImages,
      };

      // Add website knowledge if selected
      if (commonData.websiteId) {
        const website = websites.find((w) => w.id === parseInt(commonData.websiteId));
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
          endpoint = "/api/ai/rewrite-paragraph";
          payload = {
            ...payload,
            content: paragraphData.content,
            writingStyle: paragraphData.writingStyle,
          };
          break;

        case "keywords":
          if (!keywordsData.keywords.trim()) {
            toast.error("Vui lòng nhập từ khóa");
            return;
          }
          endpoint = "/api/ai/rewrite-keywords";
          payload = {
            ...payload,
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
          endpoint = "/api/ai/rewrite-url";
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
          endpoint = "/api/ai/rewrite-news";
          payload = {
            ...payload,
            content: newsData.content,
            creativityLevel: newsData.creativityLevel,
          };
          break;
      }

      const response = await fetch(buildApiUrl(endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Bài viết đã được viết lại thành công!");
        // TODO: Handle the rewritten content - show it or redirect
      } else {
        toast.error(data.message || "Lỗi khi viết lại bài viết");
      }
    } catch (error) {
      console.error("Error submitting rewrite form:", error);
      toast.error("Lỗi khi gửi yêu cầu");
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
      label: "Viết lại theo từ khoá",
      icon: Sparkles,
      description: "Viết lại dựa trên từ khoá được chỉ định",
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
        <h1 className="text-4xl font-bold text-foreground">Viết lại bài viết</h1>
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
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </button>
          );
        })}
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Common Options */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Tùy chọn chung</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language Selection */}
            <div className="space-y-2">
              <Label htmlFor="language">Ngôn ngữ viết</Label>
              <Select value={commonData.language} onValueChange={(value) =>
                setCommonData((prev) => ({ ...prev, language: value }))
              }>
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
                  <SelectValue placeholder={loadingModels ? "Đang tải..." : "Chọn model"} />
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
                  <SelectItem value="">Không sử dụng</SelectItem>
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
            {rewriteMode === "keywords" && "Từ khóa và tùy chọn"}
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

              {/* File Upload */}
              <div className="space-y-2">
                <Label>Tải lên file (PDF, DOC, DOCX, TXT)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">
                    Kéo thả file hoặc nhấp để chọn
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hỗ trợ PDF, DOC, DOCX, TXT
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />
              </div>

              {/* Content Textarea */}
              <div className="space-y-2">
                <Label htmlFor="content">Nội dung đoạn văn</Label>
                <Textarea
                  id="content"
                  placeholder="Nhập hoặc dán nội dung đoạn văn tại đây..."
                  value={paragraphData.content}
                  onChange={(e) =>
                    setParagraphData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  className="min-h-[300px]"
                />
              </div>
            </div>
          )}

          {/* Mode 2: Keywords Rewrite */}
          {rewriteMode === "keywords" && (
            <div className="space-y-4">
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

              {/* File Upload */}
              <div className="space-y-2">
                <Label>Tải lên file (PDF, DOC, DOCX, TXT)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">
                    Kéo thả file hoặc nhấp để chọn
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hỗ trợ PDF, DOC, DOCX, TXT
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />
              </div>

              {/* Content Textarea */}
              <div className="space-y-2">
                <Label htmlFor="newsContent">Nội dung tin tức</Label>
                <Textarea
                  id="newsContent"
                  placeholder="Nhập hoặc dán nội dung tin tức tại đây..."
                  value={newsData.content}
                  onChange={(e) =>
                    setNewsData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  className="min-h-[300px]"
                />
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
