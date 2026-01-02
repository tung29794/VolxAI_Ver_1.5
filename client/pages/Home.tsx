import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Zap,
  BarChart3,
  Shield,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Play,
  X,
} from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI viết bài thông minh",
    description:
      "AI tạo bài viết chất lượng cao trong vài giây, tiết kiệm 10x thời gian",
  },
  {
    icon: Zap,
    title: "Tối ưu SEO tự động",
    description: "Tối ưu hóa từ khóa, độ dài bài và cấu trúc để xếp hạng cao",
  },
  {
    icon: BarChart3,
    title: "AI tìm kiếm ảnh theo từ khóa",
    description:
      "Tìm ảnh minh họa phù hợp tự động để làm phong phú nội dung bài viết",
  },
  {
    icon: Shield,
    title: "AI tìm kiếm bài tham khảo",
    description:
      "Tìm kiếm tự động các bài viết tham khảo có liên quan để hỗ trợ nội dung",
  },
];

const BENEFITS = [
  "Hơn 50+ mẫu bài viết",
  "Hỗ trợ 20+ ngôn ngữ",
  "Tích hợp với các nền tảng phổ biến",
  "Bảo mật dữ liệu 99.9%",
];

export default function Home() {
  const [showDemo, setShowDemo] = useState(false);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDemo(false);
      }
    };

    if (showDemo) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [showDemo]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <div className="inline-block">
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
                  ✨ Công nghệ AI tiên tiến
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Viết bài như{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  một chuyên gia
                </span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                VolxAI giúp bạn tạo nội dung chất lượng cao, tối ưu SEO và hút
                khách hàng chỉ với vài click. Tiết kiệm 90% thời gian viết bài!
              </p>
              <p className="text-base text-primary font-semibold">
                🎁 Tặng 10.000 token khi đăng ký tài khoản miễn phí
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register">
                <Button className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:shadow-lg text-base h-12 px-8">
                  Bắt đầu miễn phí <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setShowDemo(true)}
                className="w-full sm:w-auto text-base h-12 px-8"
              >
                <Play className="w-4 h-4 mr-2" />
                Xem demo
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span>Không cần thẻ tín dụng • Bắt đầu trong 30 giây</span>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-3xl blur-2xl" />
            <div className="relative bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl p-8 border border-primary/10">
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="text-sm text-muted-foreground mb-2">
                    Tiêu đề bài viết
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    Cách tăng doanh thu bán hàng với AI
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-border shadow-sm text-center">
                    <div className="text-xs text-muted-foreground mb-1">
                      Từ khóa
                    </div>
                    <div className="font-semibold text-primary">48</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-border shadow-sm text-center">
                    <div className="text-xs text-muted-foreground mb-1">
                      Độ dài
                    </div>
                    <div className="font-semibold text-primary">1.2k</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-border shadow-sm text-center">
                    <div className="text-xs text-muted-foreground mb-1">
                      Điểm
                    </div>
                    <div className="font-semibold text-primary">92</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="text-xs text-muted-foreground mb-2">
                    Nội dung được tạo
                  </div>
                  <div className="text-sm text-foreground leading-relaxed space-y-2">
                    <p>
                      Trong thế giới kinh doanh hiện đại, AI đang trở thành chìa
                      khóa để tăng doanh thu...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="bg-gradient-to-b from-primary/5 to-transparent py-20 md:py-32"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Tính năng mạnh mẽ dành cho bạn
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              VolxAI cung cấp tất cả những gì bạn cần để tạo nội dung chuyên
              nghiệp
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group bg-white border border-border rounded-2xl p-8 hover:border-primary/50 hover:shadow-lg transition-all duration-300 animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Tại sao chọn VolxAI?
              </h2>
              <p className="text-lg text-muted-foreground">
                Hàng ngàn nhà viết nội dung, blogger và doanh nhân đã tin tưởng
                VolxAI để cải thiện năng suất của họ
              </p>
            </div>

            <div className="space-y-4">
              {BENEFITS.map((benefit, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-primary mt-0.5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {benefit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 border border-primary/20">
              <div className="text-3xl font-bold text-primary mb-2">10M+</div>
              <p className="text-muted-foreground">Bài viết được tạo</p>
            </div>
            <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-2xl p-8 border border-secondary/20">
              <div className="text-3xl font-bold text-secondary mb-2">50K+</div>
              <p className="text-muted-foreground">Người dùng hài lòng</p>
            </div>
            <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl p-8 border border-accent/20">
              <div className="text-3xl font-bold text-accent mb-2">99.9%</div>
              <p className="text-muted-foreground">Thời gian hoạt động</p>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-8 border border-primary/20">
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <p className="text-muted-foreground">Hỗ trợ khách hàng</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary via-secondary to-primary py-16 md:py-24">
        <div className="container mx-auto px-4 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Sẵn sàng viết bài như chuyên gia?
            </h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              Hãy bắt đầu sử dụng WriteAI ngay hôm nay và tiết kiệm 90% thời
              gian viết nội dung
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/upgrade">
              <Button className="bg-white text-primary hover:bg-gray-100 text-base h-12 px-8 font-semibold">
                Bắt đầu miễn phí <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button
              variant="outline"
              className="bg-white/20 border-white text-white hover:bg-white/30 text-base h-12 px-8 font-semibold"
            >
              Liên hệ bán hàng
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      {/* Demo Video Modal */}
      {showDemo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowDemo(false)}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowDemo(false)}
              className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Đóng video"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Video Container */}
            <div className="aspect-video bg-black">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="VolxAI Demo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
