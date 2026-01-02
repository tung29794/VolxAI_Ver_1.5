import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, User, Mail, Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.username) {
      newErrors.username = "Tên đăng nhập không được để trống";
    } else if (formData.username.length < 3) {
      newErrors.username = "Tên đăng nhập phải có ít nhất 3 ký tự";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username =
        "Tên đăng nhập chỉ chứa chữ cái, số, gạch dưới và gạch ngang";
    }

    if (!formData.email) {
      newErrors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!formData.password) {
      newErrors.password = "Mật khẩu không được để trống";
    } else if (formData.password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Mật khẩu phải chứa chữ hoa, chữ thường và số";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu không khớp";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await registerUser(
        formData.email,
        formData.username,
        formData.password,
        formData.username,
      );

      toast.success("Đăng ký thành công! Chào mừng bạn đến VolxAI 🎉");
      navigate("/account");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Đăng ký thất bại";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-primary/5">
      <Header />

      <div className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          {/* Left Side - Benefits */}
          <div className="space-y-8 hidden md:block">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Bắt đầu với VolxAI
              </h2>
              <p className="text-lg text-muted-foreground">
                Tạo tài khoản để truy cập tất cả các tính năng mạnh mẽ của
                VolxAI
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  icon: CheckCircle2,
                  title: "Dễ dàng tạo tài khoản",
                  desc: "Chỉ mất vài giây để tạo tài khoản",
                },
                {
                  icon: Mail,
                  title: "Xác minh email",
                  desc: "Chúng tôi sẽ gửi link xác minh",
                },
                {
                  icon: Lock,
                  title: "Bảo mật cao",
                  desc: "Mật khẩu được mã hóa và bảo vệ",
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 border border-primary/20">
              <p className="text-sm text-foreground font-semibold mb-3">
                Đã có tài khoản?
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full justify-between">
                  Đăng nhập
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="bg-white rounded-3xl border border-border p-8 md:p-12 shadow-lg">
            <div className="space-y-8">
              <div className="space-y-2 text-center md:text-left">
                <h1 className="text-3xl font-bold text-foreground">Đăng ký</h1>
                <p className="text-muted-foreground">
                  Tạo tài khoản VolxAI của bạn
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username Field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-base font-medium">
                    Tên đăng nhập
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="john_doe"
                      value={formData.username}
                      onChange={handleChange}
                      className={`h-12 text-base pl-10 ${
                        errors.username ? "border-destructive" : ""
                      }`}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-destructive text-sm">
                      {errors.username}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className={`h-12 text-base pl-10 ${
                        errors.email ? "border-destructive" : ""
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-sm">{errors.email}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base font-medium">
                    Mật khẩu
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className={`h-12 text-base pl-10 ${
                        errors.password ? "border-destructive" : ""
                      }`}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-destructive text-sm">
                      {errors.password}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Tối thiểu 8 ký tự, chứa chữ hoa, chữ thường và số
                  </p>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-base font-medium"
                  >
                    Nhập lại mật khẩu
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`h-12 text-base pl-10 ${
                        errors.confirmPassword ? "border-destructive" : ""
                      }`}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-destructive text-sm">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg text-base h-12 font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Đang tạo tài khoản..." : "Đăng ký"}
                  {!isLoading && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
              </form>

              {/* Terms */}
              <p className="text-xs text-center text-muted-foreground">
                Bằng cách đăng ký, bạn đồng ý với{" "}
                <a href="#" className="text-primary hover:text-primary/80">
                  Điều khoản dịch vụ
                </a>{" "}
                và{" "}
                <a href="#" className="text-primary hover:text-primary/80">
                  Chính sách bảo mật
                </a>
              </p>

              {/* Sign In Link */}
              <div className="text-center pt-4 border-t border-border">
                <p className="text-muted-foreground">
                  Đã có tài khoản?{" "}
                  <Link
                    to="/login"
                    className="text-primary font-semibold hover:text-primary/80 transition"
                  >
                    Đăng nhập
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
