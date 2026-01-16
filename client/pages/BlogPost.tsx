import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Calendar, User, ArrowLeft, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { buildApiUrl } from "@/lib/api";

interface Article {
  id: number;
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  slug: string;
  featured_image: string;
  created_at: string;
  published_at: string;
  username: string;
  full_name: string;
}

export default function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const response = await fetch(buildApiUrl(`/api/articles/slug/${id}`));
        const data = await response.json();
        
        if (data.success) {
          setArticle(data.article);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to fetch article:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticle();
    }
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Đã sao chép liên kết!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Đang tải bài viết...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Bài viết không tìm thấy
          </h1>
          <p className="text-muted-foreground mb-8">
            Rất tiếc, bài viết bạn tìm kiếm không tồn tại.
          </p>
          <Link to="/blog">
            <Button className="bg-primary text-white hover:bg-primary/90">
              Quay lại Blog
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Article Header */}
      <section className="container mx-auto px-4 py-12">
        <button
          onClick={() => navigate("/blog")}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Blog
        </button>

        <div className="max-w-3xl mx-auto space-y-6">
          {/* Featured Image */}
          {article.featured_image && (
            <div className="w-full h-64 md:h-96 overflow-hidden rounded-xl">
              <img
                src={article.featured_image}
                alt={article.meta_title || article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            {article.meta_title || article.title}
          </h1>

          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(article.published_at || article.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{article.full_name || article.username || "VolxAI Team"}</span>
            </div>
          </div>

          {/* Share Section */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition"
            >
              <Copy className="w-4 h-4" />
              {copied ? "Đã sao chép" : "Sao chép liên kết"}
            </button>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition"
            >
              <Share2 className="w-4 h-4" />
              Chia sẻ
            </a>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div
            className="prose prose-lg max-w-none text-foreground [&_p]:text-muted-foreground [&_p]:mb-4 [&_p]:leading-relaxed [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-3 [&_ul]:my-4 [&_ol]:my-4 [&_li]:text-muted-foreground [&_li]:mb-2 [&_img]:rounded-lg [&_img]:my-6"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary via-secondary to-primary py-16">
        <div className="container mx-auto px-4 text-center space-y-6 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white">
            Sẵn sàng tạo nội dung chất lượng cao?
          </h2>
          <p className="text-lg text-white/90">
            Hãy bắt đầu sử dụng VolxAI ngay hôm nay để viết bài như một chuyên
            gia
          </p>
          <Link to="/register">
            <Button className="bg-white text-primary hover:bg-gray-100 h-12 px-8 font-semibold">
              Bắt đầu miễn phí
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
