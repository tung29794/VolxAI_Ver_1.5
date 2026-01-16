import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/lib/api";
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
import {
  CheckCircle,
  XCircle,
  X,
  Zap,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import { buildApiUrl } from "@/lib/api";
import { toast } from "sonner";
import MemoizedQuill from "@/components/MemoizedQuill";
import PublishModal from "@/components/PublishModal";
import { TokenUpgradeModal } from "@/components/TokenUpgradeModal";
import { useAuth } from "@/contexts/AuthContext";

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

interface ArticleEditorProps {
  hideFeaturedImage?: boolean; // Prop to hide featured image section
}

export default function ArticleEditor({ hideFeaturedImage = false }: ArticleEditorProps) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth(); // Get current user from AuthContext
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("vi"); // Language for AI rewrite
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  // Determine if this is user mode (write-article page)
  const isUserMode = location.pathname.includes('/write-article');
  
  // Check if user is admin
  const isAdmin = user?.role === "admin";

  const [metaTitle, setMetaTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [isLoading, setIsLoading] = useState(!!id);
  const [articleStatus, setArticleStatus] = useState<"draft" | "published" | "archived">("draft");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  
  // Website info for synced articles
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null);
  
  // Publish Modal state
  const [showPublishModal, setShowPublishModal] = useState(false);
  
  // Token Modal state
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenModalData, setTokenModalData] = useState<{
    remainingTokens: number;
    requiredTokens: number;
    featureName: string;
  }>({
    remainingTokens: 0,
    requiredTokens: 0,
    featureName: "",
  });
  
  // Token balance tracking
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  
  // Article limits tracking
  const [articleLimits, setArticleLimits] = useState<{
    used: number;
    limit: number;
  } | null>(null);
  
  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Load article data if ID is provided
  useEffect(() => {
    if (!id) return;

    const loadArticle = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(buildApiUrl(`/api/articles/${id}`), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          toast.error("Không thể tải bài viết");
          return;
        }

        const data = await response.json();
        const article = data.article;

        setTitle(article.title || "");
        setContent(article.content || "");
        setMetaTitle(article.meta_title || "");
        setMetaDescription(article.meta_description || "");
        setSlug(article.slug || "");
        setFeaturedImage(article.featured_image || "");
        setKeywords(article.keywords || []);
        setArticleStatus(article.status || "draft");
        
        // Set website URL if article was synced from WordPress
        if (article.website_url) {
          setWebsiteUrl(article.website_url);
        }
      } catch (error) {
        console.error("Error loading article:", error);
        toast.error("Có lỗi xảy ra khi tải bài viết");
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [id]);
  
  // Load user token balance
  useEffect(() => {
    const loadTokenBalance = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await fetch(buildApiUrl("/api/auth/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        if (data.success && data.subscription) {
          // Use tokens_remaining (actual balance) instead of tokens_limit (plan limit)
          setTokenBalance(data.subscription.tokens_remaining || 0);
          
          // Set article limits (only for non-admin users)
          if (data.user?.role !== "admin") {
            setArticleLimits({
              used: data.subscription.articles_used_this_month || 0,
              limit: data.subscription.articles_limit || 0,
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch token balance:", error);
      }
    };

    loadTokenBalance();
  }, []);
  
  // Function to update token balance after AI operations
  const updateTokenBalance = (remainingTokens: number) => {
    setTokenBalance(remainingTokens);
  };
  
  // Track changes to mark as unsaved
  useEffect(() => {
    // Skip tracking if still loading initial data
    if (isLoading) return;
    
    // Mark as changed whenever user edits
    setHasUnsavedChanges(true);
  }, [content, title, metaTitle, metaDescription, slug, keywords, featuredImage]);
  
  // Prevent browser navigation/close when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
  
  // Intercept navigation attempts
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href && !link.href.includes(window.location.pathname)) {
        e.preventDefault();
        e.stopPropagation();
        setPendingNavigation(link.href);
        setShowExitConfirm(true);
      }
    };
    
    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [hasUnsavedChanges]);
  
  const [isSerpModalOpen, setIsSerpModalOpen] = useState(false);
  const [accordionValue, setAccordionValue] = useState("basic");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingArticleTitle, setIsGeneratingArticleTitle] = useState(false);

  // AI Rewrite states
  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{index: number, length: number} | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  // Floating toolbar and image search states
  const [floatingToolbarVisible, setFloatingToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
  const [searchedImages, setSearchedImages] = useState<any[]>([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [activeTab, setActiveTab] = useState("seo"); // seo, ai, images, video
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [savedCursorPosition, setSavedCursorPosition] = useState<number | null>(null); // Saved position for inserting images

  // Track cursor position whenever it changes in the editor
  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      
      const handleSelectionChange = (range: any) => {
        if (range) {
          // Save the cursor position whenever it changes
          setSavedCursorPosition(range.index);
        }
      };
      
      editor.on('selection-change', handleSelectionChange);
      
      return () => {
        editor.off('selection-change', handleSelectionChange);
      };
    }
  }, [quillRef.current]);

  // Prevent link clicks in editor - allow editing instead
  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const editorContainer = editor.root;

      const handleLinkClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const linkEl = target.closest('a');
        if (!linkEl) return;

        e.preventDefault();
        e.stopPropagation();

        // Compute position and length of link text inside editor
        const linkText = linkEl.textContent || '';
        const linkLength = linkText.length;
        const linkPosition = getNodePosition(linkEl, editorContainer);

        // Set selection to the link text
        editor.setSelection(linkPosition, linkLength);

        // Prompt user to edit or remove link
        const currentHref = linkEl.getAttribute('href') || '';
        const newHref = window.prompt('Edit link URL (leave empty to remove):', currentHref);
        if (newHref === null) {
          // user cancelled
          return;
        }

        if (newHref.trim() === '') {
          // remove link format
          editor.formatText(linkPosition, linkLength, 'link', false);
        } else {
          // apply new link
          editor.formatText(linkPosition, linkLength, 'link', newHref.trim());
        }
      };

      editorContainer.addEventListener('click', handleLinkClick, true);

      return () => {
        editorContainer.removeEventListener('click', handleLinkClick, true);
      };
    }
  }, [quillRef.current]);

  // Helper function to get the position of a node in the editor
  const getNodePosition = (node: Node, container: Node): number => {
    let position = 0;
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      if (currentNode === node || currentNode.parentElement === node) {
        break;
      }
      position += currentNode.textContent?.length || 0;
    }

    return position;
  };

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

  const handleOpenRewriteModal = useCallback(() => {
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
  }, []);

  const handleRewriteText = async (style: RewriteStyle) => {
    if (!selectedText || !quillRef.current) return;

    setIsRewriting(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/ai/rewrite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: selectedText,
          style,
          language, // Add language parameter
        }),
      });

      // Check for insufficient tokens (402 Payment Required)
      if (response.status === 402) {
        const data = await response.json();
        setTokenModalData({
          remainingTokens: data.remainingTokens || 0,
          requiredTokens: data.requiredTokens || 0,
          featureName: data.featureName || "AI Rewrite",
        });
        setShowTokenModal(true);
        setIsRewriteModalOpen(false);
        return;
      }

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
      
      // Show success toast with token info if available
      if (data.tokensUsed) {
        toast.success(`Rewrite thành công! Đã sử dụng ${data.tokensUsed} tokens. Còn lại: ${data.remainingTokens} tokens`);
        // Update token balance in state
        updateTokenBalance(data.remainingTokens);
      }
    } catch (error) {
      console.error("Error rewriting text:", error);
      toast.error("Không thể rewrite văn bản. Vui lòng thử lại.");
    } finally {
      setIsRewriting(false);
    }
  };

  const handleInsertVideo = useCallback(() => {
    if (!quillRef.current) return;

    const videoUrl = prompt("Nhập URL video YouTube hoặc URL video:");
    if (!videoUrl) return;

    const editor = quillRef.current.getEditor();
    const selection = editor.getSelection();

    if (selection) {
      // Handle YouTube URLs
      if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
        let videoId = "";

        // Extract video ID from different YouTube URL formats
        if (videoUrl.includes("youtube.com/watch?v=")) {
          videoId = videoUrl.split("v=")[1].split("&")[0];
        } else if (videoUrl.includes("youtu.be/")) {
          videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
        }

        if (videoId) {
          const embedUrl = `https://www.youtube.com/embed/${videoId}`;
          editor.insertEmbed(selection.index, "video", embedUrl);
          editor.setSelection({ index: selection.index + 1, length: 0 });
          return;
        }
      }

      // For regular video URLs (mp4, webm, etc.)
      editor.insertEmbed(selection.index, "video", videoUrl);
      editor.setSelection({ index: selection.index + 1, length: 0 });
    }
  }, []);

  // Handler for floating toolbar - Find Image
  const handleFindImage = async () => {
    if (!selectedText) return;

    // Get the current selection/cursor position from editor
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const selection = editor.getSelection();
      // Save position: use selection end if selected, otherwise use current position
      if (selection) {
        setSavedCursorPosition(selection.index + selection.length);
      }
    }

    setIsSearchingImages(true);
    setActiveTab("images");

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/ai/find-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          keyword: selectedText,
        }),
      });

      // Check for insufficient tokens (402 Payment Required)
      if (response.status === 402) {
        const data = await response.json();
        setTokenModalData({
          remainingTokens: data.remainingTokens || 0,
          requiredTokens: data.requiredTokens || 0,
          featureName: data.featureName || "Find Image",
        });
        setShowTokenModal(true);
        setActiveTab("editor");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to find images");
      }

      const data = await response.json();
      setSearchedImages(data.images || []);
      
      // Show success toast with token info if available
      if (data.tokensUsed) {
        toast.success(`Tìm ảnh thành công! Đã sử dụng ${data.tokensUsed} tokens. Còn lại: ${data.remainingTokens} tokens`);
        // Update token balance in state
        updateTokenBalance(data.remainingTokens);
      }
    } catch (error) {
      console.error("Error finding images:", error);
      toast.error("Không thể tìm ảnh. Vui lòng thử lại.");
    } finally {
      setIsSearchingImages(false);
    }
  };

  // Handler for floating toolbar - Write More
  const handleWriteMore = async () => {
    if (!quillRef.current) return;

    setIsRewriting(true);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/ai/write-more`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content,
          title: title,
          keywords: keywords,
          language: language, // Send selected language
        }),
      });

      // Check for insufficient tokens (402 Payment Required)
      if (response.status === 402) {
        const data = await response.json();
        setTokenModalData({
          remainingTokens: data.remainingTokens || 0,
          requiredTokens: data.requiredTokens || 0,
          featureName: data.featureName || "Write More",
        });
        setShowTokenModal(true);
        setFloatingToolbarVisible(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to write more");
      }

      const data = await response.json();
      const writtenContent = data.writtenContent;

      // Insert after selected text position (not at the end of document)
      const editor = quillRef.current.getEditor();
      
      if (selectionRange) {
        // Calculate insertion point: after the selected text
        const insertPosition = selectionRange.index + selectionRange.length;
        
        // Insert the new content after the selection with single line break
        editor.insertText(insertPosition, "\n" + writtenContent);
        
        // Set cursor to the end of newly inserted content
        editor.setSelection(insertPosition + writtenContent.length + 1);
      } else {
        // Fallback: append to end if no selection range stored
        const length = editor.getLength();
        editor.insertText(length - 1, "\n" + writtenContent);
        editor.setSelection(length + writtenContent.length);
      }

      setFloatingToolbarVisible(false);
      setSelectedText("");
      setSelectionRange(null);
      
      // Show success toast with token info if available
      if (data.tokensUsed) {
        toast.success(`Write More thành công! Đã sử dụng ${data.tokensUsed} tokens. Còn lại: ${data.remainingTokens} tokens`);
        // Update token balance in state
        updateTokenBalance(data.remainingTokens);
      }
    } catch (error) {
      console.error("Error writing more:", error);
      toast.error("Không thể viết thêm nội dung. Vui lòng thử lại.");
    } finally {
      setIsRewriting(false);
    }
  };

  // Detect text selection in Quill - Using manual selection tracking instead of onChangeSelection
  const handleEditorSelectionManual = useCallback(() => {
    if (!quillRef.current) return;

    const editor = quillRef.current.getEditor();
    const selection = editor.getSelection();

    if (selection && selection.length > 0) {
      const text = editor.getText(selection.index, selection.length).trim();
      if (text) {
        setSelectedText(text);
        // Store selection range for Write More feature
        setSelectionRange({ index: selection.index, length: selection.length });
        // Store the END position of selection as cursor position for inserting images after selection
        setCursorPosition(selection.index + selection.length);
        setFloatingToolbarVisible(true);

        // Calculate position from selected text bounds
        const quillSelection = window.getSelection();
        if (quillSelection && quillSelection.rangeCount > 0) {
          const range = quillSelection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Position toolbar BELOW the selected text
          setToolbarPosition({
            top: rect.bottom + 10, // Below the selection with 10px padding
            left: rect.left + rect.width / 2 - 150, // Center horizontally
          });
        }
      }
    } else {
      setFloatingToolbarVisible(false);
      setToolbarPosition(null);
      setSelectedText("");
      setSelectionRange(null);
    }
  }, []);

  const removeKeyword = (keywordToRemove) => {
    setKeywords(keywords.filter((keyword) => keyword !== keywordToRemove));
  };

  // Auto-generate permalink from metaTitle
  useEffect(() => {
    if (metaTitle && metaTitle.trim()) {
      setSlug(generateSlug(metaTitle));
    }
  }, [metaTitle]);

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

  // AI Generate SEO Title
  const handleGenerateSeoTitle = async () => {
    if (!keywords.length && !title) {
      toast.error("Vui lòng nhập từ khóa hoặc tiêu đề bài viết");
      return;
    }

    setIsGeneratingTitle(true);
    try {
      const response = await fetch(buildApiUrl("/api/ai/generate-seo-title"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          keyword: keywords[0] || title,
          language: language,
        }),
      });

      // Check for insufficient tokens (402 Payment Required)
      if (response.status === 402) {
        const data = await response.json();
        setTokenModalData({
          remainingTokens: data.remainingTokens || 0,
          requiredTokens: data.requiredTokens || 0,
          featureName: data.featureName || "Generate SEO Title",
        });
        setShowTokenModal(true);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to generate SEO title");
      }

      const data = await response.json();
      setMetaTitle(data.title);
      
      // Show success toast with token info if available
      if (data.tokensUsed) {
        toast.success(`Đã tạo SEO Title! Đã sử dụng ${data.tokensUsed} tokens. Còn lại: ${data.remainingTokens} tokens`);
        // Update token balance in state
        updateTokenBalance(data.remainingTokens);
      } else {
        toast.success("Đã tạo SEO Title");
      }
    } catch (error) {
      console.error("Error generating SEO title:", error);
      toast.error("Không thể tạo SEO Title");
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  // AI Generate Meta Description
  const handleGenerateMetaDescription = async () => {
    if (!keywords.length && !title && !content) {
      toast.error("Vui lòng nhập từ khóa, tiêu đề hoặc nội dung bài viết");
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const response = await fetch(buildApiUrl("/api/ai/generate-meta-description"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          keyword: keywords[0] || title,
          content: content.substring(0, 500), // Send first 500 chars of content
          language: language,
        }),
      });

      // Check for insufficient tokens (402 Payment Required)
      if (response.status === 402) {
        const data = await response.json();
        setTokenModalData({
          remainingTokens: data.remainingTokens || 0,
          requiredTokens: data.requiredTokens || 0,
          featureName: data.featureName || "Generate Meta Description",
        });
        setShowTokenModal(true);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to generate meta description");
      }

      const data = await response.json();
      setMetaDescription(data.description);
      
      // Show success toast with token info if available
      if (data.tokensUsed) {
        toast.success(`Đã tạo Meta Description! Đã sử dụng ${data.tokensUsed} tokens. Còn lại: ${data.remainingTokens} tokens`);
        // Update token balance in state
        updateTokenBalance(data.remainingTokens);
      } else {
        toast.success("Đã tạo Meta Description");
      }
    } catch (error) {
      console.error("Error generating meta description:", error);
      toast.error("Không thể tạo Meta Description");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // AI Generate Article Title from Keyword
  const handleGenerateArticleTitle = async () => {
    if (!keywords.length) {
      toast.error("Vui lòng nhập từ khóa để tạo tiêu đề bài viết");
      return;
    }

    setIsGeneratingArticleTitle(true);
    try {
      const response = await fetch(buildApiUrl("/api/ai/generate-article-title"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          keyword: keywords[0],
          language: language,
        }),
      });

      // Check for insufficient tokens (402 Payment Required)
      if (response.status === 402) {
        const data = await response.json();
        setTokenModalData({
          remainingTokens: data.remainingTokens || 0,
          requiredTokens: data.requiredTokens || 0,
          featureName: data.featureName || "Generate Article Title",
        });
        setShowTokenModal(true);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to generate article title");
      }

      const data = await response.json();
      setTitle(data.title);
      
      // Show success toast with token info if available
      if (data.tokensUsed) {
        toast.success(`Đã tạo tiêu đề bài viết! Đã sử dụng ${data.tokensUsed} tokens. Còn lại: ${data.remainingTokens} tokens`);
        // Update token balance in state
        updateTokenBalance(data.remainingTokens);
      } else {
        toast.success("Đã tạo tiêu đề bài viết");
      }
    } catch (error) {
      console.error("Error generating article title:", error);
      toast.error("Không thể tạo tiêu đề bài viết");
    } finally {
      setIsGeneratingArticleTitle(false);
    }
  };

  // Upload image to server
  const handleUploadImage = async (file: File): Promise<string> => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Bạn cần đăng nhập để tải ảnh lên");
      }

      const response = await fetch(buildApiUrl("/api/upload/image"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload image");
      }

      const data = await response.json();
      toast.success("Đã tải ảnh lên thành công");
      return data.url;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Không thể tải ảnh lên");
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveArticle = async (status: "draft" | "published") => {
    // Validation
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề bài viết");
      return;
    }

    if (!content.trim()) {
      toast.error("Vui lòng nhập nội dung bài viết");
      return;
    }

    // If published, open modal instead of direct save
    if (status === "published") {
      // First save as draft to get article ID
      if (!id) {
        await handleSaveDraft();
      }
      // Always open PublishModal (full features for everyone)
      setShowPublishModal(true);
      return;
    }

    // If draft, save directly
    await handleSaveDraft();
  };

  const handleSaveDraft = async () => {
    const finalSlug = slug.trim() || generateSlug(title);
    setIsPublishing(true);

    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Bạn cần đăng nhập để lưu bài viết");
      }

      const response = await fetch(`${API_BASE_URL}/api/articles/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          id: id ? parseInt(id) : undefined,
          title: title.trim(),
          content,
          metaTitle: metaTitle.trim() || title.trim(),
          metaDescription: metaDescription.trim(),
          slug: finalSlug,
          keywords,
          featuredImage,
          status: "draft",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save article");
      }

      const data = await response.json();
      
      // Update article ID if this was a new article
      if (!id && data.id) {
        window.history.replaceState(
          null,
          "",
          isUserMode ? `/write-article/${data.id}` : `/admin/articles/${data.id}`
        );
      }

      // Mark as saved
      setHasUnsavedChanges(false);
      toast.success("Bài viết đã được lưu nháp!");

      return data;
    } catch (error) {
      console.error("Error saving article:", error);
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu bài viết"
      );
      throw error;
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishSuccess = () => {
    // Mark as saved
    setHasUnsavedChanges(false);
    
    // Redirect based on user role (not just pathname)
    // User role → /account, Admin role → /admin
    const redirectUrl = user?.role === "admin" ? "/admin" : "/account";
    setTimeout(() => {
      navigate(redirectUrl);
    }, 1000);
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

  // Memoize modules object to prevent Quill remount on every render
  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [false, 1, 2, 3] }], // This will auto-highlight based on cursor position
        ["bold", "italic", "underline", "strike", "blockquote"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image", "video-btn"],
        ["clean"],
      ],
      handlers: {
        "video-btn": handleInsertVideo,
      },
    },
  }), [handleInsertVideo]);

  const wordCountContent = useMemo(
    () =>
      content
        .replace(/<[^>]*>/g, " ")
        .split(/\s+/)
        .filter(Boolean).length,
    [content],
  );
  const keywordOccurrences = useMemo(() => {
    const plain = normalize(content.replace(/<[^>]*>/g, " "));
    const totals = keywords.map((k) => {
      const nk = normalize(k);
      if (!nk) return 0;
      const regex = new RegExp(nk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      return (plain.match(regex) || []).length;
    });
    return totals.reduce((a, b) => a + b, 0);
  }, [content, keywords]);
  const density = useMemo(() => {
    if (wordCountContent === 0) return 0;
    return +((keywordOccurrences / wordCountContent) * 100).toFixed(2);
  }, [keywordOccurrences, wordCountContent]);

  const hasExternalLink = useMemo(
    () => /<a[^>]+href="http(s)?:\/\//i.test(content),
    [content],
  );
  const hasInternalLink = useMemo(
    () => /<a[^>]+href="\//i.test(content),
    [content],
  );
  const hasImageWithAlt = useMemo(
    () => /<img[^>]*alt=\"[^\"]+\"/i.test(content),
    [content],
  );
  const hasH2H3 = useMemo(() => /<h2>|<h3>/i.test(content), [content]);

  const focusKeywords = keywords.length ? [keywords[0]] : []; // primary focus keyword is the first

  const titleHasKeyword = containsAny(
    metaTitle || title,
    focusKeywords.length ? focusKeywords : keywords,
  );
  const descHasKeyword = containsAny(
    metaDescription,
    focusKeywords.length ? focusKeywords : keywords,
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
    focusKeywords.length ? focusKeywords : keywords,
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
          focusKeywords.length ? focusKeywords : keywords,
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
      focusKeywords.length ? focusKeywords : keywords,
    );
  }, [content, keywords, focusKeywords]);

  const titleContainsKeyword = containsAny(
    metaTitle || title,
    focusKeywords.length ? focusKeywords : keywords,
  );
  const titleHasNumber = /(\d+)/.test(metaTitle || title);

  const seoChecks = {
    basic: [
      {
        text: "Không thấy từ khóa chính trên SEO title",
        checked: titleHasKeyword,
      },
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
          hasH2H3 && containsAny(content.replace(/<[^>]*>/g, " "), keywords),
      },
      { text: "Có thẻ IMG với alt", checked: hasImageWithAlt },
      {
        text: `Mật độ từ khóa trong mức 1% - 1.5% (hiện tại ${density}%)`,
        checked: density >= 1 && density <= 1.5,
      },
      {
        text: "URL ngắn gọn (< 75 ký tự)",
        checked:
          (slug || "").length > 0 && (slug || "").length <= MAX_SLUG_LENGTH,
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
        <div className="flex items-center gap-3">
          {/* Article Limits Display (only for non-admin users) */}
          {!isAdmin && articleLimits !== null && (
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/10 border border-secondary/20 rounded-lg">
              <span className="text-sm font-medium text-foreground">
                📝 {articleLimits.used}/{articleLimits.limit} bài
              </span>
            </div>
          )}
          
          {/* Token Balance Display */}
          {tokenBalance !== null && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {tokenBalance.toLocaleString("vi-VN")} Token
              </span>
            </div>
          )}
          
          <Button
            variant="outline"
            className="mr-2"
            onClick={() => handleSaveArticle("draft")}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Lưu nháp"
            )}
          </Button>
          <Button
            onClick={() => handleSaveArticle("published")}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {articleStatus === "published" ? "Đang cập nhật..." : "Đang đăng..."}
              </>
            ) : (
              articleStatus === "published" ? "Cập nhật" : "Đăng bài"
            )}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 h-[calc(100vh-5rem)]">
        {/* Main Content */}
        <div className="lg:col-span-3 flex flex-col h-full overflow-y-auto pr-2">
          <div className="flex gap-3 flex-shrink-0">
            <div className="flex-1 flex items-center gap-2">
              <Input
                placeholder="Post Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold flex-1"
              />
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-blue-600 font-semibold whitespace-nowrap"
                onClick={handleGenerateArticleTitle}
                disabled={isGeneratingArticleTitle}
              >
                {isGeneratingArticleTitle ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    AI Rewrite <Zap className="w-3 h-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm min-w-[150px]"
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="pt">Português</option>
              <option value="ru">Русский</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <div className="rounded-md bg-muted/40 flex-1 overflow-hidden flex flex-col mt-4">
            <MemoizedQuill
              quillRef={quillRef}
              content={content}
              setContent={setContent}
              modules={quillModules}
              onSelectionChange={handleEditorSelectionManual}
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
              
              /* Header picker styles - auto-highlights based on cursor position */
              .ql-toolbar.ql-snow .ql-picker.ql-header {
                width: 120px;
              }
              .ql-toolbar.ql-snow .ql-picker.ql-header .ql-picker-label::before {
                content: "Normal";
                font-weight: 600;
                font-size: 13px;
              }
              .ql-toolbar.ql-snow .ql-picker.ql-header .ql-picker-label[data-value="1"]::before {
                content: "Heading 1";
              }
              .ql-toolbar.ql-snow .ql-picker.ql-header .ql-picker-label[data-value="2"]::before {
                content: "Heading 2";
              }
              .ql-toolbar.ql-snow .ql-picker.ql-header .ql-picker-label[data-value="3"]::before {
                content: "Heading 3";
              }
              .ql-toolbar.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="1"]::before {
                content: "Heading 1";
                font-size: 20px;
                font-weight: 700;
              }
              .ql-toolbar.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="2"]::before {
                content: "Heading 2";
                font-size: 18px;
                font-weight: 700;
              }
              .ql-toolbar.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before {
                content: "Heading 3";
                font-size: 16px;
                font-weight: 700;
              }
              .ql-toolbar.ql-snow .ql-picker.ql-header .ql-picker-item:not([data-value])::before {
                content: "Normal";
              }
              /* Highlight active picker */
              .ql-toolbar.ql-snow .ql-picker-label.ql-active,
              .ql-toolbar.ql-snow .ql-picker-item.ql-selected {
                background-color: #dbeafe;
                color: #1e40af;
              }
              .ql-toolbar.ql-snow .ql-video-btn::before {
                content: "▶";
                font-size: 14px;
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
              /* Heading styles - visual only, doesn't affect HTML output */
              .ql-container .ql-editor h2 {
                font-weight: 600;
                margin-top: 24px;
                margin-bottom: 12px;
              }
              .ql-container .ql-editor h3 {
                font-weight: 600;
                margin-top: 20px;
                margin-bottom: 10px;
              }
              .ql-container .ql-editor h4 {
                font-weight: 600;
                margin-top: 16px;
                margin-bottom: 8px;
              }
              /* Remove extra spacing after headings */
              .ql-container .ql-editor h2 + p,
              .ql-container .ql-editor h3 + p,
              .ql-container .ql-editor h4 + p {
                margin-top: 0;
              }
              /* Make the gray gutters visible by adding horizontal padding */
              .ql-container.ql-snow .ql-editor {
                /* already centered; ensure container has space */
              }
              /* Ensure Quill container is always interactive */
              .ql-container.ql-snow {
                z-index: 0;
                position: relative;
              }
              .ql-editor {
                cursor: text;
                outline: none;
              }
              /* Prevent dialog overlay from interfering with editor */
              .ql-container, .ql-toolbar {
                pointer-events: auto !important;
              }
            `}</style>
          </div>
          <div className="text-right text-sm text-muted-foreground pt-2 flex-shrink-0">
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
                        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                                <div className="flex items-center gap-2">
                                  <Label
                                    htmlFor="meta-title"
                                    className="font-semibold text-base"
                                  >
                                    Tiêu đề (SEO Title)
                                  </Label>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 h-auto text-blue-600 font-semibold"
                                    onClick={handleGenerateSeoTitle}
                                    disabled={isGeneratingTitle}
                                  >
                                    {isGeneratingTitle ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        AI Rewrite <Zap className="w-3 h-3 ml-1" />
                                      </>
                                    )}
                                  </Button>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {metaTitle.length}/{MAX_META_TITLE_LENGTH}
                                </span>
                              </div>
                              <Input
                                id="meta-title"
                                value={metaTitle}
                                onChange={(e) => setMetaTitle(e.target.value)}
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
                                    onClick={handleGenerateMetaDescription}
                                    disabled={isGeneratingDescription}
                                  >
                                    {isGeneratingDescription ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        AI Rewrite <Zap className="w-3 h-3 ml-1" />
                                      </>
                                    )}
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
                            {!hideFeaturedImage && isAdmin && (
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <Label
                                    htmlFor="featured-image"
                                    className="font-semibold text-base"
                                  >
                                    Ảnh đại diện
                                  </Label>
                                </div>
                                {featuredImage && (
                                  <div className="mb-3 relative">
                                    <img
                                      src={featuredImage}
                                      alt="Featured"
                                      className="w-full h-40 object-cover rounded-lg border border-gray-200"
                                    />
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="absolute top-2 right-2"
                                      onClick={() => setFeaturedImage("")}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                )}
                                <Input
                                  id="featured-image"
                                  type="url"
                                  value={featuredImage}
                                  onChange={(e) =>
                                    setFeaturedImage(e.target.value)
                                  }
                                  placeholder="Nhập URL ảnh đại diện hoặc tải lên"
                                  className="mb-2"
                                />
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      // Store the file for upload
                                      setSelectedImageFile(file);
                                      // Show preview using FileReader
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        const result = event.target
                                          ?.result as string;
                                        setFeaturedImage(result);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                  Hoặc tải lên một hình ảnh từ máy tính
                                </p>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button
                              type="submit"
                              onClick={async () => {
                                // Upload image if a file was selected and featured image is not hidden
                                if (!hideFeaturedImage && selectedImageFile) {
                                  try {
                                    const uploadedUrl = await handleUploadImage(selectedImageFile);
                                    setFeaturedImage(uploadedUrl);
                                    setSelectedImageFile(null); // Clear the file after upload
                                    toast.success("Ảnh đã được tải lên server");
                                  } catch (error) {
                                    // Error is already handled in handleUploadImage
                                    return; // Don't close modal if upload failed
                                  }
                                }
                                setIsSerpModalOpen(false);
                              }}
                              size="lg"
                              disabled={isUploadingImage}
                            >
                              {isUploadingImage ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Đang tải lên...
                                </>
                              ) : (
                                "Update"
                              )}
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
                      {(() => {
                        // For non-admin users
                        if (!isAdmin) {
                          // If article synced from WordPress, show website URL
                          if (websiteUrl) {
                            const baseUrl = websiteUrl.replace(/\/$/, '');
                            return `${baseUrl}/${slug || ""}`;
                          }
                          // Otherwise show example.com
                          return `https://example.com/${slug || ""}`;
                        }
                        // For admin, show volxai.com
                        return `https://volxai.com/${slug || ""}`;
                      })()}
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
                      {seoChecks.basic.filter((c) => !c.checked).length} Errors)
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
                      {seoChecks.advanced.filter((c) => !c.checked).length}{" "}
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
                      {seoChecks.title.filter((c) => !c.checked).length} Errors)
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
                          if (quillRef.current) {
                            const editor = quillRef.current.getEditor();
                            
                            // Use the saved cursor position (which is tracked via selection-change event)
                            // If no saved position, default to end of content
                            const insertPosition = savedCursorPosition !== null 
                              ? savedCursorPosition 
                              : editor.getLength() - 1;
                            
                            // Get the primary keyword (first keyword in the list)
                            const altText = keywords.length > 0 ? keywords[0] : (title || 'Image');
                            
                            // Insert image with alt attribute
                            // We need to insert HTML to include the alt attribute
                            const imageUrl = image.original || image.thumbnail;
                            const imageHtml = `<img src="${imageUrl}" alt="${altText}" />`;
                            
                            // Get current content and cursor
                            const delta = editor.getContents();
                            
                            // Insert the HTML at cursor position
                            editor.clipboard.dangerouslyPasteHTML(insertPosition, imageHtml);
                            
                            // Move cursor to right after the image
                            editor.setSelection({ index: insertPosition + 1, length: 0 });
                            
                            // Return focus to editor
                            editor.focus();
                            
                            // Show success message
                            toast.success(`Đã chèn ảnh với alt="${altText}"`);
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
                  <Button className="w-full" onClick={handleInsertVideo}>
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
          position={toolbarPosition}
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

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bài viết chưa được lưu</DialogTitle>
            <DialogDescription>
              Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn thoát không? Tất cả thay đổi sẽ bị mất.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowExitConfirm(false);
                setPendingNavigation(null);
              }}
            >
              Ở lại
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setHasUnsavedChanges(false);
                setShowExitConfirm(false);
                if (pendingNavigation) {
                  navigate(pendingNavigation);
                }
              }}
            >
              Thoát không lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Modal */}
      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        articleId={id ? parseInt(id) : undefined}
        articleData={{
          title,
          content,
          metaTitle: metaTitle || title,
          metaDescription,
          slug: slug || generateSlug(title),
          keywords,
          featuredImage,
        }}
        onPublishSuccess={handlePublishSuccess}
        mode={articleStatus === "published" ? "update" : "create"}
      />

      {/* Token Upgrade Modal */}
      <TokenUpgradeModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        remainingTokens={tokenModalData.remainingTokens}
        requiredTokens={tokenModalData.requiredTokens}
        featureName={tokenModalData.featureName}
      />
    </div>
  );
}
