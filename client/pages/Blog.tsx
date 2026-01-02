import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, User } from "lucide-react";

export default function Blog() {
  const blogPosts = [
    {
      id: "1",
      title: "Cách sử dụng AI để viết bài chất lượng cao",
      description:
        "Tìm hiểu những mẹo và thủ thuật để tối ưu hóa quá trình viết bài bằng AI.",
      date: "15 Tháng 12, 2024",
      author: "VolxAI Team",
      readTime: "5 phút đọc",
    },
    {
      id: "2",
      title: "Tối ưu SEO với VolxAI: Hướng dẫn đầy đủ",
      description:
        "Khám phá cách tối ưu hóa bài viết cho SEO một cách tự động và hiệu quả.",
      date: "10 Tháng 12, 2024",
      author: "VolxAI Team",
      readTime: "7 phút đọc",
    },
    {
      id: "3",
      title: "Xu hướng AI viết nội dung trong năm 2025",
      description:
        "Những xu hướng mới và cách AI đang thay đổi ngành viết nội dung.",
      date: "5 Tháng 12, 2024",
      author: "VolxAI Team",
      readTime: "8 phút đọc",
    },
    {
      id: "4",
      title: "Tăng tốc độ viết bài lên 10x với VolxAI",
      description:
        "Câu chuyện thành công của những người dùng VolxAI tăng năng suất.",
      date: "1 Tháng 12, 2024",
      author: "VolxAI Team",
      readTime: "6 phút đọc",
    },
  ];

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {blogPosts.map((post) => (
            <Link key={post.id} to={`/blog/${post.id}`} className="block">
              <article className="bg-white border border-border rounded-2xl p-8 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer h-full">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-foreground hover:text-primary transition">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground">{post.description}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{post.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{post.author}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {post.readTime}
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
      </section>

      <Footer />
    </div>
  );
}
