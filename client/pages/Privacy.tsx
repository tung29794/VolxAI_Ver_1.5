import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Chính sách bảo mật
          </h1>
          <p className="text-lg text-muted-foreground">
            Bảo vệ quyền riêng tư của bạn là ưu tiên hàng đầu của chúng tôi
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto prose prose-sm">
          <div className="space-y-8 text-foreground">
            {[
              {
                title: "1. Thông tin chúng tôi thu thập",
                content:
                  "Chúng tôi thu thập thông tin mà bạn cung cấp trực tiếp, chẳng hạn như tên, email và thông tin tài khoản. Chúng tôi cũng thu thập thông tin về cách bạn sử dụng dịch vụ của chúng tôi.",
              },
              {
                title: "2. Cách chúng tôi sử dụng thông tin",
                content:
                  "Chúng tôi sử dụng thông tin để cung cấp, duy trì và cải thiện dịch vụ của mình. Chúng tôi cũng sử dụng nó để gửi thông báo quan trọng và hỗ trợ khách hàng.",
              },
              {
                title: "3. Chia sẻ thông tin",
                content:
                  "Chúng tôi không bán, không trao đổi hay không cho phép các bên thứ ba tiếp cận thông tin cá nhân của bạn, ngoại trừ khi được yêu cầu bởi luật pháp.",
              },
              {
                title: "4. Bảo mật dữ liệu",
                content:
                  "Chúng tôi sử dụng các biện pháp bảo mật tiêu chuẩn công nghiệp để bảo vệ thông tin cá nhân của bạn khỏi truy cập trái phép, thay đổi, công khai hay phá hủy.",
              },
              {
                title: "5. Quyền của bạn",
                content:
                  "Bạn có quyền truy cập, sửa đổi và yêu cầu xóa thông tin cá nhân của bạn bất cứ lúc nào. Vui lòng liên hệ với chúng tôi để thực hiện các yêu cầu này.",
              },
              {
                title: "6. Cookie",
                content:
                  "Chúng tôi sử dụng cookie để cải thiện trải nghiệm người dùng. Bạn có thể vô hiệu hóa cookie thông qua cài đặt trình duyệt của mình.",
              },
              {
                title: "7. Liên kết bên thứ ba",
                content:
                  "Dịch vụ của chúng tôi có thể chứa liên kết đến các trang web bên thứ ba. Chúng tôi không chịu trách nhiệm về chính sách bảo mật của các trang web khác.",
              },
              {
                title: "8. Trẻ em",
                content:
                  "Dịch vụ VolxAI không dành cho trẻ em dưới 13 tuổi. Chúng tôi không cố tình thu thập thông tin từ trẻ em.",
              },
              {
                title: "9. Thay đổi Chính sách",
                content:
                  "Chúng tôi có thể cập nhật chính sách bảo mật này theo thời gian. Bạn sẽ được thông báo về các thay đổi quan trọng.",
              },
              {
                title: "10. Liên hệ",
                content:
                  "Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo mật này, vui lòng liên hệ với chúng tôi tại privacy@volxai.com",
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
              Cập nhật lần cuối: Tháng 12 năm 2024. Nếu bạn không đồng ý với chính sách bảo mật này, 
              vui lòng không sử dụng dịch vụ VolxAI.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
