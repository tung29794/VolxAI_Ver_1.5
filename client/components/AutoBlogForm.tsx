import { useState, useEffect } from "react";
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
  AlertCircle,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
  Loader2,
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

const personas = [
  "Chuyên gia / Expert",
  "Hài hước / Humorous",
  "Đồng cảm / Empathetic",
  "Chuyên nghiệp / Professional",
  "Thân thiện / Friendly",
  "Trung lập / Neutral",
];

const contentLengths = [
  { value: "short", label: "Ngắn (500-800 từ)" },
  { value: "medium", label: "Trung bình (800-1500 từ)" },
  { value: "long", label: "Dài (1500-2500 từ)" },
  { value: "extra-long", label: "Rất dài (2500+ từ)" },
];

interface AIModel {
  id: number;
  display_name: string;
  model_id: string;
}

interface Website {
  id: number;
  name: string;
  url: string;
}

interface AutoBlogConfig {
  // Sources & Ideas
  keywordPool: string;
  trendMonitoring: boolean;
  competitorAnalysis: boolean;
  competitorUrls: string;

  // Content Engine
  persona: string;
  contentLength: string;
  language: string;
  humanLike: boolean;
  includeRhetoricalQuestions: boolean;
  includeRealExamples: boolean;

  // SEO & Multimedia
  autoGenerateMetadata: boolean;
  internalLinking: boolean;
  externalLinking: boolean;
  selectedWebsiteForInternalLinks: string;

  // Workflow
  articleStatus: "draft" | "publish";
  scheduling: boolean;
  schedulingMode: "golden-hours" | "spread-week";
  scheduleTime: string;
  autoSelectTaxonomy: boolean;
  selectedWebsiteForPublishing: string;

  // Quality Control
  plagiarismCheck: boolean;
  factCheck: boolean;
  aiDetectionFilter: boolean;

  // Common
  model: string;
  autoStart: boolean;
  batchFrequency: "daily" | "weekly" | "monthly";
}

interface AutoBlogFormProps {
  onBack?: () => void;
}

export default function AutoBlogForm({ onBack }: AutoBlogFormProps) {
  const [config, setConfig] = useState<AutoBlogConfig>({
    keywordPool: "",
    trendMonitoring: false,
    competitorAnalysis: false,
    competitorUrls: "",
    persona: "Chuyên gia / Expert",
    contentLength: "medium",
    language: "vi",
    humanLike: true,
    includeRhetoricalQuestions: true,
    includeRealExamples: true,
    autoGenerateMetadata: true,
    internalLinking: true,
    externalLinking: false,
    selectedWebsiteForInternalLinks: "",
    articleStatus: "draft",
    scheduling: false,
    schedulingMode: "golden-hours",
    scheduleTime: "09:00",
    autoSelectTaxonomy: true,
    selectedWebsiteForPublishing: "",
    plagiarismCheck: false,
    factCheck: false,
    aiDetectionFilter: true,
    model: "",
    autoStart: false,
    batchFrequency: "weekly",
  });

  const [models, setModels] = useState<AIModel[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingWebsites, setLoadingWebsites] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    sources: true,
    content: true,
    seo: false,
    workflow: false,
    quality: false,
  });

  // Fetch models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(buildApiUrl("/api/models"));
        const data = await response.json();
        if (data.success && data.models.length > 0) {
          setModels(data.models);
          setConfig((prev) => ({
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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!config.keywordPool.trim()) {
      toast.error("Vui lòng nhập danh sách từ khóa");
      return;
    }

    if (!config.model) {
      toast.error("Vui lòng chọn model AI");
      return;
    }

    if (config.internalLinking && !config.selectedWebsiteForInternalLinks) {
      toast.error("Vui lòng chọn website để lấy bài viết liên quan");
      return;
    }

    if (config.articleStatus === "publish" && !config.selectedWebsiteForPublishing) {
      toast.error("Vui lòng chọn website để đăng bài");
      return;
    }

    setIsSaving(true);
    const token = localStorage.getItem("authToken");

    try {
      // This would be the actual API call to save auto-blog configuration
      const response = await fetch(buildApiUrl("/api/autoblog/config"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save configuration");
      }

      const data = await response.json();

      if (data.success) {
        toast.success("Cấu hình tự động viết blog đã được lưu!");
        if (config.autoStart) {
          toast.success("Đã bắt đầu quy trình tự động viết blog!");
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Lỗi khi lưu cấu hình";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const SectionHeader = ({
    title,
    section,
  }: {
    title: string;
    section: keyof typeof expandedSections;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg border border-blue-200 transition-all"
    >
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {expandedSections[section] ? (
        <ChevronUp className="w-5 h-5 text-blue-600" />
      ) : (
        <ChevronDown className="w-5 h-5 text-blue-600" />
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-medium">Quay lại</span>
        </button>
      )}

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">
          Tự động viết blog
        </h1>
        <p className="text-lg text-muted-foreground">
          Thiết lập hệ thống AI tự động tạo và đăng bài viết theo quy trình của bạn
        </p>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* ===== SECTION 1: SOURCES & IDEAS ===== */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <SectionHeader
            title="1️⃣ Thiết lập Nguồn và Ý tưởng"
            section="sources"
          />

          {expandedSections.sources && (
            <div className="p-6 space-y-4 border-t border-border">
              {/* Keyword Pool */}
              <div className="space-y-2">
                <Label htmlFor="keywordPool">Danh sách từ khóa SEO</Label>
                <Textarea
                  id="keywordPool"
                  placeholder="Nhập danh sách từ khóa SEO mục tiêu (mỗi từ khóa trên một dòng)"
                  value={config.keywordPool}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      keywordPool: e.target.value,
                    }))
                  }
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Ví dụ: AI tiếp thị, Machine Learning, Tối ưu hóa SEO
                </p>
              </div>

              {/* Trend Monitoring */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.trendMonitoring}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        trendMonitoring: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="font-medium">
                    Theo dõi xu hướng (Google Trends / RSS)
                  </span>
                </label>
                {config.trendMonitoring && (
                  <div className="ml-7 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900">
                      ✓ AI sẽ tự đề xuất chủ đề "nóng" từ Google Trends
                    </p>
                  </div>
                )}
              </div>

              {/* Competitor Analysis */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.competitorAnalysis}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        competitorAnalysis: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="font-medium">
                    Phân tích đối thủ cạnh tranh
                  </span>
                </label>
                {config.competitorAnalysis && (
                  <div className="ml-7 space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-900 mb-2">
                        ✓ AI sẽ đọc bài viết top của đối thủ và viết lại tốt hơn
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="competitorUrls">
                        Danh sách URL website cạnh tranh
                      </Label>
                      <Textarea
                        id="competitorUrls"
                        placeholder="Nhập URL của website đối thủ cạnh tranh (mỗi URL trên một dòng)&#10;Ví dụ:&#10;https://competitor1.com&#10;https://competitor2.com&#10;https://competitor3.com"
                        value={config.competitorUrls}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            competitorUrls: e.target.value,
                          }))
                        }
                        className="min-h-[100px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Nhập các URL của website đối thủ để AI phân tích chiến lược nội dung của họ
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===== SECTION 2: CONTENT ENGINE ===== */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <SectionHeader
            title="2️⃣ Thiết lập Cấu hình Nội dung"
            section="content"
          />

          {expandedSections.content && (
            <div className="p-6 space-y-4 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Persona */}
                <div className="space-y-2">
                  <Label htmlFor="persona">Persona & Giọng văn</Label>
                  <Select
                    value={config.persona}
                    onValueChange={(value) =>
                      setConfig((prev) => ({ ...prev, persona: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {personas.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Content Length */}
                <div className="space-y-2">
                  <Label htmlFor="contentLength">Độ dài bài viết</Label>
                  <Select
                    value={config.contentLength}
                    onValueChange={(value) =>
                      setConfig((prev) => ({ ...prev, contentLength: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contentLengths.map((len) => (
                        <SelectItem key={len.value} value={len.value}>
                          {len.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label htmlFor="language">Ngôn ngữ</Label>
                  <Select
                    value={config.language}
                    onValueChange={(value) =>
                      setConfig((prev) => ({ ...prev, language: value }))
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

                {/* Model */}
                <div className="space-y-2">
                  <Label htmlFor="model">Chọn AI Model</Label>
                  <Select
                    value={config.model}
                    onValueChange={(value) =>
                      setConfig((prev) => ({ ...prev, model: value }))
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
              </div>

              {/* Human-like Settings */}
              <div className="space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.humanLike}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        humanLike: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="font-medium">Chế độ "Human-like"</span>
                </label>

                {config.humanLike && (
                  <div className="ml-7 space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.includeRhetoricalQuestions}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            includeRhetoricalQuestions: e.target.checked,
                          }))
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        Chèn câu hỏi tu từ để tăng sự tương tác
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.includeRealExamples}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            includeRealExamples: e.target.checked,
                          }))
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        Thêm ví dụ thực tế và trải nghiệm
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===== SECTION 3: SEO & MULTIMEDIA ===== */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <SectionHeader title="3️⃣ Tối ưu hóa SEO & Đa phương tiện" section="seo" />

          {expandedSections.seo && (
            <div className="p-6 space-y-4 border-t border-border">
              {/* Auto-generate Metadata */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoGenerateMetadata}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        autoGenerateMetadata: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="font-medium">
                    Tự động tạo Title Tag & Meta Description
                  </span>
                </label>
                {config.autoGenerateMetadata && (
                  <div className="ml-7 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-900">
                      ✓ Sẽ tự generate SEO title và meta description chuẩn độ dài
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Internal Linking */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.internalLinking}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          internalLinking: e.target.checked,
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <span className="font-medium">Internal Linking tự động</span>
                  </label>
                  {config.internalLinking && (
                    <div className="ml-7 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Chọn website để tìm bài viết liên quan:
                      </p>
                      <Select
                        value={config.selectedWebsiteForInternalLinks}
                        onValueChange={(value) =>
                          setConfig((prev) => ({
                            ...prev,
                            selectedWebsiteForInternalLinks: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn website..." />
                        </SelectTrigger>
                        <SelectContent>
                          {websites.map((website) => (
                            <SelectItem key={website.id} value={website.id.toString()}>
                              {website.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* External Linking */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.externalLinking}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          externalLinking: e.target.checked,
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <span className="font-medium">
                      External Linking (Wikipedia, báo lớn...)
                    </span>
                  </label>
                  {config.externalLinking && (
                    <div className="ml-7 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-900">
                        ✓ Sẽ tự động chèn link đến các nguồn uy tín
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== SECTION 4: WORKFLOW ===== */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <SectionHeader
            title="4️⃣ Thiết lập Quy trình Đăng bài"
            section="workflow"
          />

          {expandedSections.workflow && (
            <div className="p-6 space-y-4 border-t border-border">
              {/* Article Status */}
              <div className="space-y-2">
                <Label>Trạng thái bài viết sau khi tạo</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        articleStatus: "draft",
                      }))
                    }
                    className={`p-3 rounded-lg border-2 transition ${
                      config.articleStatus === "draft"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-medium">Bản nháp</div>
                    <div className="text-xs text-muted-foreground">
                      Để người duyệt lại
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        articleStatus: "publish",
                      }))
                    }
                    className={`p-3 rounded-lg border-2 transition ${
                      config.articleStatus === "publish"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-medium">Đăng ngay</div>
                    <div className="text-xs text-muted-foreground">
                      Tự động đăng lên website
                    </div>
                  </button>
                </div>
              </div>

              {/* Scheduling */}
              {config.articleStatus === "publish" && (
                <>
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.scheduling}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            scheduling: e.target.checked,
                          }))
                        }
                        className="w-4 h-4"
                      />
                      <span className="font-medium">
                        Lập lịch đăng bài tự động
                      </span>
                    </label>

                    {config.scheduling && (
                      <div className="ml-7 space-y-3">
                        <div>
                          <Label className="mb-2 block text-sm">
                            Chế độ lịch trình
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  schedulingMode: "golden-hours",
                                }))
                              }
                              className={`p-2 rounded border-2 text-sm transition ${
                                config.schedulingMode === "golden-hours"
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-border hover:border-blue-300"
                              }`}
                            >
                              Khung giờ vàng
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  schedulingMode: "spread-week",
                                }))
                              }
                              className={`p-2 rounded border-2 text-sm transition ${
                                config.schedulingMode === "spread-week"
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-border hover:border-blue-300"
                              }`}
                            >
                              Rải đều trong tuần
                            </button>
                          </div>
                        </div>

                        {config.schedulingMode === "golden-hours" && (
                          <div>
                            <Label htmlFor="scheduleTime" className="text-sm">
                              Giờ đăng bài
                            </Label>
                            <input
                              type="time"
                              id="scheduleTime"
                              value={config.scheduleTime}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  scheduleTime: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-border rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Website for Publishing */}
                  <div className="space-y-2">
                    <Label htmlFor="publishWebsite">
                      Chọn website để đăng bài
                    </Label>
                    <Select
                      value={config.selectedWebsiteForPublishing}
                      onValueChange={(value) =>
                        setConfig((prev) => ({
                          ...prev,
                          selectedWebsiteForPublishing: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn website..." />
                      </SelectTrigger>
                      <SelectContent>
                        {websites.map((website) => (
                          <SelectItem key={website.id} value={website.id.toString()}>
                            {website.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Auto-select Taxonomy */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoSelectTaxonomy}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        autoSelectTaxonomy: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="font-medium">
                    Tự động chọn Category & Tags
                  </span>
                </label>
                {config.autoSelectTaxonomy && (
                  <div className="ml-7 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-900">
                      ✓ AI sẽ tự động chọn Category và Tags phù hợp
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===== SECTION 5: QUALITY CONTROL ===== */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <SectionHeader
            title="5️⃣ Kiểm soát Chất lượng"
            section="quality"
          />

          {expandedSections.quality && (
            <div className="p-6 space-y-4 border-t border-border">
              {/* Plagiarism Check - Coming Soon */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-60">
                <div className="flex items-start justify-between">
                  <label className="flex items-center gap-3 cursor-not-allowed">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-600">
                      Plagiarism Check
                    </span>
                  </label>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-gray-500 ml-7">
                  Tích hợp API kiểm tra đạo văn trước khi đăng
                </p>
              </div>

              {/* Fact-check - Coming Soon */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-60">
                <div className="flex items-start justify-between">
                  <label className="flex items-center gap-3 cursor-not-allowed">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-600">
                      Fact-check
                    </span>
                  </label>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-gray-500 ml-7">
                  AI kiểm tra lại các số liệu và tuyên bố quan trọng
                </p>
              </div>

              {/* AI Detection Filter */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.aiDetectionFilter}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        aiDetectionFilter: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="font-medium">
                    AI Detection Filter (Tránh mùi AI)
                  </span>
                </label>
                {config.aiDetectionFilter && (
                  <div className="ml-7 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-900">
                      ✓ Bộ lọc để đảm bảo nội dung không quá "mùi AI"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Auto-start Configuration */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Cấu hình tự động bắt đầu
            </h3>

            <div className="space-y-2">
              <Label htmlFor="batchFrequency">Tần suất tạo bài viết</Label>
              <Select
                value={config.batchFrequency}
                onValueChange={(value) =>
                  setConfig((prev) => ({
                    ...prev,
                    batchFrequency: value as "daily" | "weekly" | "monthly",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Hàng ngày</SelectItem>
                  <SelectItem value="weekly">Hàng tuần</SelectItem>
                  <SelectItem value="monthly">Hàng tháng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoStart}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    autoStart: e.target.checked,
                  }))
                }
                className="w-4 h-4"
              />
              <span className="font-medium">
                Bắt đầu tự động viết blog ngay khi lưu cấu hình
              </span>
            </label>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-primary hover:bg-primary/90 h-12 text-base"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Lưu cấu hình tự động viết blog
              </>
            )}
          </Button>
          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1 h-12 text-base"
              disabled={isSaving}
            >
              Hủy
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
