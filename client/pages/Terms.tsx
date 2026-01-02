import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Điều khoản dịch vụ
          </h1>
          <p className="text-lg text-muted-foreground">
            Vui lòng đọc kỹ các điều khoản dịch vụ trước khi sử dụng VolxAI
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto prose prose-sm">
          <div className="space-y-8 text-foreground">
            {[
              {
                title: "1. Chấp nhận Điều khoản",
                content:
                  "Bằng cách truy cập và sử dụng dịch vụ VolxAI, bạn đồng ý bị ràng buộc bởi các điều khoản dịch vụ này. Nếu bạn không đồng ý với bất kỳ phần nào, vui lòng không sử dụng dịch vụ.",
              },
              {
                title: "2. Sử dụng Dịch vụ",
                content:
                  "Bạn đồng ý sử dụng dịch vụ VolxAI chỉ cho các mục đích hợp pháp và theo cách không vi phạm quyền của người khác hoặc hạn chế việc sử dụng dịch vụ.",
              },
              {
                title: "3. Nội dung Người dùng",
                content:
                  "Bạn giữ tất cả các quyền đối với nội dung mà bạn tạo. Bạn cấp cho VolxAI quyền để sử dụng, sao chép, sửa đổi và phân phối nội dung của bạn.",
              },
              {
                title: "4. Tài khoản Người dùng",
                content:
                  "Bạn chịu trách nhiệm duy trì tính bảo mật của tài khoản của mình và chịu trách nhiệm cho tất cả các hoạt động xảy ra theo tài khoản của bạn.",
              },
              {
                title: "5. Giới hạn Trách nhiệm",
                content:
                  "VolxAI không chịu trách nhiệm cho bất kỳ thiệt hại gián tiếp, ngẫu nhiên, đặc biệt hoặc hậu quả phát sinh từ hoặc liên quan đến dịch vụ.",
              },
              {
                title: "6. Từ chối Bảo hành",
                content:
                  "Dịch vụ được cung cấp 'nguyên trạng' mà không có bất kỳ bảo hành nào, rõ ràng hay hàm ý.",
              },
              {
                title: "7. Thay đổi Dịch vụ",
                content:
                  "VolxAI bảo lưu quyền thay đổi, sửa đổi hoặc ngừng dịch vụ bất cứ lúc nào mà không cần thông báo.",
              },
              {
                title: "8. Chấm dứt",
                content:
                  "VolxAI có thể chấm dứt hoặc ngừng tài khoản của bạn bất cứ lúc nào vì bất kỳ lý do gì.",
              },
              {
                title: "9. Luật Áp dụng",
                content:
                  "Các điều khoản dịch vụ này được điều chỉnh bởi luật pháp của Việt Nam.",
              },
              {
                title: "10. Liên hệ",
                content:
                  "Nếu bạn có bất kỳ câu hỏi nào về điều khoản dịch vụ này, vui lòng liên hệ với chúng tôi tại support@volxai.com",
              },
            ].map((section, idx) => (
              <div key={idx}>
                <h2 className="text-xl font-bold text-foreground mb-3">
                  {section.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground">
              Cập nhật lần cuối: Tháng 12 năm 2024. VolxAI bảo lưu quyền cập nhật các điều khoản 
              này bất cứ lúc nào. Việc tiếp tục sử dụng dịch vụ sau khi các thay đổi có nghĩa là 
              bạn chấp nhận các điều khoản mới.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
