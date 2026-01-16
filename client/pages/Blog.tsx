import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, User } from "lucide-react";
import { buildApiUrl } from "@/lib/api";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  meta_description: string;
  featured_image: string;
  created_at: string;
  published_at: string;
  username: string;
}

export default function Blog() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublishedArticles = async () => {
      try {
        const response = await fetch(buildApiUrl("/api/articles?status=published"));
        const data = await response.json();
        
        if (data.success) {
          setBlogPosts(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch articles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublishedArticles();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const calculateReadTime = (content: string = "") => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} phút đọc`;
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Blog VolxAI
          </h1>
          <p className="text-lg text-muted-foreground">
            Những bài viết hữu ích, mẹo vặt, và tin tức mới nhất về AI viết nội
            dung
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="container mx-auto px-4 py-20">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Đang tải bài viết...</p>
          </div>
        ) : blogPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chưa có bài viết nào được đăng</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {blogPosts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="block">
                <article className="bg-white border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer h-full">
                  {/* Featured Image */}
                  {post.featured_image && (
                    <div className="w-full h-48 overflow-hidden">
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  
                  <div className="p-8 space-y-4">
                    <h3 className="text-2xl font-bold text-foreground hover:text-primary transition">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground line-clamp-3">
                      {post.meta_description || "Đọc bài viết để khám phá thêm..."}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(post.published_at || post.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{post.username || "VolxAI Team"}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          5 phút đọc
                        </span>
                        <span className="text-primary hover:text-primary/80 transition flex items-center gap-1">
                          Đọc thêm
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
