export function Footer() {
  return (
    <footer className="bg-foreground/5 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Sản phẩm</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/features" className="hover:text-foreground transition">
                  Tính năng
                </a>
              </li>
              <li>
                <a href="/upgrade" className="hover:text-foreground transition">
                  Bảng giá
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">
              Thông tin VolxAI
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/about" className="hover:text-foreground transition">
                  Về chúng tôi
                </a>
              </li>
              <li>
                <a href="/blog" className="hover:text-foreground transition">
                  Blog
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-foreground transition">
                  Liên hệ
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Pháp lý</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/terms" className="hover:text-foreground transition">
                  Điều khoản
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-foreground transition">
                  Quyền riêng tư
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Theo dõi</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition">
                  Facebook
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 VolxAI.</p>
        </div>
      </div>
    </footer>
  );
}
