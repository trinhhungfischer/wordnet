# Quy tắc sinh Từ Điển Tiếng Việt cho Game Giải Đố (Word Puzzle)

Để đảm bảo chất lượng Data từ vựng sinh ra từ các AI Agent đáp ứng hoàn hảo cho game giải đố chữ (như Wordscapes, Word Connect), các Agent PHẢI tuân thủ các quy tắc sau:

## 1. Loại bỏ Danh từ chỉ loại (Classifier Nouns) để tăng tính giải đố
Nếu Tên Chủ Đề (Category) đã bao hàm ý nghĩa của từ, **bắt buộc phải bỏ các từ phân loại** (Con, Quả, Trái, Cây, Hoa, Cái, Chiếc, Bức, Tấm, Cục, Thỏi, Thịt, Món, Bộ...) ở đầu từ vựng.
Việc này không chỉ giúp từ vựng gọn gàng mà còn buộc người chơi phải suy luận, đúng bản chất game giải đố.
- **Category Trái Cây:** Chỉ dùng `Dưa Hấu`, `Táo`, `Cam` (KHÔNG dùng `Quả Dưa Hấu`, `Trái Táo`).
- **Category Động Vật:** Chỉ dùng `Chó`, `Mèo`, `Gà` (KHÔNG dùng `Con Chó`, `Con Gà`).
- **Category Hoa:** Chỉ dùng `Hồng`, `Cúc`, `Mai` (KHÔNG dùng `Hoa Hồng`, `Hoa Cúc`).
- **Category Đặc Sản:** Chỉ dùng `Trâu Gác Bếp`, `Phở` (KHÔNG dùng `Thịt Trâu Gác Bếp`, `Món Phở`).

## 2. Độ dài linh hoạt & Từ ngữ Tự nhiên
- Chiều dài từ vựng (Word length) nên từ **2 đến 16 ký tự** (bao gồm khoảng trắng), tương đương **1 đến 3 âm tiết**.
- **Tuyệt đối KHÔNG cắt cụt cụm từ thành các từ đơn vô nghĩa** (như `Máy`, `Sự`, `Tiếng`, `Đồ`) chỉ để ép cho từ ngắn lại. 
- Nếu từ gốc tự nhiên vốn là từ ghép 2 âm tiết (VD: `Nhà Máy`, `Bệnh Viện`, `Trạm Bơm`), hãy giữ nguyên 2 âm tiết đó. Thuật toán `batchMagicChange` sẽ tự động tìm kiếm và khớp các từ dài này vào các ô chữ dài tương ứng của cấu trúc Level tiếng Anh (tiếng Anh có những từ dài tới 20+ ký tự).

## 3. Quy chuẩn Tên Category (Chủ đề)
- Tên Category phải bao quát được nhóm từ bên dưới và **cực kỳ ngắn gọn** (1-3 âm tiết, tối đa 15 ký tự).
- KHÔNG dùng câu văn dài dòng làm Tên Category.
- **ĐÚNG:** `Trái Cây`, `Động Vật`, `Kiến Trúc`, `Nghề Nghiệp`, `Thời Tiết`, `Cảm Xúc`.
- **SAI:** `Các loại động vật hoang dã ở châu Phi` (Quá dài, tràn UI game).

## 4. Định dạng chữ (Formatting)
- Tên Category và tất cả Từ Vựng (Words) đều phải được viết ở định dạng **Title Case** (Viết hoa chữ cái đầu tiên của mỗi âm tiết).
- **ĐÚNG:** `Dưa Hấu`, `Nhà Máy`, `Xe Cứu Thương`.
- **SAI:** `dưa hấu`, `DƯA HẤU`, `Dưa hấu`.
