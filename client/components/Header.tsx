import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { buildApiUrl } from "@/lib/api";

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [tokensLimit, setTokensLimit] = useState<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();

  // Fetch user subscription data to get tokens
  useEffect(() => {
    if (isAuthenticated) {
      const fetchSubscription = async () => {
        try {
          const token = localStorage.getItem("authToken");
          if (!token) return;

          const response = await fetch(buildApiUrl("/api/auth/me"), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await response.json();
          if (data.success && data.subscription) {
            setTokensLimit(data.subscription.tokens_limit);
          }
        } catch (error) {
          console.error("Failed to fetch subscription:", error);
        }
      };

      fetchSubscription();
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { label: "Trang chủ", href: "/" },
    { label: "Tính năng", href: "/features" },
    { label: "Bảng giá", href: "/upgrade" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold">✨</span>
          </div>
          <span className="text-foreground hidden sm:inline">VolxAI</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {tokensLimit !== null && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {tokensLimit.toLocaleString("vi-VN")} Token
                  </span>
                </div>
              )}
              {user?.role === "admin" && (
                <Link to="/admin">
                  <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    Truy cập Admin
                  </Button>
                </Link>
              )}
              <Link to="/account">
                <Button variant="outline">Tài khoản</Button>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline">Đăng nhập</Button>
              </Link>
              <Link to="/upgrade">
                <Button className="bg-primary hover:bg-primary/90">
                  Nâng cấp
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-foreground" />
          ) : (
            <Menu className="w-6 h-6 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-white">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors py-2 ${
                  isActive(link.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              {isAuthenticated ? (
                <>
                  {tokensLimit !== null && (
                    <div className="flex items-center justify-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {tokensLimit.toLocaleString("vi-VN")} Token
                      </span>
                    </div>
                  )}
                  {user?.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                        Truy cập Admin
                      </Button>
                    </Link>
                  )}
                  <Link
                    to="/account"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button variant="outline" className="w-full">
                      Tài khoản
                    </Button>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Đăng nhập
                    </Button>
                  </Link>
                  <Link
                    to="/upgrade"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button className="w-full bg-primary hover:bg-primary/90">
                      Nâng cấp
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
