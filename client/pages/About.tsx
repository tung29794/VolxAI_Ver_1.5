import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckCircle2 } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Về chúng tôi
          </h1>
          <p className="text-lg text-muted-foreground">
            VolxAI - Giải pháp AI tạo nội dung hàng đầu cho nhà viết, blogger và doanh nghiệp
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-foreground">Sứ mệnh của chúng tôi</h2>
            <p className="text-lg text-muted-foreground">
              Chúng tôi tin rằng mọi người đều có khả năng tạo nội dung chất lượng cao. 
              VolxAI được tạo ra để giúp các nhà viết, blogger và doanh nhân tiết kiệm 
              thời gian và nâng cao chất lượng nội dung của họ.
            </p>
            <ul className="space-y-3">
              {["Tiết kiệm 90% thời gian viết bài", "Nâng cao chất lượng nội dung", "Tối ưu SEO tự động"].map(
                (item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </li>
                )
              )}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-8">
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-border shadow-sm">
                <div className="text-3xl font-bold text-primary mb-2">10M+</div>
                <p className="text-muted-foreground">Bài viết được tạo</p>
              </div>
              <div className="bg-white rounded-lg p-6 border border-border shadow-sm">
                <div className="text-3xl font-bold text-secondary mb-2">50K+</div>
                <p className="text-muted-foreground">Người dùng hài lòng</p>
              </div>
              <div className="bg-white rounded-lg p-6 border border-border shadow-sm">
                <div className="text-3xl font-bold text-accent mb-2">99.9%</div>
                <p className="text-muted-foreground">Thời gian hoạt động</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-foreground/5 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Các giá trị của chúng tôi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Đổi mới",
                description: "Chúng tôi liên tục cải tiến công nghệ AI để mang đến giải pháp tốt nhất.",
              },
              {
                title: "Uy tín",
                description: "Bảo mật dữ liệu và quyền riêng tư người dùng là ưu tiên hàng đầu.",
              },
              {
                title: "Hỗ trợ",
                description: "Đội ngũ hỗ trợ 24/7 sẵn sàng giúp đỡ bạn bất cứ lúc nào.",
              },
            ].map((value, idx) => (
              <div key={idx} className="bg-white rounded-lg p-8 border border-border">
                <h3 className="text-xl font-bold text-foreground mb-3">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
