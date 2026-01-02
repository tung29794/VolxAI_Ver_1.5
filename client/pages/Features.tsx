import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckCircle2, Sparkles, Zap, BarChart3, Shield } from "lucide-react";

export default function Features() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Tính năng của VolxAI
          </h1>
          <p className="text-lg text-muted-foreground">
            Khám phá tất cả những tính năng mạnh mẽ giúp bạn tạo nội dung chuyên nghiệp
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {[
            {
              icon: Sparkles,
              title: "AI viết bài thông minh",
              description:
                "AI tạo bài viết chất lượng cao trong vài giây, tiết kiệm 10x thời gian so với viết thủ công.",
              features: ["Hỗ trợ 20+ ngôn ngữ", "Hơn 50+ mẫu bài viết", "Tối ưu hóa tự động"],
            },
            {
              icon: Zap,
              title: "Tối ưu SEO tự động",
              description:
                "Tự động tối ưu hóa từ khóa, độ dài bài và cấu trúc để xếp hạng cao trên Google.",
              features: ["Phân tích từ khóa", "Chấm điểm SEO", "Đề xuất cải thiện"],
            },
            {
              icon: BarChart3,
              title: "AI tìm kiếm ảnh theo từ khóa",
              description:
                "Tìm ảnh minh họa phù hợp tự động để làm phong phú nội dung bài viết.",
              features: ["Cơ sở dữ liệu ảnh lớn", "Tìm kiếm thông minh", "Tích hợp liền mạch"],
            },
            {
              icon: Shield,
              title: "AI tìm kiếm bài tham khảo",
              description:
                "Tìm kiếm tự động các bài viết tham khảo có liên quan để hỗ trợ nội dung.",
              features: ["Tìm kiếm nhanh chóng", "Uy tín cao", "Đa ngôn ngữ"],
            },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white border border-border rounded-2xl p-8 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground mb-6">{feature.description}</p>
                <ul className="space-y-3">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}
