import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
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

interface BatchSourceEntry {
  keyword: string;
  url: string;
  status?: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

interface BatchWriteBySourceProps {
  onBack: () => void;
}

export default function BatchWriteBySource({ onBack }: BatchWriteBySourceProps) {
  const navigate = useNavigate();
  const [sourceList, setSourceList] = useState("");
  const [models, setModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loadingWebsites, setLoadingWebsites] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [commonData, setCommonData] = useState({
    language: "vi",
    model: "", // Will be set when models load
    websiteId: "none",
    autoInsertImages: false,
    voiceAndTone: "Trung lập",
    writingMethod: "keep-headings",
  });

  // Fetch models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(buildApiUrl("/api/models"));
        const data = await response.json();
        console.log("📊 Models API Response:", JSON.stringify(data));
        
        if (data.success && Array.isArray(data.models) && data.models.length > 0) {
          setModels(data.models);
          console.log("🎯 Available models:", JSON.stringify(data.models.map((m: AIModel) => ({
            id: m.model_id,
            display: m.display_name
          }))));
          
          // Try to find Gemini 2.5 Flash model, otherwise use first model
          let geminiModel: AIModel | undefined;
          for (const model of data.models) {
            const displayName = (model.display_name || "").toLowerCase();
            const modelId = (model.model_id || "").toLowerCase();
            const isGemini2_5Flash = (
              displayName.includes("gemini") && 
              displayName.includes("2.5") && 
              displayName.includes("flash")
            ) || (
              modelId.includes("gemini") && 
              modelId.includes("2.5") && 
              modelId.includes("flash")
            );
            console.log(`Checking model: ${model.display_name} (${model.model_id}) - Match: ${isGemini2_5Flash}`);
            if (isGemini2_5Flash) {
              geminiModel = model;
              break;
            }
          }
          
          const selectedModel = geminiModel || data.models[0];
          const defaultModelId = selectedModel?.model_id || "";
          
          console.log("✅ Default model set to:", JSON.stringify({
            id: defaultModelId,
            name: selectedModel?.display_name,
            source: geminiModel ? "Gemini 2.5 Flash found" : "First model"
          }));
          
          if (defaultModelId) {
            setCommonData((prev) => ({
              ...prev,
              model: defaultModelId,
            }));
          }
        } else {
          console.warn("❌ Invalid models response:", data);
        }
      } catch (error) {
        console.error("❌ Error fetching models:", error);
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

  // Parse input format: keyword|url
  const parseSourceList = (text: string): BatchSourceEntry[] => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return lines.map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length === 2) {
        return {
          keyword: parts[0],
          url: parts[1],
          status: "pending" as const,
        };
      }
      return {
        keyword: parts[0] || "",
        url: parts[1] || "",
        status: "failed" as const,
        error: "Format không hợp lệ. Cần: keyword|url",
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commonData.model) {
      toast.error("Vui lòng chọn model AI");
      return;
    }

    if (!sourceList.trim()) {
      toast.error("Vui lòng nhập danh sách keyword|url");
      return;
    }

    const entries = parseSourceList(sourceList);
    console.log("📝 Parsed entries:", JSON.stringify(entries));
    
    const validEntries = entries.filter(
      (e) => e.keyword && e.url && !e.error && e.status !== "failed",
    );
    
    console.log("✅ Valid entries:", JSON.stringify(validEntries));

    if (validEntries.length === 0) {
      toast.error("Không có entries hợp lệ. Format: keyword|url");
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/login");
      return;
    }

    setIsLoading(true);

    try {
      // Get website knowledge if selected
      let websiteKnowledge = "";
      if (commonData.websiteId && commonData.websiteId !== "none") {
        const website = websites.find(
          (w) => w.id === parseInt(commonData.websiteId),
        );
        if (website?.knowledge) {
          websiteKnowledge = website.knowledge;
        }
      }

      // Create batch job via API - similar to BatchWriteByKeywords
      const sourceLines = validEntries.map((e) => `${e.keyword}|${e.url}`);
      
      console.log("📤 Sending sourceLines:", JSON.stringify(sourceLines));
      console.log("📤 Payload:", JSON.stringify({
        job_type: "batch_source",
        sources: sourceLines,
      }));

      const response = await fetch(buildApiUrl("/api/batch-jobs"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_type: "batch_source",
          sources: sourceLines, // Array of "keyword|url" format
          settings: {
            model: commonData.model,
            language: commonData.language,
            voiceAndTone: commonData.voiceAndTone,
            writingMethod: commonData.writingMethod,
            autoInsertImages: commonData.autoInsertImages,
            websiteKnowledge: websiteKnowledge,
            websiteId: commonData.websiteId !== "none" ? parseInt(commonData.websiteId) : null,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create batch job");
      }

      const result = await response.json();

      // Notify success using sonner API (string, not object)
      toast.success(
        `Đã tạo ${validEntries.length} bài viết. Hệ thống đang xử lý...`
      );

      // Navigate to batch jobs tab
      navigate("/account?tab=batch-jobs");
    } catch (error) {
      console.error("Error creating batch job:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(errorMessage || "Lỗi khi tạo batch job");
    } finally {
      setIsLoading(false);
    }
  };

  const invalidEntries = parseSourceList(sourceList).filter(
    (e) => e.error || e.status === "failed",
  );
  const validEntries = parseSourceList(sourceList).filter(
    (e) => !e.error && e.status !== "failed",
  );

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
          Viết lại bài viết từ nguồn
        </h1>
        <p className="text-lg text-muted-foreground">
          Nhập danh sách keyword|url để viết lại hàng loạt bài viết từ các
          nguồn khác nhau
        </p>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Format Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900">Định dạng nhập</h3>
                <p className="text-sm text-blue-800">
                  Nhập mỗi dòng theo định dạng:{" "}
                  <code className="bg-blue-100 px-2 py-1 rounded font-mono">
                    keyword|url
                  </code>
                </p>
                <p className="text-sm text-blue-800 font-mono">
                  Ví dụ:
                  <br />
                  máy lạnh tốt nhất 2024|https://example.com/best-ac
                  <br />
                  review laptop gaming|https://example.com/gaming-laptop
                </p>
              </div>
            </div>
          </div>

          {/* Common Options */}
          <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Tùy chọn chung
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Language Selection */}
              <div className="space-y-2">
                <Label>Ngôn ngữ viết</Label>
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
                <Label>Chọn Model</Label>
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
                <Label>Kiến thức Website (Tùy chọn)</Label>
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

          {/* Rewrite Options */}
          <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Tùy chọn viết lại
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Voice & Tone */}
              <div className="space-y-2">
                <Label>Giọng văn & Ngữ điệu</Label>
                <Select
                  value={commonData.voiceAndTone}
                  onValueChange={(value) =>
                    setCommonData((prev) => ({
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
                <Label>Phương pháp viết</Label>
                <Select
                  value={commonData.writingMethod}
                  onValueChange={(value) =>
                    setCommonData((prev) => ({
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
          </div>

          {/* Source List Input */}
          <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Danh sách keyword|url
            </h2>

            <div className="space-y-2">
              <Label htmlFor="sourceList">
                Nhập keyword|url (mỗi dòng một entry)
              </Label>
              <Textarea
                id="sourceList"
                placeholder={
                  "Ví dụ:\nmáy lạnh tốt nhất 2024|https://example.com/best-ac\nreview laptop gaming|https://example.com/gaming-laptop"
                }
                value={sourceList}
                onChange={(e) => setSourceList(e.target.value)}
                className="min-h-[250px] font-mono text-sm"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {validEntries.length} hợp lệ, {invalidEntries.length} lỗi
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isLoading || validEntries.length === 0}
              className="flex-1 bg-primary hover:bg-primary/90 h-12 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                `Viết lại ${validEntries.length} bài`
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1 h-12 text-base"
              disabled={isLoading}
            >
              Hủy
            </Button>
          </div>
        </form>
    </div>
  );
}
