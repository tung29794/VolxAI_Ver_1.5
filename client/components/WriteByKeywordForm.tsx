import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, Zap } from "lucide-react";

const languages = [
  { code: "vi", name: "Vietnamese" },
  { code: "en", name: "English" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "zh-TW", name: "Chinese (Traditional)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
  { code: "th", name: "Thai" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "tl", name: "Filipino" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "tr", name: "Turkish" },
  { code: "pl", name: "Polish" },
  { code: "uk", name: "Ukrainian" },
  { code: "cs", name: "Czech" },
  { code: "el", name: "Greek" },
  { code: "he", name: "Hebrew" },
  { code: "sv", name: "Swedish" },
  { code: "da", name: "Danish" },
  { code: "no", name: "Norwegian" },
  { code: "fi", name: "Finnish" },
  { code: "nl", name: "Dutch" },
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

const aiOutlineOptions = [
  "SEO Basic",
  "SEO Focus",
  "SEO Extend",
  "SEO Long Form",
  "SEO NoFAQ",
  "Newspaper",
  "How To",
  "Story",
  "Movie Review",
  "Year In Title",
  "Confident",
  "Cooking",
  "Technical",
  "Friendly",
  "Trang đặc biệt",
  "Random",
];

const supportedPlatforms = [
  { name: "WordPress.org", icon: "🔷" },
  { name: "Haravan", icon: "🟢" },
  { name: "Sapo", icon: "🔵" },
  { name: "Shopify", icon: "💚" },
  { name: "Blogger", icon: "🟠" },
  { name: "WordPress.com", icon: "⚫" },
  { name: "WIX", icon: "⬜" },
];

const models = [
  "GPT 4.1 MINI",
  "GPT 5",
  "Gemini 2.5 Flash",
  "GPT 4o MINI",
];

export default function WriteByKeywordForm() {
  const [formData, setFormData] = useState({
    keyword: "",
    language: "vi",
    outlineType: "no-outline",
    outlineLength: "medium",
    customOutline: "",
    aiOutlineStyle: "SEO Basic",
    tone: "SEO Basic: Tập trung vào từ khóa - Tốt nhất khi từ khóa là dạng câu hỏi 🔥",
    model: "GPT 4.1 MINI",
    website: "",
  });

  const [showSEOOptions, setShowSEOOptions] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateOutline = () => {
    alert("AI Tạo Dàn Ý - Tính năng sẽ được cập nhật");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form data:", formData);
    alert("Bắt đầu viết bài - Tính năng sẽ được cập nhật");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            AI Viết bài theo từ khóa
          </h1>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
              🔥 Hot!
            </div>
            <p className="text-base text-muted-foreground">
              Để có bài viết đúng với mục tiêu hạn, thủ tính năng{" "}
              <span className="font-semibold text-primary">AI Tạo Tiêu Đề</span>
            </p>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="keyword" className="text-base font-semibold">
                Keyword:
              </Label>
              <span className="text-xs text-primary cursor-pointer hover:underline">
                Nhận từ khóa phụ
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Cung cấp một từ khóa mà bạn muốn AI viết nội dung cho bạn.
            </p>
            <textarea
              id="keyword"
              name="keyword"
              value={formData.keyword}
              onChange={handleChange}
              placeholder="Nhập từ khóa của bạn"
              className="w-full p-3 border border-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Bạn có thể thêm từ khóa phụ dưới dạng dàn ý: từ khóa chính, từ khóa phụ 1, từ khóa phụ 2
            </p>
          </div>

          {/* Language Section */}
          <div className="space-y-3">
            <Label htmlFor="language" className="text-base font-semibold flex items-center gap-2">
              <span>🌍</span>
              Ngôn ngữ: Ngôn ngữ của bài viết này
            </Label>
            <select
              id="language"
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="w-full p-3 border border-border rounded-lg bg-white focus:outline-none focus:border-primary"
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
                />
                <div className="flex-1">
                  <span className="font-semibold">No Outline:</span>
                  <p className="text-sm text-muted-foreground">
                    Không cần dàn ý, viết theo từ khóa - Bài viết sẽ dài khoảng
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
                  >
                    <option value="short">Short: Ngắn gọn, tập trung vào từ khóa ~1,500 từ</option>
                    <option value="medium">Medium: Mở rộng và tăng độ sáng tạo của bài ~2,000 từ</option>
                    <option value="long">Long: Bao quát chủ đề sâu, mở rộng các khía cạnh xung quanh ~3,000 từ</option>
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
                />
                <div className="flex-1">
                  <span className="font-semibold">Your Outline:</span>
                  <p className="text-sm text-muted-foreground">
                    Bạn sẽ nhập dàn ý theo ý bạn
                  </p>
                </div>
              </label>

              {formData.outlineType === "your-outline" && (
                <div className="ml-7 space-y-3">
                  <textarea
                    name="customOutline"
                    value={formData.customOutline}
                    onChange={handleChange}
                    placeholder={`[h1] Title 1
[h2] heading
[h3] sub heading
[h2] heading`}
                    className="w-full p-3 border border-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary"
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cho phép định dạng dàn ý với format [h2][h3], xem{" "}
                    <span className="text-primary font-semibold cursor-pointer">
                      hướng dẫn sử dụng
                    </span>
                    . Mỗi [h2] sẽ không quá 400 từ, và mỗi [h3] sẽ không quá 200 từ
                  </p>
                </div>
              )}
            </div>

            {/* AI Outline Option */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="outlineType"
                  value="ai-outline"
                  checked={formData.outlineType === "ai-outline"}
                  onChange={handleChange}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-semibold">AI Outline:</span>
                  <p className="text-sm text-muted-foreground">
                    Sử dụng AI để viết dàn ý chi tiết (nên sử dụng)
                  </p>
                </div>
              </label>

              {formData.outlineType === "ai-outline" && (
                <div className="ml-7 space-y-3 flex items-end gap-3">
                  <div className="flex-1">
                    <Label htmlFor="aiOutlineStyle" className="text-sm mb-2 block">
                      Chọn phong cách dàn ý
                    </Label>
                    <select
                      id="aiOutlineStyle"
                      name="aiOutlineStyle"
                      value={formData.aiOutlineStyle}
                      onChange={handleChange}
                      className="w-full p-2 border border-border rounded-lg bg-white text-sm focus:outline-none focus:border-primary"
                    >
                      {aiOutlineOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    onClick={handleGenerateOutline}
                    className="bg-primary hover:bg-primary/90"
                  >
                    ➜ AI tạo
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Giọng Điệu / Tone Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="tone" className="text-base font-semibold">
                Giọng điệu:
              </Label>
              <span className="text-xs text-muted-foreground">Phong cách của bài viết này</span>
            </div>
            <select
              id="tone"
              name="tone"
              value={formData.tone}
              onChange={handleChange}
              className="w-full p-3 border border-border rounded-lg bg-white focus:outline-none focus:border-primary"
            >
              {tones.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="model" className="text-base font-semibold">
                Chọn Model AI
              </Label>
              <span className="text-xs text-primary cursor-pointer hover:underline">
                Cách sử dụng
              </span>
            </div>
            <select
              id="model"
              name="model"
              value={formData.model}
              onChange={handleChange}
              className="w-full p-3 border border-border rounded-lg bg-white focus:outline-none focus:border-primary"
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}: AI viết 1 lần = 1 post 🔥
                </option>
              ))}
            </select>
          </div>

          {/* SEO Options Toggle */}
          <div className="border-t border-border pt-6">
            <button
              type="button"
              onClick={() => setShowSEOOptions(!showSEOOptions)}
              className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <span>⚙️</span>
              {showSEOOptions ? "Ẩn tùy chọn SEO" : "Tuỳ chọn SEO"}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showSEOOptions ? "rotate-180" : ""
                }`}
              />
            </button>

            {showSEOOptions && (
              <div className="mt-6 space-y-6 p-6 bg-gray-50 rounded-lg">
                {/* Primary Keywords */}
                <div className="space-y-3">
                  <Label htmlFor="primaryKeywords" className="text-sm font-semibold">
                    Các từ chọn sau là từ chính, bạn có thể thêm hoặc để trống
                  </Label>
                  <Input
                    id="primaryKeywords"
                    type="text"
                    placeholder="Link https://"
                    className="p-3 border border-border rounded-lg"
                  />
                </div>

                {/* Internal Links */}
                <div className="space-y-3">
                  <Label htmlFor="internalLink" className="text-sm font-semibold">
                    Gắn link sau vào từ khóa chính
                  </Label>
                  <Input
                    id="internalLink"
                    type="text"
                    placeholder="Link https://"
                    className="p-3 border border-border rounded-lg"
                  />
                </div>

                {/* Additional Content */}
                <div className="space-y-3">
                  <Label htmlFor="additionalContent" className="text-sm font-semibold">
                    Thêm link nếu nội dung có các từ khóa
                  </Label>
                  <textarea
                    id="additionalContent"
                    placeholder={`Example:
Keyword_1|Link_1
Keyword_2|Link_2
Keyword_3|Link_3`}
                    className="w-full p-3 border border-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary"
                    rows={4}
                  />
                </div>

                {/* Rich Text Editor */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    Thêm nội dung sau vào cuối bài
                  </Label>
                  <div className="border border-border rounded-lg">
                    <div className="flex items-center gap-2 p-3 bg-gray-100 border-b border-border">
                      <select className="bg-white border border-border rounded px-2 py-1 text-sm">
                        <option>Paragraph</option>
                        <option>Heading 2</option>
                        <option>Heading 3</option>
                      </select>
                      <button type="button" className="p-1 hover:bg-gray-200 rounded">
                        💧
                      </button>
                      <button type="button" className="p-1 hover:bg-gray-200 rounded">
                        <strong>B</strong>
                      </button>
                      <button type="button" className="p-1 hover:bg-gray-200 rounded">
                        <em>I</em>
                      </button>
                      <button type="button" className="p-1 hover:bg-gray-200 rounded">
                        <u>U</u>
                      </button>
                      <button type="button" className="p-1 hover:bg-gray-200 rounded">
                        ≡
                      </button>
                      <button type="button" className="p-1 hover:bg-gray-200 rounded">
                        ≣
                      </button>
                      <button type="button" className="p-1 hover:bg-gray-200 rounded">
                        ⋮
                      </button>
                      <button type="button" className="p-1 hover:bg-gray-200 rounded">
                        🔗
                      </button>
                    </div>
                    <textarea
                      placeholder="Thêm nội dung ở đây..."
                      className="w-full p-3 text-sm resize-none focus:outline-none"
                      rows={6}
                    />
                    <div className="text-right text-xs text-muted-foreground p-3 border-t border-border">
                      0 words
                    </div>
                  </div>
                </div>

                {/* Bold keywords */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold block">
                    Từ đóng in đậm (bold)
                  </Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" />
                      <span className="text-sm">Từ khóa chính</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" />
                      <span className="text-sm">Heading (h2,h3)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2"
          >
            ⚙️ Tuỳ chọn SEO
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90 flex items-center gap-2">
            ➜ AI Write
          </Button>
        </div>
      </form>
    </div>
  );
}
