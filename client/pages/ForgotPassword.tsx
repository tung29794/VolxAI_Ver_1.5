import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = () => {
    if (!email) {
      setError("Email không được để trống");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email không hợp lệ");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call to send reset email
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setIsSubmitted(true);
      toast.success("Email đặt lại mật khẩu đã được gửi! 📧");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể gửi email. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) {
      setError("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-primary/5 flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          {/* Left Side - Info */}
          <div className="space-y-8 hidden md:block">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Quên mật khẩu?
              </h2>
              <p className="text-lg text-muted-foreground">
                Không lo lắng, chúng tôi sẽ giúp bạn đặt lại mật khẩu trong vài
                phút
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Bước 1: Nhập email
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Nhập email liên kết với tài khoản VolxAI của bạn
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Bước 2: Kiểm tra email
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Chúng tôi sẽ gửi liên kết đặt lại mật khẩu đến email của bạn
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <ArrowRight className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Bước 3: Đặt lại mật khẩu
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Nhấp vào liên kết và tạo mật khẩu mới
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 border border-primary/20">
              <p className="text-sm text-foreground font-semibold mb-3">
                Nhớ mật khẩu rồi?
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full justify-between">
                  Quay lại đăng nhập
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="bg-white rounded-3xl border border-border p-8 md:p-12 shadow-lg">
            {!isSubmitted ? (
              <div className="space-y-8">
                <div className="space-y-2 text-center md:text-left">
                  <h1 className="text-3xl font-bold text-foreground">
                    Đặt lại mật khẩu
                  </h1>
                  <p className="text-muted-foreground">
                    Nhập email để nhận liên kết đặt lại
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={handleChange}
                      className={`h-12 text-base ${
                        error ? "border-destructive" : ""
                      }`}
                    />
                    {error && (
                      <p className="text-destructive text-sm">{error}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg text-base h-12 font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Đang gửi..." : "Gửi liên kết đặt lại"}
                    {!isLoading && <ArrowRight className="ml-2 w-5 h-5" />}
                  </Button>
                </form>

                {/* Login Link */}
                <div className="text-center pt-4">
                  <p className="text-muted-foreground">
                    Quay lại{" "}
                    <Link
                      to="/login"
                      className="text-primary font-semibold hover:text-primary/80 transition"
                    >
                      đăng nhập
                    </Link>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-primary" />
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-bold text-foreground">
                    Kiểm tra email của bạn
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Chúng tôi đã gửi liên kết đặt lại mật khẩu đến:
                  </p>
                  <p className="font-semibold text-foreground text-lg break-all">
                    {email}
                  </p>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 space-y-3">
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Tiếp theo:
                  </p>
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    <li>Mở email từ VolxAI</li>
                    <li>Nhấp vào liên kết "Đặt lại mật khẩu"</li>
                    <li>Tạo mật khẩu mới của bạn</li>
                    <li>Đăng nhập với mật khẩu mới</li>
                  </ol>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Không nhận được email? Kiểm tra thư mục Spam hoặc{" "}
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail("");
                    }}
                    className="text-primary font-semibold hover:text-primary/80 transition"
                  >
                    thử lại
                  </button>
                  .
                </p>

                <Link to="/login" className="block">
                  <Button variant="outline" className="w-full h-12 text-base">
                    <ArrowLeft className="mr-2 w-5 h-5" />
                    Quay lại đăng nhập
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
