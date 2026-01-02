import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log(formData);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Liên hệ chúng tôi
          </h1>
          <p className="text-lg text-muted-foreground">
            Có câu hỏi hoặc phản hồi? Chúng tôi muốn nghe từ bạn. Liên hệ với chúng tôi ngay hôm nay.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Thông tin liên hệ
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: Mail,
                    title: "Email",
                    description: "support@volxai.com",
                  },
                  {
                    icon: Phone,
                    title: "Điện thoại",
                    description: "+84 (0) 123 456 789",
                  },
                  {
                    icon: MapPin,
                    title: "Địa chỉ",
                    description: "Hà Nội, Việt Nam",
                  },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="text-muted-foreground mt-1">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 border border-primary/20">
              <h3 className="font-bold text-foreground mb-2">Giờ làm việc</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Thứ Hai - Thứ Sáu: 8:00 - 18:00</li>
                <li>Thứ Bảy: 9:00 - 12:00</li>
                <li>Chủ Nhật: Nghỉ</li>
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-border rounded-2xl p-8">
              <div>
                <Label htmlFor="name" className="text-base font-medium">
                  Tên của bạn
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Nhập tên của bạn"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-2 h-12"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-base font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Nhập email của bạn"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-2 h-12"
                  required
                />
              </div>

              <div>
                <Label htmlFor="subject" className="text-base font-medium">
                  Tiêu đề
                </Label>
                <Input
                  id="subject"
                  name="subject"
                  type="text"
                  placeholder="Tiêu đề tin nhắn"
                  value={formData.subject}
                  onChange={handleChange}
                  className="mt-2 h-12"
                  required
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-base font-medium">
                  Tin nhắn
                </Label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Nhập tin nhắn của bạn..."
                  value={formData.message}
                  onChange={handleChange}
                  className="mt-2 w-full p-3 border border-border rounded-lg resize-none h-32 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg text-base h-12 font-semibold">
                Gửi tin nhắn
              </Button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
