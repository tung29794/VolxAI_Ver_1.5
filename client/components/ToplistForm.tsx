import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Zap, ArrowLeft } from "lucide-react";
import { buildApiUrl } from "@/lib/api";

interface AIModel {
  id: number;
  display_name: string;
  model_id: string;
  provider: string;
  cost_multiplier: number;
  is_active: boolean;
}

interface Website {
  id: number;
  name: string;
  url: string;
  knowledge?: string | null;
  is_active: boolean;
}

const languages = [
  { code: "vi", name: "Vietnamese" },
  { code: "en", name: "English" },
  { code: "pt", name: "Portuguese" },
  { code: "af", name: "Afrikaans" },
  { code: "sq", name: "Albanian" },
  { code: "am", name: "Amharic" },
  { code: "ar", name: "Arabic" },
  { code: "hy", name: "Armenian" },
  { code: "az", name: "Azerbaijani" },
  { code: "eu", name: "Basque" },
  { code: "be", name: "Belarusian" },
  { code: "bn", name: "Bengali" },
  { code: "bs", name: "Bosnian" },
  { code: "bg", name: "Bulgarian" },
  { code: "ca", name: "Catalan" },
  { code: "ceb", name: "Cebuano" },
  { code: "ny", name: "Chichewa" },
  { code: "zh", name: "Chinese" },
  { code: "co", name: "Corsican" },
  { code: "hr", name: "Croatian" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "eo", name: "Esperanto" },
  { code: "et", name: "Estonian" },
  { code: "tl", name: "Filipino" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "fy", name: "Frisian" },
  { code: "gl", name: "Galician" },
  { code: "ka", name: "Georgian" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "gu", name: "Gujarati" },
  { code: "ht", name: "Haitian Creole" },
  { code: "ha", name: "Hausa" },
  { code: "haw", name: "Hawaiian" },
  { code: "he", name: "Hebrew" },
  { code: "hi", name: "Hindi" },
  { code: "hmn", name: "Hmong" },
  { code: "hu", name: "Hungarian" },
  { code: "is", name: "Icelandic" },
  { code: "ig", name: "Igbo" },
  { code: "id", name: "Indonesian" },
  { code: "ga", name: "Irish" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "jw", name: "Javanese" },
  { code: "kn", name: "Kannada" },
  { code: "kk", name: "Kazakh" },
  { code: "km", name: "Khmer" },
  { code: "ko", name: "Korean" },
  { code: "ku", name: "Kurdish (Kurmanji)" },
  { code: "ky", name: "Kyrgyz" },
  { code: "lo", name: "Lao" },
  { code: "la", name: "Latin" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "lb", name: "Luxembourgish" },
  { code: "mk", name: "Macedonian" },
  { code: "mg", name: "Malagasy" },
  { code: "ms", name: "Malay (Bahasa Melayu)" },
  { code: "ml", name: "Malayalam" },
  { code: "mt", name: "Maltese" },
  { code: "mi", name: "Maori" },
  { code: "mr", name: "Marathi" },
  { code: "mn", name: "Mongolian" },
  { code: "my", name: "Myanmar (Burmese)" },
  { code: "ne", name: "Nepali" },
  { code: "no", name: "Norwegian" },
  { code: "ps", name: "Pashto" },
  { code: "fa", name: "Persian" },
  { code: "pl", name: "Polish" },
  { code: "pa", name: "Punjabi" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "sm", name: "Samoan" },
  { code: "gd", name: "Scots Gaelic" },
  { code: "sr", name: "Serbian" },
  { code: "st", name: "Sesotho" },
  { code: "sn", name: "Shona" },
  { code: "sd", name: "Sindhi" },
  { code: "si", name: "Sinhala" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "so", name: "Somali" },
  { code: "es", name: "Spanish" },
  { code: "su", name: "Sundanese" },
  { code: "sw", name: "Swahili" },
  { code: "sv", name: "Swedish" },
  { code: "tg", name: "Tajik" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "th", name: "Thai" },
  { code: "tr", name: "Turkish" },
  { code: "uk", name: "Ukrainian" },
  { code: "ur", name: "Urdu" },
  { code: "uz", name: "Uzbek" },
  { code: "cy", name: "Welsh" },
  { code: "xh", name: "Xhosa" },
  { code: "yi", name: "Yiddish" },
  { code: "yo", name: "Yoruba" },
  { code: "zu", name: "Zulu" },
];

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

interface ToplistFormProps {
  onSubmit?: (formData: any) => Promise<void>;
  isLoading?: boolean;
  onBack?: () => void;
}

export default function ToplistForm({
  onSubmit,
  isLoading = false,
  onBack,
}: ToplistFormProps) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loadingWebsites, setLoadingWebsites] = useState(true);
  const [selectedWebsiteKnowledge, setSelectedWebsiteKnowledge] = useState<string | null>(null);
  
  // Fetch models from API on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "https://api.volxai.com"}/api/models`
        );
        const data = await response.json();
        if (data.success && data.models && data.models.length > 0) {
          const activeModels = data.models.filter((m: AIModel) => m.is_active);
          setModels(activeModels.length > 0 ? activeModels : data.models);
          
          // Set default model to Gemini for toplist (google-ai provider) - use model_id
          const geminiModel = activeModels.find((m: AIModel) => m.provider === 'google-ai');
          if (geminiModel) {
            setFormData((prev) => ({
              ...prev,
              model: geminiModel.model_id,
            }));
          } else if (activeModels.length > 0) {
            // Fallback to first active model if Gemini not found
            setFormData((prev) => ({
              ...prev,
              model: activeModels[0].model_id,
            }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
      } finally {
        setLoadingModels(false);
      }
    };
    fetchModels();
  }, []);
  
  // Fetch websites from API
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
        if (data.success && data.data) {
          setWebsites(data.data.filter((w: Website) => w.is_active));
        }
      } catch (error) {
        console.error("Failed to fetch websites:", error);
      } finally {
        setLoadingWebsites(false);
      }
    };
    fetchWebsites();
  }, []);
  
  const [formData, setFormData] = useState({
    keyword: "", // Từ khóa chính
    itemCount: 5, // Số lượng mục toplist (3-15)
    language: "vi",
    outlineType: "no-outline", // no-outline, your-outline (ai-outline removed)
    outlineLength: "medium", // short, medium, long (for no-outline mode)
    length: "medium", // Sync with outlineLength for backend compatibility
    customOutline: "",
    tone: "SEO Focus: Tối ưu SEO, cố gắng đạt xếp hạng SERP cao 🚀",
    model: "GPT 4.1 MINI",
    websiteId: "", // NEW: Selected website ID for knowledge
    // SEO Options (hidden by default, same as WriteByKeywordForm)
    internalLinks: "",
    endContent: "",
    boldKeywords: {
      mainKeyword: false,
      headings: false,
    },
    autoInsertImages: false,
    maxImages: 5, // Default 5 images, max 10
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    
    // Update selectedWebsiteKnowledge when websiteId changes
    if (name === "websiteId") {
      const website = websites.find((w) => w.id === parseInt(value));
      setSelectedWebsiteKnowledge(website?.knowledge || null);
    }
    
    // Sync length with outlineLength for backend compatibility
    if (name === "outlineLength") {
      setFormData((prev) => ({ ...prev, [name]: value, length: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleGenerateOutline = async () => {
    if (!formData.keyword.trim()) {
      setErrors((prev) => ({
        ...prev,
        keyword: "Vui lòng nhập từ khóa trước khi tạo dàn ý",
      }));
      return;
    }

    setIsGeneratingOutline(true);

    try {
      const response = await fetch(
        buildApiUrl("/api/ai/generate-toplist-outline"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          credentials: "include",
          body: JSON.stringify({
            topic: formData.keyword,
            itemCount: formData.itemCount, // Use dynamic itemCount from form
            language: formData.language,
            tone: formData.tone,
            length: formData.outlineLength,
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setFormData((prev) => ({
          ...prev,
          customOutline: data.outline,
          outlineType: "your-outline",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          outline: data.error || "Không thể tạo dàn ý",
        }));
      }
    } catch (error) {
      console.error("Error generating outline:", error);
      setErrors((prev) => ({
        ...prev,
        outline: "Lỗi kết nối server",
      }));
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.keyword.trim()) {
      newErrors.keyword = "Vui lòng nhập từ khóa";
    }

    if (
      formData.outlineType === "your-outline" &&
      !formData.customOutline.trim()
    ) {
      newErrors.customOutline = "Vui lòng nhập dàn ý hoặc tạo dàn ý tự động";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    if (onSubmit) {
      // Add isToplist flag to distinguish from regular articles
      await onSubmit({ ...formData, isToplist: true });
    }
  };

  return (
    <>
      {/* Header Section - Same style as WriteByKeywordForm */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </Button>
          )}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              AI Viết bài dạng Toplist
            </h1>
            <div className="flex items-center gap-4">
              <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                🔥 Hot!
              </div>
              <p className="text-base text-muted-foreground">
                Tạo bài viết dạng Top 10, 5 Cách, 7 Lý Do... với AI
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <span>📚</span>
          Cách sử dụng
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-border p-8 space-y-6">
          {/* Keyword Section */}
          <div className="space-y-3">
            <Label htmlFor="keyword" className="text-base font-semibold">
              Keyword:
            </Label>
            <p className="text-sm text-muted-foreground">
              Cung cấp một từ khóa mà bạn muốn AI viết bài toplist cho bạn.
            </p>
            <textarea
              id="keyword"
              name="keyword"
              value={formData.keyword}
              onChange={handleChange}
              placeholder="Nhập từ khóa của bạn"
              className={`w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:border-primary ${
                errors.keyword ? "border-destructive" : "border-border"
              }`}
              rows={3}
              disabled={isLoading}
            />
            {errors.keyword && (
              <p className="text-sm text-destructive">{errors.keyword}</p>
            )}
            <p className="text-xs text-muted-foreground">
              💡 AI sẽ tự động tạo tiêu đề dạng toplist: "Top 10...", "5 Cách...", "7 Lý Do..."
            </p>
          </div>

          {/* Item Count Section */}
          <div className="space-y-3">
            <Label htmlFor="itemCount" className="text-base font-semibold">
              Số lượng mục (Items):
            </Label>
            <p className="text-sm text-muted-foreground">
              Chọn số lượng mục cho bài toplist (từ 3 đến 15 mục)
            </p>
            <select
              id="itemCount"
              name="itemCount"
              value={formData.itemCount}
              onChange={handleChange}
              className="w-full p-3 border border-border rounded-lg bg-white focus:outline-none focus:border-primary"
              disabled={isLoading}
            >
              {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((num) => (
                <option key={num} value={num}>
                  {num} mục
                </option>
              ))}
            </select>
          </div>

          {/* Language Section */}
          <div className="space-y-3">
            <Label
              htmlFor="language"
              className="text-base font-semibold flex items-center gap-2"
            >
              <span>🌍</span>
              Ngôn ngữ của bài viết này
            </Label>
            <select
              id="language"
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="w-full p-3 border border-border rounded-lg bg-white focus:outline-none focus:border-primary"
              disabled={isLoading}
            >
              {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Outline Section */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <Label className="text-base font-semibold block">
          Chọn phương án dàn ý
        </Label>

        {/* No Outline Option */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="outlineType"
              value="no-outline"
              checked={formData.outlineType === "no-outline"}
              onChange={handleChange}
              className="mt-1"
              disabled={isLoading}
            />
            <div className="flex-1">
              <span className="font-semibold">No Outline:</span>
              <p className="text-sm text-muted-foreground">
                Không cần dàn ý, AI tự động tạo bài toplist - Bài viết sẽ dài khoảng
              </p>
            </div>
          </label>

          {formData.outlineType === "no-outline" && (
            <div className="ml-7 space-y-3">
              <Label htmlFor="outlineLength" className="text-sm">
                Tùy chình độ dài nội dung
              </Label>
              <select
                id="outlineLength"
                name="outlineLength"
                value={formData.outlineLength}
                onChange={handleChange}
                className="w-full p-2 border border-border rounded-lg bg-white text-sm focus:outline-none focus:border-primary"
                disabled={isLoading}
              >
                <option value="short">
                  Short: Ngắn gọn, tập trung vào từ khóa ~1,500 từ
                </option>
                <option value="medium">
                  Medium: Mở rộng và tăng độ sáng tạo của bài ~2,000 từ
                </option>
                <option value="long">
                  Long: Bao quát chủ đề sâu, mở rộng các khía cạnh xung quanh ~3,000 từ
                </option>
              </select>
            </div>
          )}
        </div>

        {/* Your Outline Option */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="outlineType"
              value="your-outline"
              checked={formData.outlineType === "your-outline"}
              onChange={handleChange}
              className="mt-1"
              disabled={isLoading}
            />
            <div className="flex-1">
              <span className="font-semibold">AI/Your Outline:</span>
              <p className="text-sm text-muted-foreground">
                Bạn sẽ nhập dàn ý theo ý bạn
              </p>
            </div>
          </label>

          {formData.outlineType === "your-outline" && (
            <div className="ml-7 space-y-3">
              <Button
                type="button"
                onClick={handleGenerateOutline}
                disabled={isGeneratingOutline || isLoading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                {isGeneratingOutline ? "Đang tạo dàn ý..." : "Tạo Dàn Ý Toplist"}
              </Button>
              
              <textarea
                name="customOutline"
                value={formData.customOutline}
                onChange={handleChange}
                placeholder={`[intro] Giới thiệu ngắn
[h2] 1. Mục đầu tiên
[h3] Chi tiết 1.1
[h2] 2. Mục thứ hai
[h3] Chi tiết 2.1
[h2] Kết luận`}
                className={`w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:border-primary ${
                  errors.customOutline ? "border-destructive" : "border-border"
                }`}
                rows={8}
                disabled={isLoading}
              />
              {errors.customOutline && (
                <p className="text-sm text-destructive">
                  {errors.customOutline}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Cho phép định dạng dàn ý với format [intro][h2][h3] theo dạng numbered list (1, 2, 3...)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tone Section */}
      <div className="space-y-3">
        <Label htmlFor="tone" className="text-base font-semibold">
          Phong cách viết:
        </Label>
        <select
          id="tone"
          name="tone"
          value={formData.tone}
          onChange={handleChange}
          className="w-full p-3 border border-border rounded-lg bg-white focus:outline-none focus:border-primary"
          disabled={isLoading}
        >
          {tones.map((tone) => (
            <option key={tone} value={tone}>
              {tone}
            </option>
          ))}
        </select>
      </div>

      {/* Model Section */}
      <div className="space-y-3">
        <Label htmlFor="model" className="text-base font-semibold">
          AI Model:
        </Label>
        <select
          id="model"
          name="model"
          value={formData.model}
          onChange={handleChange}
          className="w-full p-3 border border-border rounded-lg bg-white focus:outline-none focus:border-primary"
          disabled={isLoading || loadingModels}
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
            <option>No models available</option>
          )}
        </select>
      </div>

      {/* Website Knowledge Section */}
      <div className="space-y-3 p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
        <Label htmlFor="websiteId" className="text-base font-semibold text-purple-900">
          📚 Kiến thức Website (Tùy chọn)
        </Label>
        <select
          id="websiteId"
          name="websiteId"
          value={formData.websiteId}
          onChange={handleChange}
          className="w-full p-3 border border-purple-300 rounded-lg bg-white focus:outline-none focus:border-purple-500"
          disabled={isLoading || loadingWebsites}
        >
          <option value="">Không sử dụng kiến thức website</option>
          {loadingWebsites ? (
            <option disabled>Đang tải danh sách website...</option>
          ) : (
            websites.map((website) => (
              <option key={website.id} value={website.id}>
                {website.name} {website.knowledge ? '✨' : ''}
              </option>
            ))
          )}
        </select>
        <p className="text-xs text-purple-700 mt-2">
          💡 Chọn website để AI sử dụng kiến thức và phong cách viết của website đó.
          Icon ✨ = Website đã có kiến thức.
        </p>
        
        {/* Knowledge Preview */}
        {selectedWebsiteKnowledge && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-purple-900 hover:text-purple-700">
              👁️ Xem nội dung kiến thức
            </summary>
            <pre className="mt-2 p-3 bg-white border border-purple-200 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap">
              {selectedWebsiteKnowledge}
            </pre>
          </details>
        )}
      </div>

          {/* Auto Insert Images Checkbox */}
          <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoInsertImages}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  autoInsertImages: e.target.checked
                }))}
                className="mt-1 w-4 h-4"
                disabled={isLoading}
              />
              <div className="flex-1">
                <span className="font-semibold text-sm">🖼️ Tự động tìm và chèn ảnh cho mỗi mục</span>
                <p className="text-xs text-muted-foreground mt-1">
                  AI sẽ tự động tìm và chèn 1 hình ảnh cho mỗi mục trong toplist. 
                  Ví dụ: Top 5 sẽ có 5 ảnh, Top 10 sẽ có 10 ảnh.
                </p>
              </div>
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
          >
            {isLoading ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-spin" />
                Đang tạo bài toplist...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Tạo Bài Toplist
              </>
            )}
          </Button>

          {errors.outline && (
            <p className="text-sm text-destructive text-center">{errors.outline}</p>
          )}
        </div>
      </form>
    </>
  );
}
