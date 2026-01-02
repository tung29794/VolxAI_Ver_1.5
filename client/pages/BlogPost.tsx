import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Calendar, User, ArrowLeft, Share2, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const BLOG_POSTS = [
  {
    id: "1",
    title: "Cách sử dụng AI để viết bài chất lượng cao",
    description:
      "Tìm hiểu những mẹo và thủ thuật để tối ưu hóa quá trình viết bài bằng AI.",
    date: "15 Tháng 12, 2024",
    author: "VolxAI Team",
    readTime: "5 phút đọc",
    content: `
      <p>Viết bài bằng AI không phải là một quá trình đơn giản để tạo ra nội dung chất lượng cao. Cần phải hiểu rõ cách sử dụng các công cụ AI và cách tối ưu hóa quá trình viết.</p>

      <h2>1. Chuẩn bị nội dung tốt</h2>
      <p>Bước đầu tiên là chuẩn bị nội dung tốt. Bạn cần phải biết rõ chủ đề, từ khóa chính, và những thông tin cần thiết.</p>

      <h2>2. Sử dụng VolxAI một cách hiệu quả</h2>
      <p>VolxAI cung cấp nhiều tính năng mạnh mẽ để giúp bạn viết bài. Hãy sử dụng các mẫu bài, các gợi ý và các công cụ khác.</p>

      <h2>3. Chỉnh sửa và tối ưu hóa</h2>
      <p>Sau khi viết xong, bạn cần phải chỉnh sửa bài viết. Hãy kiểm tra lỗi chính tả, ngữ pháp và nội dung.</p>

      <h2>4. Tối ưu SEO</h2>
      <p>Cuối cùng, hãy tối ưu hóa bài viết cho SEO. Sử dụng các từ khóa chính, tạo các tiêu đề tốt, và thêm các liên kết ngoài.</p>
    `,
  },
  {
    id: "2",
    title: "Tối ưu SEO với VolxAI: Hướng dẫn đầy đủ",
    description:
      "Khám phá cách tối ưu hóa bài viết cho SEO một cách tự động và hiệu quả.",
    date: "10 Tháng 12, 2024",
    author: "VolxAI Team",
    readTime: "7 phút đọc",
    content: `
      <p>SEO (Search Engine Optimization) là một trong những yếu tố quan trọng nhất để bài viết của bạn có thể xếp hạng cao trên Google.</p>

      <h2>1. Các yếu tố SEO On-Page</h2>
      <p>Tiêu đề, mô tả, và nội dung là những yếu tố SEO on-page quan trọng. VolxAI giúp bạn tối ưu hóa tất cả những yếu tố này.</p>

      <h2>2. Sử dụng từ khóa một cách thông minh</h2>
      <p>Hãy sử dụng từ khóa chính và các từ khóa liên quan trong bài viết. Tuy nhiên, tránh spam từ khóa.</p>

      <h2>3. Cấu trúc bài viết tốt</h2>
      <p>Cấu trúc bài viết rõ ràng với các tiêu đề, đoạn văn, và danh sách giúp cải thiện trải nghiệm người dùng.</p>

      <h2>4. Liên kết ngoài và nội bộ</h2>
      <p>Thêm các liên kết chất lượng cao từ các trang web uy tín. Cũng như liên kết nội bộ tới các bài viết khác.</p>
    `,
  },
  {
    id: "3",
    title: "Xu hướng AI viết nội dung trong năm 2025",
    description:
      "Những xu hướng mới và cách AI đang thay đổi ngành viết nội dung.",
    date: "5 Tháng 12, 2024",
    author: "VolxAI Team",
    readTime: "8 phút đọc",
    content: `
      <p>Năm 2025 sẽ là một năm quan trọng cho AI viết nội dung. Những xu hướng mới sẽ xuất hiện và thay đổi cách chúng ta viết.</p>

      <h2>1. AI sẽ trở nên thông minh hơn</h2>
      <p>AI sẽ có khả năng hiểu rõ hơn về ngữ cảnh, tố chất và ý định của người dùng.</p>

      <h2>2. Tối ưu hóa cho mobile sẽ quan trọng hơn</h2>
      <p>Với sự phát triển của mobile, tối ưu hóa bài viết cho mobile sẽ trở nên cần thiết.</p>

      <h2>3. Nội dung video sẽ phát triển</h2>
      <p>AI sẽ giúp tạo ra các nội dung video chất lượng cao một cách tự động.</p>

      <h2>4. Tương tác giữa người và máy</h2>
      <p>Sự tương tác giữa con người và AI sẽ trở nên liền mạch hơn, giúp tạo ra nội dung tốt hơn.</p>
    `,
  },
  {
    id: "4",
    title: "Tăng tốc độ viết bài lên 10x với VolxAI",
    description:
      "Câu chuyện thành công của những người dùng VolxAI tăng năng suất.",
    date: "1 Tháng 12, 2024",
    author: "VolxAI Team",
    readTime: "6 phút đọc",
    content: `
      <p>Hàng ngàn người dùng VolxAI đã tăng năng suất viết bài lên 10x. Dưới đây là những câu chuyện thành công của họ.</p>

      <h2>1. Blogger chuyên nghiệp</h2>
      <p>Một blogger chuyên nghiệp đã tăng số lượng bài viết từ 5 bài/tuần lên 50 bài/tuần nhờ VolxAI.</p>

      <h2>2. Nhà viết nội dung tự do</h2>
      <p>Những nhà viết nội dung tự do đã có thể tiếp nhận nhiều dự án hơn và tăng thu nhập.</p>

      <h2>3. Công ty nội dung</h2>
      <p>Các công ty nội dung đã có thể giảm chi phí và tăng chất lượng bài viết.</p>

      <h2>4. Bí quyết thành công</h2>
      <p>Bí quyết thành công là học cách sử dụng VolxAI một cách hiệu quả và kết hợp với quá trình chỉnh sửa tốt.</p>
    `,
  },
];

export default function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const post = BLOG_POSTS.find((p) => p.id === id);

  if (!post) {
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

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Đã sao chép liên kết!");
    setTimeout(() => setCopied(false), 2000);
  };

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
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{post.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{post.author}</span>
            </div>
            <span>•</span>
            <span>{post.readTime}</span>
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
        <div className="max-w-3xl mx-auto prose prose-sm max-w-none">
          <div
            className="text-foreground leading-relaxed space-y-6"
            dangerouslySetInnerHTML={{
              __html: post.content
                .replace(/^<p>/gm, "<p className='text-muted-foreground mb-4'>")
                .replace(
                  /^<h2>/gm,
                  "<h2 className='text-2xl font-bold text-foreground mt-8 mb-4'>",
                )
                .split("\n")
                .filter((line) => line.trim())
                .join(""),
            }}
          />
        </div>
      </section>

      {/* Related Posts Section */}
      <section className="bg-foreground/5 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
            Bài viết liên quan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {BLOG_POSTS.filter((p) => p.id !== id)
              .slice(0, 3)
              .map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  to={`/blog/${relatedPost.id}`}
                  className="bg-white rounded-xl border border-border p-6 hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <h3 className="font-bold text-foreground mb-3 line-clamp-2 hover:text-primary transition">
                    {relatedPost.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {relatedPost.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{relatedPost.date}</span>
                    <span>{relatedPost.readTime}</span>
                  </div>
                </Link>
              ))}
          </div>
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
