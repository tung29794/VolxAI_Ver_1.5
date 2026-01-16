import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { FileText, ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { buildApiUrl } from "../lib/api";
import { toast } from "./ui/use-toast";

interface BatchWriteByKeywordsProps {
  onBack: () => void;
}

const tones = [
  "SEO Basic: Tập trung vào từ khóa - Tốt nhất khi từ khóa là dạng câu hỏi 🔥",
  "SEO Focus: Tối ưu SEO, có gắng đặt xếp hang SERP cao",
  "SEO Extend: Giải thích từ khóa + Viết thêm ý dụ, so sánh 🔥",
  "SEO Long Form: Viết dài nhất có thể - Giải thích từ khóa, mở rộng nội dung tối đa 🔥",
  "SEO NoFAQ: Tối ưu SEO, có gắng xếp hạng cao trên SERP, không có FAQ cuối bài",
  "Newspaper: Văn phong kể chuyện, tương thuật các sự kiện ⚡",
  "How To: Các bước thực hiện, giải quyết vấn đề ⚡",
  "Story: Tiểu sử, lương, gia đình, nhà cửa, số thích của một người ⚡",
  "Movie Review: Đánh giá phim: kịch bản, diễn xuất, âm thanh, hiệu ứng ⚡",
  "Year In Title: Thêm năm vào tiêu đề, Làm cho tiêu đề nổi bật trên SERP",
  "Confident: Từ tin, tập trung vào từ khóa, không có FAQ cuối bài",
  "Cooking: Tập trung vào công thức nấu ăn và cách nấu",
  "Technical (Coding, Development): Tập trung vào viết mã kèm theo ví dụ",
  "Friendly: Nói cùng tôi vượt qua máy đó AI",
  "Trang đặc biệt - Ví dụ: trang điều khoản, điều kiện, trang thông tin doanh nghiệp...",
  "Random: Chọn ngẫu nhiên giữa các tone: SEO, Confident, Year In Title, or Friendly",
];

const languages = [
  { code: "vi", name: "Vietnamese" },
  { code: "en", name: "English" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "ru", name: "Russian" },
  { code: "th", name: "Thai" },
];

function BatchWriteByKeywords({ onBack }: BatchWriteByKeywordsProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    keywordsList: "",
    model: "",
    language: "vi",
    tone: "SEO Basic: Tập trung vào từ khóa - Tốt nhất khi từ khóa là dạng câu hỏi 🔥",
    outlineLength: "medium",
    outlineOption: "no-outline",
    autoInsertImages: false,
    maxImages: 5,
    websiteId: "",
    useGoogleSearch: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [websites, setWebsites] = useState<any[]>([]);
  const [loadingWebsites, setLoadingWebsites] = useState(true);
  const [selectedWebsiteKnowledge, setSelectedWebsiteKnowledge] = useState("");
  const [customOutline, setCustomOutline] = useState("");

  // Load AI models from database
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await fetch(buildApiUrl("/api/models"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("✅ AI Models loaded:", data);
          setModels(data.models || []);
          // Set default model to first one
          if (data.models && data.models.length > 0) {
            setFormData(prev => ({ ...prev, model: data.models[0].model_id }));
          }
        } else {
          console.error("Failed to load models:", response.status);
        }
      } catch (error) {
        console.error("Error loading models:", error);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  // Load websites
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

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Websites loaded:", result);
          // API trả về { success: true, data: [...] }
          setWebsites(result.data || []);
        } else {
          console.error("Failed to load websites:", response.status);
        }
      } catch (error) {
        console.error("Error loading websites:", error);
      } finally {
        setLoadingWebsites(false);
      }
    };

    fetchWebsites();
  }, []);

  // Update website knowledge when selection changes
  useEffect(() => {
    if (formData.websiteId) {
      const website = websites.find(w => w.id === parseInt(formData.websiteId));
      setSelectedWebsiteKnowledge(website?.knowledge || "");
    } else {
      setSelectedWebsiteKnowledge("");
    }
  }, [formData.websiteId, websites]);

  // Parse keywords: mỗi dòng = 1 bài
  // Input: "từ1, từ2, từ3\nkeyword1, keyword2"
  // Output: ["từ1, từ2, từ3", "keyword1, keyword2"]
  const parseKeywordsList = (text: string): string[] => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return lines;
  };

  const handleGenerate = async () => {
    if (!formData.keywordsList.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập danh sách từ khóa",
        variant: "destructive",
      });
      return;
    }

    const keywordLines = parseKeywordsList(formData.keywordsList);
    
    if (keywordLines.length === 0) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy từ khóa hợp lệ",
        variant: "destructive",
      });
      return;
    }

    if (keywordLines.length > 100) {
      toast({
        title: "Lỗi",
        description: "Tối đa 100 bài. Bạn đã nhập " + keywordLines.length,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login");
        return;
      }

      // Create batch job via API - gửi keyword lines (mỗi line là 1 bài)
      const response = await fetch(buildApiUrl("/api/batch-jobs"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_type: "batch_keywords",
          keywords: keywordLines,  // Array các dòng: ["từ1, từ2", "từ3, từ4"]
          settings: {
            model: formData.useGoogleSearch ? "gemini-2.5-flash" : formData.model,
            language: formData.language,
            tone: formData.tone,
            length: formData.outlineLength,
            outlineOption: formData.outlineOption,
            customOutline: formData.outlineOption === "your-outline" ? customOutline : null,
            autoInsertImages: formData.autoInsertImages,
            maxImages: formData.maxImages,
            websiteId: formData.websiteId ? parseInt(formData.websiteId) : null,
            useGoogleSearch: formData.useGoogleSearch,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create batch job");
      }

      const result = await response.json();

      toast({
        title: "Thành công",
        description: `Đã tạo ${keywordLines.length} bài viết. Hệ thống đang xử lý...`,
      });

      // Navigate to batch jobs tab
      navigate("/account?tab=batch-jobs");
    } catch (error: any) {
      console.error("Error creating batch job:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo batch job",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const keywordCount = parseKeywordsList(formData.keywordsList).length;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
        disabled={isGenerating}
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium">Quay lại</span>
      </button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              AI Viết bài theo danh sách từ khóa
            </h1>
            <p className="text-lg text-muted-foreground">
              Tạo nhiều bài viết cùng lúc từ danh sách từ khóa
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-border p-8 space-y-6">
        {/* Keywords List */}
        <div className="space-y-3">
          <Label className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Danh sách từ khóa *
          </Label>
          <p className="text-sm text-muted-foreground">
            Mỗi dòng sẽ tạo một bài viết. Phân cách từ khóa bằng dấu phẩy (,)
          </p>
          <textarea
            value={formData.keywordsList}
            onChange={(e) => setFormData({ ...formData, keywordsList: e.target.value })}
            rows={10}
            placeholder="Nhập mỗi dòng là một bài viết, phân cách từ khóa bằng dấu phẩy:

máy tính macbook, macbook pro, macbook air
điện thoại iphone, iphone 15, iphone 16
du lịch đà nẵng, du lịch thành phố đà nẵng"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
            disabled={isGenerating}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Số bài viết sẽ tạo: <span className="font-semibold text-blue-600">{keywordCount}</span>
            </p>
            {keywordCount > 10 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Tạo nhiều bài sẽ mất nhiều thời gian</span>
              </div>
            )}
          </div>
          
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">💡 Hướng dẫn:</p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Mỗi dòng tạo một bài viết riêng biệt</li>
              <li>Từ khóa đầu tiên là từ khóa chính, các từ sau là từ khóa phụ</li>
              <li>Phân cách từ khóa bằng dấu phẩy (,)</li>
              <li>Ví dụ: <code className="bg-blue-100 px-1 rounded">laptop dell, dell xps, dell latitude</code></li>
            </ul>
          </div>
        </div>

        {/* Language */}
        <div className="space-y-3">
          <Label className="text-base font-semibold text-foreground flex items-center gap-2">
            <span>🌍</span>
            Ngôn ngữ của bài viết này
          </Label>
          <select
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            disabled={isGenerating}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Outline Option */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <Label className="text-base font-semibold text-foreground">
            Chọn phương án dàn ý
          </Label>
          <div className="space-y-3">
            {/* No Outline */}
            <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              <input
                type="radio"
                name="outlineOption"
                value="no-outline"
                checked={formData.outlineOption === "no-outline"}
                onChange={(e) => setFormData({ ...formData, outlineOption: e.target.value })}
                disabled={isGenerating}
                className="mt-1"
              />
              <div className="flex-1">
                <p className="font-semibold text-foreground">No Outline:</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Không cần dàn ý, viết theo từ khóa - Bài viết sẽ dài khoảng
                </p>
                {formData.outlineOption === "no-outline" && (
                  <div className="mt-2">
                    <Label className="text-sm mb-1 block">Tùy chỉnh độ dài nội dung</Label>
                    <select
                      value={formData.outlineLength}
                      onChange={(e) => setFormData({ ...formData, outlineLength: e.target.value })}
                      disabled={isGenerating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="short">Short: Ngắn gọn, tập trung vào từ khóa ~1,500 từ</option>
                      <option value="medium">Medium: Mở rộng và tăng độ sáng tạo của bài ~2,000 từ</option>
                      <option value="long">Long: Bao quát chủ đề sâu, mở rộng các khía cạnh xung quanh ~3,000 từ</option>
                    </select>
                  </div>
                )}
              </div>
            </label>

            {/* Your Outline */}
            <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              <input
                type="radio"
                name="outlineOption"
                value="your-outline"
                checked={formData.outlineOption === "your-outline"}
                onChange={(e) => setFormData({ ...formData, outlineOption: e.target.value })}
                disabled={isGenerating}
                className="mt-1"
              />
              <div className="flex-1">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  Your Outline ✍️
                </p>
                <p className="text-sm text-muted-foreground">
                  Tự tạo dàn ý riêng cho từng bài viết
                </p>
                
                {formData.outlineOption === "your-outline" && (
                  <div className="mt-3">
                    <Label className="text-sm mb-2 block font-medium">Nhập dàn ý theo cấu trúc:</Label>
                    <div className="mb-2 text-xs text-gray-600 bg-gray-100 p-3 rounded border border-gray-300">
                      <strong>Cấu trúc:</strong><br/>
                      [h2] Tiêu đề 1<br/>
                      [h3] Tiêu đề con<br/>
                      [h2] Tiêu đề 2<br/>
                      <br/>
                      [h2] Tiêu đề 1<br/>
                      [h2] Tiêu đề 2<br/>
                      <br/>
                      ...<br/>
                      <br/>
                      <span className="text-blue-600 font-medium">
                        💡 Mỗi khối dàn ý (cách nhau bằng dòng trắng) tương ứng với từ khóa theo thứ tự
                      </span>
                    </div>
                    <textarea
                      value={customOutline}
                      onChange={(e) => setCustomOutline(e.target.value)}
                      disabled={isGenerating}
                      placeholder="Nhập dàn ý cho từng từ khóa, cách nhau bằng dòng trắng..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm min-h-[200px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Tone */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold text-foreground">
              Giọng điệu:
            </Label>
            <span className="text-xs text-muted-foreground">
              Phong cách của bài viết này
            </span>
          </div>
          <select
            value={formData.tone}
            onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
            disabled={isGenerating}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {tones.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </div>

        {/* AI Model */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold text-foreground">
              Chọn Model AI
            </Label>
            <span className="text-xs text-primary cursor-pointer hover:underline">
              Cách sử dụng
            </span>
          </div>
          <select
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            disabled={isGenerating || loadingModels || formData.useGoogleSearch}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            {loadingModels ? (
              <option>Loading models...</option>
            ) : models.length > 0 ? (
              models.map((model) => (
                <option key={model.id} value={model.model_id}>
                  {model.display_name} ({model.provider}) - {model.cost_multiplier}x cost
                </option>
              ))
            ) : (
              <option value="">Không có model nào</option>
            )}
          </select>
          {formData.useGoogleSearch && (
            <p className="text-xs text-green-600">
              Tính năng Google Search yêu cầu sử dụng Gemini 2.5 Flash
            </p>
          )}
        </div>

        {/* Website Knowledge */}
        <div className="space-y-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">
              �� Kiến thức Website (Tùy chọn)
            </Label>
          </div>
          <select
            value={formData.websiteId}
            onChange={(e) => setFormData({ ...formData, websiteId: e.target.value })}
            disabled={isGenerating || loadingWebsites}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Không sử dụng kiến thức website</option>
            {websites.map((website) => (
              <option key={website.id} value={website.id}>
                {website.name} {website.knowledge ? "✨" : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Chọn website để AI viết theo phong cách và ngữ cảnh riêng của website đó
          </p>
          
          {selectedWebsiteKnowledge && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-purple-700 hover:text-purple-900">
                👁️ Xem kiến thức website
              </summary>
              <div className="mt-2 p-3 bg-white border border-purple-100 rounded-lg">
                <pre className="text-xs whitespace-pre-wrap font-mono text-gray-700">
                  {selectedWebsiteKnowledge}
                </pre>
              </div>
            </details>
          )}
        </div>

        {/* Auto Insert Images */}
        <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.autoInsertImages}
              onChange={(e) => setFormData({ ...formData, autoInsertImages: e.target.checked })}
              disabled={isGenerating}
              className="mt-1 w-4 h-4"
            />
            <div className="flex-1">
              <span className="font-semibold text-sm">🖼️ Tự động chèn ảnh</span>
              <p className="text-xs text-muted-foreground mt-1">
                Tự động tìm và chèn ảnh phù hợp vào bài viết từ Pexels
              </p>
            </div>
          </label>
          {formData.autoInsertImages && (
            <div className="ml-7">
              <Label className="text-sm text-muted-foreground mb-1 block">
                Số lượng ảnh tối đa
              </Label>
              <select
                value={formData.maxImages}
                onChange={(e) => setFormData({ ...formData, maxImages: parseInt(e.target.value) })}
                disabled={isGenerating}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>{num} ảnh</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Ảnh sẽ được chia đều vào các đoạn văn. Cuối bài viết sẽ không chèn ảnh.
              </p>
            </div>
          )}
        </div>

        {/* Google Search Knowledge */}
        <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.useGoogleSearch}
              onChange={(e) => setFormData({
                ...formData,
                useGoogleSearch: e.target.checked,
                model: e.target.checked ? "gemini-2.5-flash" : formData.model
              })}
              disabled={isGenerating}
              className="mt-1 w-4 h-4"
            />
            <div className="flex-1">
              <span className="font-semibold text-sm">🔍 Tham khảo thêm kiến thức trên Google tìm kiếm</span>
              <p className="text-xs text-muted-foreground mt-1">
                AI sẽ tìm kiếm thông tin trên Google để bổ sung kiến thức mới nhất cho bài viết. 
                Tính năng này sử dụng Gemini 2.5 Flash để đảm bảo chất lượng tốt nhất.
              </p>
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || keywordCount === 0 || !formData.model}
            className="w-full py-6 text-lg font-semibold"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Đang tạo Batch Job...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Tạo {keywordCount} bài viết
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BatchWriteByKeywords;
