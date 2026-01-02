import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-8 max-w-md">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="text-3xl font-bold text-foreground">
              Trang không tìm thấy
            </h2>
            <p className="text-lg text-muted-foreground">
              Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di
              chuyển.
            </p>
          </div>
          <Link to="/">
            <Button className="bg-primary hover:bg-primary/90 text-base h-12 px-8 gap-2">
              <ArrowLeft className="w-5 h-5" />
              Quay lại trang chủ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
