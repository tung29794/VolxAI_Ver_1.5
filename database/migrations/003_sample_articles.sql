-- Insert sample articles for testing
-- Note: Make sure user ID 1 exists or replace with an actual user ID

-- Sample Article 1
INSERT IGNORE INTO articles (user_id, title, slug, content, excerpt, status, views_count, tokens_used, category, reading_time, published_at, created_at)
VALUES (
  1,
  'Hướng dẫn tạo nội dung AI cho blog',
  'huong-dan-tao-noi-dung-ai-cho-blog',
  '<h2>Giới thiệu</h2><p>Trong bài viết này, chúng tôi sẽ hướng dẫn bạn cách sử dụng VolxAI để tạo nội dung chất lượng cao cho blog của bạn.</p><h2>Các bước cơ bản</h2><p>1. Đăng nhập vào tài khoản VolxAI<br/>2. Chọn chủ đề bài viết<br/>3. Nhập các từ khóa liên quan<br/>4. Để AI tạo bài viết<br/>5. Chỉnh sửa và xuất bản</p>',
  'Tìm hiểu cách sử dụng VolxAI để tạo bài viết chất lượng cao cho blog của bạn trong vài phút.',
  'published',
  125,
  50000,
  'Tutorial',
  8,
  NOW(),
  NOW()
);

-- Sample Article 2
INSERT IGNORE INTO articles (user_id, title, slug, content, excerpt, status, views_count, tokens_used, category, reading_time, published_at, created_at)
VALUES (
  1,
  'Top 10 cách tối ưu hóa SEO với AI',
  'top-10-cach-toi-uu-hoa-seo-voi-ai',
  '<h2>Tại sao SEO quan trọng</h2><p>SEO là chìa khóa để tăng lượt truy cập hữu cơ cho website của bạn.</p><h2>10 cách tối ưu hóa</h2><ol><li>Sử dụng từ khóa chính xác</li><li>Viết meta description hấp dẫn</li><li>Tạo nội dung dài hơn</li><li>Xây dựng backlink chất lượng</li><li>Tối ưu tốc độ trang</li><li>Sử dụng heading tags đúng</li><li>Thêm schema markup</li><li>Tạo sitemap</li><li>Mobile optimization</li><li>Tăng dwell time</li></ol>',
  'Khám phá 10 cách tối ưu hóa SEO hiệu quả nhất khi sử dụng AI để hỗ trợ tạo nội dung.',
  'published',
  245,
  75000,
  'SEO',
  12,
  NOW(),
  NOW()
);

-- Sample Article 3
INSERT IGNORE INTO articles (user_id, title, slug, content, excerpt, status, views_count, tokens_used, category, reading_time, created_at)
VALUES (
  1,
  'Xu hướng Marketing Digital 2024',
  'xu-huong-marketing-digital-2024',
  '<h2>Tổng quan 2024</h2><p>Năm 2024 mang đến nhiều thay đổi trong ngành marketing digital.</p><h2>Các xu hướng chính</h2><ul><li>AI-powered personalization</li><li>Voice search optimization</li><li>Short-form video content</li><li>Community building</li><li>Sustainability marketing</li></ul>',
  'Cập nhật những xu hướng marketing digital mới nhất sẽ định hình ngành năm 2024.',
  'draft',
  0,
  45000,
  'Marketing',
  6,
  NOW()
);

-- Sample Article 4
INSERT IGNORE INTO articles (user_id, title, slug, content, excerpt, status, views_count, tokens_used, category, reading_time, published_at, created_at)
VALUES (
  1,
  'Cách viết copywriting hiệu quả',
  'cach-viet-copywriting-hieu-qua',
  '<h2>Copywriting là gì</h2><p>Copywriting là nghệ thuật viết lời quảng cáo đủ thuyết phục người đọc thực hiện hành động mong muốn.</p><h2>7 nguyên tắc copywriting</h2><ol><li>Hiểu rõ khách hàng của bạn</li><li>Tạo headline hấp dẫn</li><li>Tập trung vào lợi ích</li><li>Xây dựng sự tin tưởng</li><li>Tạo cảm giác cấp bách</li><li>Sử dụng social proof</li><li>Kết thúc bằng call-to-action mạnh</li></ol>',
  'Học cách viết copy quảng cáo hiệu quả để tăng tỷ lệ chuyển đổi và doanh thu.',
  'published',
  189,
  60000,
  'Copywriting',
  10,
  NOW(),
  NOW()
);

-- Sample Article 5
INSERT IGNORE INTO articles (user_id, title, slug, content, excerpt, status, views_count, tokens_used, category, reading_time, published_at, created_at)
VALUES (
  1,
  'Những lỗi thường gặp khi viết blog',
  'nhung-loi-thuong-gap-khi-viet-blog',
  '<h2>Lỗi 1: Không có kế hoạch nội dung</h2><p>Nhiều blogger viết không có kế hoạch, dẫn đến mất tính nhất quán.</p><h2>Lỗi 2: Bỏ qua SEO</h2><p>SEO rất quan trọng nhưng nhiều người vẫn bỏ qua.</p><h2>Lỗi 3: Nội dung chất lượng kém</h2><p>Chất lượng là vua. Không nên hy sinh chất lượng vì số lượng.</p>',
  'Tránh những lỗi phổ biến khi viết blog để tạo ra nội dung thực sự giá trị cho độc giả.',
  'published',
  156,
  55000,
  'Blog Tips',
  7,
  NOW(),
  NOW()
);

-- Sample Article 6 (Draft)
INSERT IGNORE INTO articles (user_id, title, slug, content, excerpt, status, views_count, tokens_used, category, reading_time, created_at)
VALUES (
  1,
  'AI tools tốt nhất cho content creators',
  'ai-tools-tot-nhat-cho-content-creators',
  '<h2>Giới thiệu</h2><p>Có rất nhiều AI tools có thể giúp các content creators tiết kiệm thời gian.</p>',
  'Danh sách các AI tools tốt nhất để tăng năng suất tạo nội dung.',
  'draft',
  0,
  30000,
  'Tools',
  5,
  NOW()
);
