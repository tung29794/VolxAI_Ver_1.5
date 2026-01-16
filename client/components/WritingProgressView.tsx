import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { toast } from "sonner";

interface WritingProgressViewProps {
  formData: any;
  onCancel: () => void;
  onComplete: (articleId: string) => void;
}

export default function WritingProgressView({
  formData,
  onCancel,
  onComplete,
}: WritingProgressViewProps) {

  // Simple slugify helper used when server doesn't return an articleId
  const slugify = (s: string) =>
    (s || "")
      .toString()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 200);

  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [articleData, setArticleData] = useState<any>(null);

  // Generate article via API with STREAMING
  useEffect(() => {
    const generateArticle = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          toast.error("Vui lòng đăng nhập lại");
          setIsGenerating(false);
          return;
        }

        // Determine if this is a toplist article
        const isToplist = formData.isToplist || false;
        const apiEndpoint = isToplist ? "/api/ai/generate-toplist" : "/api/ai/generate-article";

        console.log('📥 WritingProgressView - Received formData:', formData);
        console.log('   useGoogleSearch:', formData.useGoogleSearch);

        // Prepare request body based on article type
        const requestBody = isToplist
          ? {
              keyword: formData.keyword || formData.topic, // Support both old and new prop names
              itemCount: parseInt(formData.itemCount),
              language: formData.language,
              outlineType: formData.outlineType,
              customOutline: formData.customOutline || "",
              tone: formData.tone,
              model: formData.model,
              length: formData.length,
              internalLinks: formData.internalLinks || "",
              endContent: formData.endContent || "",
              boldKeywords: formData.boldKeywords || { mainKeyword: false, headings: false },
              autoInsertImages: formData.autoInsertImages || false,
              useGoogleSearch: formData.useGoogleSearch || false,
            }
          : {
              keyword: formData.keyword,
              language: formData.language,
              outlineType: formData.outlineType,
              customOutline: formData.customOutline || "",
              tone: formData.tone,
              model: formData.model,
              length: formData.outlineLength,
              internalLinks: formData.internalLinks || "",
              endContent: formData.endContent || "",
              boldKeywords: formData.boldKeywords || { mainKeyword: false, headings: false },
              autoInsertImages: formData.autoInsertImages || false,
              useGoogleSearch: formData.useGoogleSearch || false,
            };

        console.log('🚀 WritingProgressView - Sending request to:', apiEndpoint);
        console.log('📦 Request body:', requestBody);
        console.log('   useGoogleSearch in body:', requestBody.useGoogleSearch);

        // Use EventSource for Server-Sent Events (SSE) streaming
        const eventSourceUrl = buildApiUrl(apiEndpoint);
        
        // Create a POST request with fetch first to initiate the connection
        const response = await fetch(eventSourceUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          toast.error(error.error || "Có lỗi xảy ra khi tạo bài viết");
          setIsGenerating(false);
          return;
        }

        // Read the streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          toast.error("Không thể nhận streaming response");
          setIsGenerating(false);
          return;
        }

        let buffer = '';
        let streamingContent = '';
        let currentEvent = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ Streaming completed');
            console.log('   Final content length:', streamingContent.length);
            console.log('   Final buffer:', buffer);
            console.log('   isComplete:', isComplete);
            console.log('   articleData:', articleData);
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            
            // Parse SSE format: "event: eventName" followed by "data: jsonData"
            if (trimmedLine.startsWith('event: ')) {
              // Store event type for next data line
              currentEvent = trimmedLine.substring(7);
              continue;
            }
            
            if (trimmedLine.startsWith('data: ')) {
              try {
                const jsonData = JSON.parse(trimmedLine.substring(6));
                
                // Handle different event types based on currentEvent
                if (currentEvent === 'status') {
                  // console.log('📊 Status:', jsonData.message);
                } else if (currentEvent === 'content') {
                  // Update content in real-time
                  streamingContent = jsonData.total || streamingContent + jsonData.chunk;
                  setContent(streamingContent);
                } else if (currentEvent === 'complete') {
                  setArticleData(jsonData);
                  setContent(jsonData.content || streamingContent);
                  setIsGenerating(false);
                  setIsComplete(true);
                  
                  // Log token breakdown to browser console
                  if (jsonData.tokenBreakdown) {
                    console.log('🎯 ===== TOKEN CALCULATION BREAKDOWN =====');
                    console.log('📊 Word Count:', jsonData.tokenBreakdown.wordCount, 'từ');
                    console.log('🤖 AI Model:', jsonData.tokenBreakdown.model);
                    console.log('📝 Article Tokens:', jsonData.tokenBreakdown.articleTokens, 'tokens');
                    console.log('📰 Title Tokens:', jsonData.tokenBreakdown.titleTokens, 'tokens');
                    console.log('🖼️  Image Search Tokens:', jsonData.tokenBreakdown.imageSearchTokens, 'tokens');
                    console.log('💰 TOTAL TOKENS:', jsonData.tokenBreakdown.totalTokens, 'tokens');
                    console.log('💳 Tokens Used:', jsonData.tokensUsed, 'tokens');
                    console.log('🏦 Remaining Tokens:', jsonData.remainingTokens, 'tokens');
                    console.log('========================================');
                  }
                  
                  // Check if save was successful
                  if (jsonData.success === false) {
                    console.warn('⚠️ Backend save failed, will use fallback on button click');
                    toast.warning("Bài viết đã được tạo nhưng chưa lưu. Click nút để lưu.");
                  } else {
                    toast.success("Bài viết đã được tạo thành công!");
                  }
                } else if (currentEvent === 'error') {
                  console.error('❌ Error event received:', jsonData);
                  toast.error(jsonData.message || jsonData.error || "Có lỗi xảy ra");
                  setIsGenerating(false);
                } else if (currentEvent === 'warning') {
                  console.warn('⚠️ Warning event received:', jsonData);
                  toast.warning(jsonData.message || "Có cảnh báo");
                }
                
                currentEvent = ''; // Reset after processing
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error generating article:", error);
        toast.error("Có lỗi xảy ra khi tạo bài viết");
        setIsGenerating(false);
      }
    };

    generateArticle();
  }, []);

  const handleContinueEditing = () => {
    console.log('🔘 Continue editing button clicked');
    console.log('   articleData:', articleData);
    console.log('   articleData.articleId:', articleData?.articleId);
    console.log('   articleData.success:', articleData?.success);
    
    (async () => {
      try {
        // If server provided articleId, use it
        if (articleData && articleData.articleId) {
          console.log('✅ ArticleId exists, navigating to editor:', articleData.articleId);
          toast.success("Bài viết đã được lưu thành công!");
          onComplete(articleData.articleId);
          return;
        }

        console.log('⚠️ No articleId, attempting fallback save...');
        console.log('   formData:', formData);
        console.log('   content length:', content?.length);

        // Fallback: save draft via API so user can continue editing
        const token = localStorage.getItem("authToken");
        if (!token) {
          console.error('❌ No auth token found');
          toast.error("Vui lòng đăng nhập lại");
          return;
        }

        // Build minimal article payload
        const title = (articleData && articleData.title) || (formData.keyword || formData.topic || 'Bài viết AI');
        const slug = slugify(title);
        
        console.log('📝 Creating draft with:');
        console.log('   title:', title);
        console.log('   slug:', slug);
        console.log('   content length:', (articleData?.content || content)?.length);
        
        const payload = {
          title,
          content: articleData?.content || content,
          metaTitle: title,
          metaDescription: '',
          slug,
          keywords: [formData.keyword || formData.topic || ''],
          featuredImage: null,
          status: 'draft',
        };

        console.log('🚀 Sending POST /api/articles/save...');
        const saveResponse = await fetch(buildApiUrl('/api/articles/save'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        console.log('📥 Response status:', saveResponse.status);
        const responseText = await saveResponse.text();
        console.log('📥 Response body:', responseText);

        if (saveResponse.ok) {
          const data = JSON.parse(responseText);
          console.log('✅ Save successful, response:', data);
          const newId = data.articleId || data.data?.articleId || data.id;
          console.log('   Extracted ID:', newId);
          
          if (newId) {
            toast.success('Bài viết đã được lưu thành công!');
            onComplete(newId.toString());
            return;
          } else {
            console.error('❌ No ID in response:', data);
          }
        } else {
          console.error('❌ Save failed with status:', saveResponse.status);
        }

        toast.error('Có lỗi xảy ra khi lưu bài viết');
      } catch (err) {
        console.error('❌ Save draft fallback failed:', err);
        console.error('   Error details:', err);
        toast.error('Có lỗi xảy ra khi lưu bài viết');
      }
    })();
  };

  return (
    <div className="space-y-6">
      {/* Custom styles for HTML rendering */}
      <style>{`
        .rendered-html {
          font-size: 16px;
          line-height: 1.8;
          color: inherit;
        }
        .rendered-html h2 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: inherit;
          line-height: 1.3;
        }
        .rendered-html h3 {
          font-size: 1.375rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: inherit;
          line-height: 1.4;
        }
        .rendered-html h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: inherit;
        }
        .rendered-html p {
          margin-bottom: 1rem;
          line-height: 1.8;
        }
        .rendered-html ul, 
        .rendered-html ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .rendered-html ul {
          list-style-type: disc;
        }
        .rendered-html ol {
          list-style-type: decimal;
        }
        .rendered-html li {
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }
        .rendered-html strong {
          font-weight: 600;
          color: inherit;
        }
        .rendered-html em {
          font-style: italic;
        }
        .rendered-html blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #6b7280;
          background: #f9fafb;
          padding: 1rem;
          border-radius: 0.375rem;
        }
        .rendered-html a {
          color: #3b82f6;
          text-decoration: underline;
        }
        .rendered-html a:hover {
          color: #2563eb;
        }
      `}</style>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Đang tạo bài viết...
          </h1>
          <p className="text-lg text-muted-foreground">
            AI đang viết bài viết dựa trên từ khóa:{" "}
            <span className="font-semibold text-foreground">
              {formData.keyword}
            </span>
          </p>
        </div>
        {!isComplete && (
          <button
            onClick={onCancel}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Hủy</span>
          </button>
        )}
      </div>

      {/* Content Display Box */}
      <div className="bg-white rounded-2xl border border-border p-8 min-h-[500px] max-h-[70vh] overflow-y-auto">
        {/* Article Stats */}
        <div className="mb-8 pb-6 border-b border-border flex gap-8">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              SỐ TỪ
            </p>
            <p className="text-2xl font-bold text-foreground">
              {content.split(/\s+/).filter(Boolean).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              KỲ TỬ
            </p>
            <p className="text-2xl font-bold text-foreground">
              {content.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              SỐ CẦU
            </p>
            <p className="text-2xl font-bold text-foreground">
              {content.split(/[.!?]+/).filter(Boolean).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              ĐOẠN VĂN
            </p>
            <p className="text-2xl font-bold text-foreground">
              {content.split(/\n\n+/).filter(Boolean).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              SỐ TRANG
            </p>
            <p className="text-2xl font-bold text-foreground">
              {(content.length / 3000).toFixed(2)}
            </p>
          </div>
          {!formData.useGoogleSearch && (
            <div className="ml-auto pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                MODEL
              </p>
              <p className="text-sm font-semibold text-foreground">
                {formData.model}
              </p>
            </div>
          )}
        </div>

        {/* Article Content - Render HTML directly */}
        <div className="article-preview prose prose-lg max-w-none">
          <div 
            className="rendered-html"
            dangerouslySetInnerHTML={{ __html: content }}
          />
          {isGenerating && (
            <span className="inline-block w-2 h-6 ml-1 bg-primary animate-pulse"></span>
          )}
        </div>
      </div>

      {/* Loading or Complete State */}
      <div className="flex items-center justify-center">
        {isGenerating ? (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></div>
            </div>
            <span className="text-muted-foreground font-medium">
              Đang viết bài...
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 pt-6 border-t border-border">
            <div className="flex items-center gap-3 text-green-600">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-sm">✓</span>
              </div>
              <span className="font-medium">Hoàn tất viết bài</span>
            </div>
            <Button
              onClick={handleContinueEditing}
              className="bg-primary hover:bg-primary/90 flex items-center gap-2"
            >
              ➜ Tiếp tục chỉnh sửa bài viết
            </Button>
          </div>
        )}
      </div>

      {/* Action Buttons - Removed as buttons are now inline with completion status */}
    </div>
  );
}
