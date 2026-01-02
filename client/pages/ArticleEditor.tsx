import { useMemo, useState, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, X, Zap, Loader2, Image as ImageIcon } from "lucide-react";
import { SelectionToolbar } from "@/components/SelectionToolbar";

const SeoChecklistItem = ({ text, checked }) => (
  <li className="flex items-center gap-2 text-sm">
    {checked ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    )}
    <span>{text}</span>
  </li>
);

export default function ArticleEditor() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const [metaTitle, setMetaTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [isSerpModalOpen, setIsSerpModalOpen] = useState(false);
  const [accordionValue, setAccordionValue] = useState("basic");
  const [isPublishing, setIsPublishing] = useState(false);

  // AI Rewrite states
  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [isRewriting, setIsRewriting] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  // Floating toolbar and image search states
  const [floatingToolbarVisible, setFloatingToolbarVisible] = useState(false);
  const [searchedImages, setSearchedImages] = useState<any[]>([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [activeTab, setActiveTab] = useState("seo"); // seo, ai, images, video
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  type RewriteStyle =
    | "standard"
    | "shorter"
    | "longer"
    | "easy"
    | "creative"
    | "funny"
    | "casual"
    | "friendly"
    | "professional";

  const rewriteOptions: { label: string; style: RewriteStyle }[] = [
    { label: "Standard", style: "standard" },
    { label: "Shorter", style: "shorter" },
    { label: "Longer", style: "longer" },
    { label: "Easy to read", style: "easy" },
    { label: "More creative", style: "creative" },
    { label: "More funny", style: "funny" },
    { label: "More casual", style: "casual" },
    { label: "More friendly", style: "friendly" },
    { label: "More professional", style: "professional" },
  ];

  const MAX_META_TITLE_LENGTH = 60;
  const MAX_SLUG_LENGTH = 75;
  const MAX_META_DESC_LENGTH = 160;

  const handleKeywordKeyDown = (event) => {
    if (event.key === "Enter" && keywordInput.trim() !== "") {
      event.preventDefault();
      if (!keywords.includes(keywordInput.trim())) {
        setKeywords([...keywords, keywordInput.trim()]);
      }
      setKeywordInput("");
    }
  };

  const handleOpenRewriteModal = () => {
    // Get selected text from Quill editor
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const selection = editor.getSelection();

      if (selection && selection.length > 0) {
        const text = editor.getText(selection.index, selection.length).trim();
        if (text) {
          setSelectedText(text);
          setIsRewriteModalOpen(true);
        }
      }
    }
  };

  const handleRewriteText = async (style: RewriteStyle) => {
    if (!selectedText || !quillRef.current) return;

    setIsRewriting(true);
    try {
      const response = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: selectedText,
          style,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to rewrite text");
      }

      const data = await response.json();
      const rewrittenText = data.rewrittenText;

      // Replace selected text with rewritten text
      const editor = quillRef.current.getEditor();
      const selection = editor.getSelection();

      if (selection) {
        editor.deleteText(selection.index, selection.length);
        editor.insertText(selection.index, rewrittenText);
        // Move cursor after the inserted text
        editor.setSelection(selection.index + rewrittenText.length);
      }

      setIsRewriteModalOpen(false);
      setSelectedText("");
    } catch (error) {
      console.error("Error rewriting text:", error);
      alert("Failed to rewrite text. Please try again.");
    } finally {
      setIsRewriting(false);
    }
  };

  const handleInsertVideo = () => {
    if (!quillRef.current) return;

    const videoUrl = prompt("Nhập URL video YouTube hoặc URL video:");
    if (!videoUrl) return;

    const editor = quillRef.current.getEditor();
    const selection = editor.getSelection();

    if (selection) {
      // Handle YouTube URLs
      if (
        videoUrl.includes("youtube.com") ||
        videoUrl.includes("youtu.be")
      ) {
        let videoId = "";

        // Extract video ID from different YouTube URL formats
        if (videoUrl.includes("youtube.com/watch?v=")) {
          videoId = videoUrl.split("v=")[1].split("&")[0];
        } else if (videoUrl.includes("youtu.be/")) {
          videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
        }

        if (videoId) {
          const embedUrl = `https://www.youtube.com/embed/${videoId}`;
          editor.insertEmbed(
            selection.index,
            "video",
            embedUrl
          );
          editor.setSelection(selection.index + 1);
          return;
        }
      }

      // For regular video URLs (mp4, webm, etc.)
      editor.insertEmbed(selection.index, "video", videoUrl);
      editor.setSelection(selection.index + 1);
    }
  };

  // Handler for floating toolbar - Find Image
  const handleFindImage = async () => {
    if (!selectedText) return;

    setIsSearchingImages(true);
    setActiveTab("images");

    try {
      const response = await fetch("/api/ai/find-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyword: selectedText,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to find images");
      }

      const data = await response.json();
      setSearchedImages(data.images || []);
    } catch (error) {
      console.error("Error finding images:", error);
      alert("Failed to find images. Please try again.");
    } finally {
      setIsSearchingImages(false);
    }
  };

  // Handler for floating toolbar - Write More
  const handleWriteMore = async () => {
    if (!quillRef.current) return;

    setIsRewriting(true);

    try {
      const response = await fetch("/api/ai/write-more", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content,
          title: title,
          keywords: keywords,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to write more");
      }

      const data = await response.json();
      const writtenContent = data.writtenContent;

      // Append to editor
      const editor = quillRef.current.getEditor();
      const length = editor.getLength();
      editor.insertText(length - 1, "\n\n" + writtenContent);
      editor.setSelection(length + writtenContent.length);

      setFloatingToolbarVisible(false);
      setSelectedText("");
    } catch (error) {
      console.error("Error writing more:", error);
      alert("Failed to write more content. Please try again.");
    } finally {
      setIsRewriting(false);
    }
  };

  // Detect text selection in Quill
  const handleEditorSelection = () => {
    if (!quillRef.current) return;

    const editor = quillRef.current.getEditor();
    const selection = editor.getSelection();

    if (selection && selection.length > 0) {
      const text = editor.getText(selection.index, selection.length).trim();
      if (text) {
        setSelectedText(text);
        setFloatingToolbarVisible(true);
      }
    } else {
      setFloatingToolbarVisible(false);
      setSelectedText("");
    }

    // Track cursor position even when no selection
    if (selection) {
      setCursorPosition(selection.index);
    }
  };

  const removeKeyword = (keywordToRemove) => {
    setKeywords(keywords.filter((keyword) => keyword !== keywordToRemove));
  };

  // Auto-generate slug from title if empty
  const generateSlug = (text: string) => {
    return normalize(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .replace(/[\/]+/g, "-")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSaveArticle = async (status: "draft" | "published") => {
    // Validation
    if (!title.trim()) {
      alert("Vui lòng nhập tiêu đề bài viết");
      return;
    }

    if (!content.trim()) {
      alert("Vui lòng nhập nội dung bài viết");
      return;
    }

    const finalSlug = slug.trim() || generateSlug(title);

    setIsPublishing(true);

    try {
      const response = await fetch("/api/articles/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          content,
          metaTitle: metaTitle.trim() || title.trim(),
          metaDescription: metaDescription.trim(),
          slug: finalSlug,
          keywords,
          featuredImage,
          status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save article");
      }

      const data = await response.json();

      if (status === "published") {
        alert("Bài viết đã được đăng lên!");
        // Redirect to blog page
        window.location.href = "/blog";
      } else {
        alert("Bài viết đã được lưu nháp!");
        // Redirect to admin articles page
        window.location.href = "/admin/articles";
      }
    } catch (error) {
      console.error("Error saving article:", error);
      alert(
        `Lỗi: ${error instanceof Error ? error.message : "Không thể lưu bài viết"}`
      );
    } finally {
      setIsPublishing(false);
    }
  };

  // Helpers
  const normalize = (s: string) => s.toLowerCase().trim();
  const slugify = (s: string) =>
    normalize(s)
      .normalize("NFD")
      // remove accents/diacritics
      .replace(/[\u0300-\u036f]/g, "")
      // Vietnamese specific
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      // sanitize
      .replace(/[\/]+/g, "-")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  const containsAny = (text: string, kws: string[]) => {
    const t = normalize(text);
    return kws.some((k) => t.includes(normalize(k)));
  };
  const startsWithAny = (text: string, kws: string[]) => {
    const t = normalize(text);
    return kws.some((k) => t.startsWith(normalize(k)));
  };
  const wordCountContent = useMemo(
    () =>
      content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length,
    [content]
  );
  const keywordOccurrences = useMemo(() => {
    const plain = normalize(content.replace(/<[^>]*>/g, " "));
    const totals = keywords.map((k) => {
      const nk = normalize(k);
      if (!nk) return 0;
      const regex = new RegExp(
        nk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g"
      );
      return (plain.match(regex) || []).length;
    });
    return totals.reduce((a, b) => a + b, 0);
  }, [content, keywords]);
  const density = useMemo(() => {
    if (wordCountContent === 0) return 0;
    return +(
      (keywordOccurrences / wordCountContent) *
      100
    ).toFixed(2);
  }, [keywordOccurrences, wordCountContent]);

  const hasExternalLink = useMemo(
    () => /<a[^>]+href="http(s)?:\/\//i.test(content),
    [content]
  );
  const hasInternalLink = useMemo(
    () => /<a[^>]+href="\//i.test(content),
    [content]
  );
  const hasImageWithAlt = useMemo(
    () => /<img[^>]*alt=\"[^\"]+\"/i.test(content),
    [content]
  );
  const hasH2H3 = useMemo(() => /<h2>|<h3>/i.test(content), [content]);

  const focusKeywords = keywords.length ? [keywords[0]] : []; // primary focus keyword is the first

  const titleHasKeyword = containsAny(
    metaTitle || title,
    focusKeywords.length ? focusKeywords : keywords
  );
  const descHasKeyword = containsAny(
    metaDescription,
    focusKeywords.length ? focusKeywords : keywords
  );
  const urlHasKeyword = useMemo(() => {
    const s = slugify(slug || "");
    const kwList = (focusKeywords.length ? focusKeywords : keywords)
      .map(slugify)
      .filter(Boolean);
    if (!s || kwList.length === 0) return false;
    // 1) Direct inclusion of the full phrase
    if (kwList.some((kw) => s.includes(kw))) return true;
    // 2) Fallback: for long multi-word keywords, ensure all tokens appear in the slug
    return kwList.some((kw) => {
      const tokens = kw.split("-").filter(Boolean);
      // consider "long" if 2+ tokens
      if (tokens.length < 2) return false;
      return tokens.every((t) => s.includes(t));
    });
  }, [slug, keywords, focusKeywords]);
  const contentHasKeyword = containsAny(
    content.replace(/<[^>]*>/g, " "),
    focusKeywords.length ? focusKeywords : keywords
  );
  // Check if the FIRST NON-EMPTY PARAGRAPH contains the focus keyword anywhere
  const firstParagraphHasKeyword = useMemo(() => {
    const html = content || "";
    // Find the first non-empty <p>...</p>
    const regex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      const paraText = match[1]
        .replace(/<[^>]*>/g, " ") // strip inner tags
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (paraText) {
        return containsAny(
          paraText,
          focusKeywords.length ? focusKeywords : keywords
        );
      }
    }
    // Fallback: check the first 100 words of plain text if no <p> found
    const firstChunk = html
      .replace(/<[^>]*>/g, " ")
      .split(/\s+/)
      .slice(0, 100)
      .join(" ");
    return containsAny(
      firstChunk,
      focusKeywords.length ? focusKeywords : keywords
    );
  }, [content, keywords, focusKeywords]);

  const titleContainsKeyword = containsAny(
    metaTitle || title,
    focusKeywords.length ? focusKeywords : keywords
  );
  const titleHasNumber = /(\d+)/.test(metaTitle || title);

  const seoChecks = {
    basic: [
      { text: "Không thấy từ khóa chính trên SEO title", checked: titleHasKeyword },
      {
        text: "Không thấy từ khóa chính trong SEO Description",
        checked: descHasKeyword,
      },
      {
        text: "Không thấy từ khóa chính trong SEO URL",
        checked: urlHasKeyword,
      },
      {
        text: "Use Focus Keyword at the beginning of your content",
        checked: firstParagraphHasKeyword,
      },
      {
        text: "Không thấy từ khóa chính trong nội dung",
        checked: contentHasKeyword,
      },
      {
        text: "Nội dung có ít nhất 600 từ",
        checked: wordCountContent >= 600,
      },
    ],
    advanced: [
      {
        text: "Có từ khóa trong H2/H3",
        checked:
          hasH2H3 &&
          containsAny(content.replace(/<[^>]*>/g, " "), keywords),
      },
      { text: "Có thẻ IMG với alt", checked: hasImageWithAlt },
      {
        text: `Mật độ từ khóa trong mức 1% - 1.5% (hiện tại ${density}%)`,
        checked: density >= 1 && density <= 1.5,
      },
      {
        text: "URL ngắn gọn (< 75 ký tự)",
        checked:
          (slug || "").length > 0 &&
          (slug || "").length <= MAX_SLUG_LENGTH,
      },
      {
        text: "Có ít nhất một link ngoài (DoFollow)",
        checked: hasExternalLink,
      },
      {
        text: "Có ít nhất một link nội bộ",
        checked: hasInternalLink,
      },
    ],
    title: [
      {
        text: "SEO Title chứa từ khóa chính",
        checked: titleContainsKeyword,
      },
      {
        text: "Tiêu đề có chứa con số (vd: 10, 5)",
        checked: titleHasNumber,
      },
    ],
  } as const;

  const totalChecks =
    seoChecks.basic.length + seoChecks.advanced.length + seoChecks.title.length;
  const passedChecks = [
    ...seoChecks.basic,
    ...seoChecks.advanced,
    ...seoChecks.title,
  ].filter((c) => c.checked).length;
  const seoScore = Math.round((passedChecks / totalChecks) * 100);

  return (
    <div className="container mx-auto p-4 h-screen overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Viết bài mới
        </h1>
        <div>
          <Button variant="outline" className="mr-2">
            Lưu nháp
          </Button>
          <Button>Đăng bài</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 h-[calc(100vh-5rem)]">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4 overflow-y-auto pr-2">
          <Input
            placeholder="Post Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold"
          />
          <div className="rounded-md bg-muted/40">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={setContent}
              onChangeSelection={handleEditorSelection}
              className="h-full rounded-md shadow-sm"
              style={{ height: "calc(100vh - 240px)" }}
              modules={{
                toolbar: {
                  container: [
                    ["paragraph-btn", "h1-btn", "h2-btn", "h3-btn"],
                    ["bold", "italic", "underline", "strike", "blockquote"],
                    [{ list: "ordered" }, { list: "bullet" }],
                    ["link", "image", "video-btn"],
                    ["ai-rewrite"],
                    ["clean"],
                  ],
                  handlers: {
                    "ai-rewrite": handleOpenRewriteModal,
                    "paragraph-btn": () => {
                      if (quillRef.current) {
                        const editor = quillRef.current.getEditor();
                        editor.formatLine(
                          editor.getSelection().index,
                          1,
                          {
                            header: false,
                          }
                        );
                      }
                    },
                    "h1-btn": () => {
                      if (quillRef.current) {
                        const editor = quillRef.current.getEditor();
                        editor.formatLine(
                          editor.getSelection().index,
                          1,
                          { header: 1 }
                        );
                      }
                    },
                    "h2-btn": () => {
                      if (quillRef.current) {
                        const editor = quillRef.current.getEditor();
                        editor.formatLine(
                          editor.getSelection().index,
                          1,
                          { header: 2 }
                        );
                      }
                    },
                    "h3-btn": () => {
                      if (quillRef.current) {
                        const editor = quillRef.current.getEditor();
                        editor.formatLine(
                          editor.getSelection().index,
                          1,
                          { header: 3 }
                        );
                      }
                    },
                    "video-btn": handleInsertVideo,
                  },
                },
              }}
            />
            {/* Center only the typing area like a paper */}
            <style>{`
              .ql-toolbar.ql-snow {
                border-radius: 8px 8px 0 0;
                position: sticky;
                top: 0;
                z-index: 10;
                background: #fff;
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                padding: 8px;
                min-height: auto;
              }
              .ql-toolbar.ql-snow .ql-formats {
                display: flex;
                flex-wrap: nowrap;
                gap: 2px;
                margin-right: 0;
                margin-bottom: 0;
              }
              .ql-toolbar.ql-snow .ql-stroke {
                stroke: #444;
              }
              .ql-toolbar.ql-snow .ql-fill {
                fill: #444;
              }
              .ql-toolbar.ql-snow button:hover .ql-stroke,
              .ql-toolbar.ql-snow button:focus .ql-stroke,
              .ql-toolbar.ql-snow button.ql-active .ql-stroke {
                stroke: #1f2937;
              }
              .ql-toolbar.ql-snow button:hover .ql-fill,
              .ql-toolbar.ql-snow button:focus .ql-fill,
              .ql-toolbar.ql-snow button.ql-active .ql-fill {
                fill: #1f2937;
              }
              .ql-toolbar.ql-snow button.ql-picker-label {
                color: #444;
              }
              .ql-toolbar.ql-snow .ql-paragraph-btn::before {
                content: "P";
                font-weight: 700;
                font-size: 14px;
              }
              .ql-toolbar.ql-snow .ql-h1-btn::before {
                content: "H1";
                font-weight: 700;
                font-size: 12px;
              }
              .ql-toolbar.ql-snow .ql-h2-btn::before {
                content: "H2";
                font-weight: 700;
                font-size: 12px;
              }
              .ql-toolbar.ql-snow .ql-h3-btn::before {
                content: "H3";
                font-weight: 700;
                font-size: 12px;
              }
              .ql-toolbar.ql-snow .ql-video-btn::before {
                content: "▶";
                font-size: 14px;
              }
              .ql-toolbar.ql-snow .ql-ai-rewrite::before {
                content: "⚡ AI";
                font-size: 12px;
                font-weight: 600;
              }
              .ql-toolbar.ql-snow .ql-ai-rewrite {
                background-color: #dbeafe;
                border-radius: 4px;
                padding: 4px 8px;
              }
              .ql-toolbar.ql-snow .ql-ai-rewrite:hover {
                background-color: #bfdbfe;
              }
              img {
                    margin: auto;
                }
              .ql-container.ql-snow {
                border-radius: 0 0 8px 8px;
                background: #f7f7f7; /* gray gutters */
                padding-left: 24px;
                padding-right: 24px;
              }
              .ql-container .ql-editor {
                max-width: 860px;
                margin: 0 auto;
                padding: 24px;
                background: #fff; /* white paper */
                box-shadow: 0 1px 2px rgba(0,0,0,0.06);
                font-size: 16px; /* larger font size */
                line-height: 1.8; /* improved readability */
              }
              .ql-container .ql-editor p {
                margin: 16px 0; /* spacing between paragraphs */
              }
              /* Make the gray gutters visible by adding horizontal padding */
              .ql-container.ql-snow .ql-editor {
                /* already centered; ensure container has space */
              }
            `}</style>
          </div>
          <div className="text-right text-sm text-muted-foreground pt-10">
            {wordCount} words
          </div>
        </div>

        {/* Sidebar with Tabs */}
        <div className="flex flex-col h-full overflow-hidden pl-2">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 border-b flex-shrink-0">
            {["seo", "ai", "images", "video"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-3 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab === "seo"
                  ? "SEO"
                  : tab === "ai"
                    ? "AI"
                    : tab === "images"
                      ? "Hình ảnh"
                      : "Video"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* SEO Tab */}
            {activeTab === "seo" && (
              <>
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="flex justify-between items-center text-base">
                      <span>SEO Score</span>
                      <span className="font-bold">{seoScore}%</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Progress value={seoScore} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="flex justify-between items-center text-base">
                      <span>SERP Preview</span>
                      <Dialog
                        open={isSerpModalOpen}
                        onOpenChange={setIsSerpModalOpen}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogOverlay className="bg-black/30" />
                        <DialogContent className="sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-bold">
                              Google Search Result Preview
                            </DialogTitle>
                            <DialogDescription>
                              Tùy chọn này tương thích với plugin RankMath và
                              Yoast SEO
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-6 py-4">
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <Label
                                  htmlFor="meta-title"
                                  className="font-semibold text-base"
                                >
                                  Tiêu đề (SEO Title)
                                </Label>
                                <span className="text-sm text-muted-foreground">
                                  {metaTitle.length}/{MAX_META_TITLE_LENGTH}
                                </span>
                              </div>
                              <Input
                                id="meta-title"
                                value={metaTitle}
                                onChange={(e) =>
                                  setMetaTitle(e.target.value)
                                }
                                maxLength={MAX_META_TITLE_LENGTH}
                              />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <Label
                                  htmlFor="slug"
                                  className="font-semibold text-base"
                                >
                                  Permalink
                                </Label>
                                <span className="text-sm text-muted-foreground">
                                  {slug.length}/{MAX_SLUG_LENGTH}
                                </span>
                              </div>
                              <Input
                                id="slug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                maxLength={MAX_SLUG_LENGTH}
                              />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                  <Label
                                    htmlFor="meta-description"
                                    className="font-semibold text-base"
                                  >
                                    Giới thiệu ngắn
                                  </Label>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 h-auto text-blue-600 font-semibold"
                                  >
                                    AI Rewrite{" "}
                                    <Zap className="w-3 h-3 ml-1" />
                                  </Button>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {metaDescription.length}/
                                  {MAX_META_DESC_LENGTH}
                                </span>
                              </div>
                              <Textarea
                                id="meta-description"
                                value={metaDescription}
                                onChange={(e) =>
                                  setMetaDescription(e.target.value)
                                }
                                maxLength={MAX_META_DESC_LENGTH}
                                rows={4}
                                placeholder="Tùy chọn giới thiệu trên Serp"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              type="submit"
                              onClick={() => setIsSerpModalOpen(false)}
                              size="lg"
                            >
                              Update
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-sm text-blue-600 truncate">
                      {metaTitle || title || "SEO Title"}
                    </div>
                    <div className="text-sm text-green-600 truncate">
                      https://volxai.com/{slug || ""}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {metaDescription ||
                        "Meta description preview will appear here."}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-base flex justify-between items-center">
                      <span>Từ khóa</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-blue-600"
                      >
                        In Đậm
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Input
                      placeholder="Nhập từ khoá và nhấn Enter"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={handleKeywordKeyDown}
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {keywords.map((keyword, index) => (
                        <div
                          key={index}
                          className="flex items-center bg-blue-100 text-blue-700 text-sm font-medium px-2 py-1 rounded-md"
                        >
                          <span>{keyword}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 ml-1"
                            onClick={() => removeKeyword(keyword)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Accordion
                  type="single"
                  collapsible
                  className="w-full"
                  value={accordionValue}
                  onValueChange={setAccordionValue}
                >
                  <AccordionItem value="basic">
                    <AccordionTrigger>
                      SEO Cơ bản (
                      {
                        seoChecks.basic.filter((c) => !c.checked)
                          .length
                      }{" "}
                      Errors)
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {seoChecks.basic.map((item, index) => (
                          <SeoChecklistItem
                            key={index}
                            text={item.text}
                            checked={item.checked}
                          />
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="advanced">
                    <AccordionTrigger>
                      Nâng cao (
                      {
                        seoChecks.advanced.filter((c) => !c.checked)
                          .length
                      }{" "}
                      Errors)
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {seoChecks.advanced.map((item, index) => (
                          <SeoChecklistItem
                            key={index}
                            text={item.text}
                            checked={item.checked}
                          />
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="title">
                    <AccordionTrigger>
                      Tiêu đề thu hút (
                      {
                        seoChecks.title.filter((c) => !c.checked)
                          .length
                      }{" "}
                      Errors)
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {seoChecks.title.map((item, index) => (
                          <SeoChecklistItem
                            key={index}
                            text={item.text}
                            checked={item.checked}
                          />
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </>
            )}

            {/* Images Tab */}
            {activeTab === "images" && (
              <div className="space-y-4">
                {isSearchingImages && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                )}

                {searchedImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {searchedImages.map((image, index) => (
                      <div
                        key={index}
                        className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-200 aspect-square"
                        onClick={() => {
                          if (quillRef.current && cursorPosition !== null) {
                            const editor = quillRef.current.getEditor();
                            // Insert image at cursor position
                            editor.insertEmbed(
                              cursorPosition,
                              "image",
                              image.original || image.thumbnail
                            );
                            // Move cursor to right of the image
                            editor.setSelection(cursorPosition + 1);
                          }
                        }}
                      >
                        <img
                          src={image.thumbnail || image.original}
                          alt={image.title || `Image ${index + 1}`}
                          className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="text-white font-medium text-sm">
                            Click to Insert
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isSearchingImages && searchedImages.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                    <ImageIcon className="w-12 h-12 mb-2 opacity-30" />
                    <p className="text-sm">
                      Chọn từ khóa và nhấp "Find Image" để tìm hình ảnh
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* AI Tab */}
            {activeTab === "ai" && (
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-base">AI Tools</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={handleOpenRewriteModal}
                    disabled={!selectedText}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Rewrite Text
                  </Button>
                  <p className="text-xs text-gray-500">
                    Chọn text trong editor để sử dụng các công cụ AI
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Video Tab */}
            {activeTab === "video" && (
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-base">Video</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Button
                    className="w-full"
                    onClick={handleInsertVideo}
                  >
                    Insert Video
                  </Button>
                  <p className="text-xs text-gray-500 mt-3">
                    Click để chèn video YouTube hoặc URL video trực tiếp
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Floating Selection Toolbar */}
      {floatingToolbarVisible && selectedText && (
        <SelectionToolbar
          selectedText={selectedText}
          onAIRewrite={handleOpenRewriteModal}
          onFindImage={handleFindImage}
          onWriteMore={handleWriteMore}
          isLoading={isRewriting || isSearchingImages}
        />
      )}

      {/* AI Rewrite Modal */}
      <Dialog open={isRewriteModalOpen} onOpenChange={setIsRewriteModalOpen}>
        <DialogOverlay className="bg-black/30" />
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Zap className="w-5 h-5 text-blue-600" />
              AI Rewrite
            </DialogTitle>
            <DialogDescription>
              Select how you'd like to rewrite the selected text
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-3 bg-muted/40 rounded-lg max-h-24 overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              <strong>Selected text:</strong> {selectedText}
            </p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rewriteOptions.map((option) => (
              <Button
                key={option.style}
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => handleRewriteText(option.style)}
                disabled={isRewriting}
              >
                {isRewriting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {option.label}
                  </>
                ) : (
                  <>{option.label}</>
                )}
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRewriteModalOpen(false)}
              disabled={isRewriting}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
