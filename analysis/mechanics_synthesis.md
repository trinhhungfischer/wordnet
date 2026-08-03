# Phân tích Tổng hợp Các Cơ chế (Mechanics) trong Bubble Game

Tài liệu này tổng hợp và phân loại toàn bộ các cơ chế (mechanics) đang có trong game, bao gồm 22 cơ chế đã định nghĩa trong cấu hình và bổ sung thêm cơ chế "Cắt Chunk".

## 1. Cơ chế Cấu trúc & Phân mảnh (Structure & Fragmentation)
Những cơ chế liên quan đến việc chia tách, liên kết hoặc thay đổi hình thái cấu trúc của từ vựng.
- **Cắt Chunk (Cutting Chunk):** *[CƠ CHẾ MỚI]* Chia tách một từ nguyên vẹn thành các mảnh nhỏ (chunks) riêng biệt. Người chơi phải tìm và ghép đúng các mảnh này lại với nhau để khôi phục từ hoàn chỉnh. Đây là cơ chế cốt lõi để tạo độ khó về mặt ngôn ngữ và logic.
- **Linked Bubbles:** Khóa cứng một từ chính và liên kết nó với các mảnh chunk. Người chơi phải kéo các bóng khác vào merge với các chunk liên kết để giải phóng từ chính.
- **Crack Bubbles:** Quả bóng bị nứt, giảm độ bền sau mỗi lần merge trên bàn. Khi vỡ, nó sẽ bung ra thành các chunk nhỏ (chunkWords).
- **Resize Bubble:** Bóng sẽ to dần lên theo thời gian hoặc lượt đi cho đến khi đạt kích thước tối đa. Merge thành công sẽ đưa bóng về kích thước bình thường.

## 2. Cơ chế Khóa & Cản trở (Blockers & Locking)
Ngăn cản người chơi tương tác hoặc merge bóng cho đến khi hoàn thành một điều kiện cụ thể.
- **Ổ khóa & Chìa (Lock & Key):** Quả bóng bị khóa (Lock) cần được ghép với quả bóng chứa chìa (Key) có cùng màu/id để mở khóa.
- **Tuốc nơ vít & Ốc vít (Screw Lock):** Quả bóng bị khóa bởi số lượng ốc nhất định. Cần dùng các bóng "tuốc nơ vít" để vặn mở từng con ốc.
- **Xích chia đôi (Chain):** Một dây xích đè lên các cụm từ, yêu cầu người chơi hoàn thành/đập vỡ một số lượng category nhất định (breakThreshold) để phá xích.
- **Requirement Lock:** Quả bóng chỉ có thể merge vào những cụm bóng đã đạt đủ số lượng từ (weight) tối thiểu.
- **Cycle Lock:** Bóng bị khóa luân phiên. Cứ mỗi lần merge trên bàn, trạng thái của bóng sẽ chuyển đổi giữa "khóa" và "mở khóa".

## 3. Cơ chế Đếm lùi & Áp lực thời gian (Countdown & Timed Events)
Áp đặt giới hạn số lượt đi (Hit/Merge), buộc người chơi phải ưu tiên xử lý để tránh hậu quả hoặc nhận thưởng.
- **Quả Bom (Burst Bubbles):** Giảm đếm lùi sau mỗi lượt thao tác (Hit). Nếu về 0 quả bom sẽ nổ và làm mất lượt chơi.
- **Bóng đóng băng (Frozen Bubble):** Cần một số lần ghép đúng (Merge) nhất định trên toàn bàn để rã đông bóng.
- **Countdown Bubbles:** Đếm ngược sau mỗi lần Merge. Khi merge chính quả bóng này, người chơi được cộng thêm số lượt move tương ứng với giá trị countdown còn lại.
- **Ice Bomb Bubble:** Đếm lùi theo số lượt merge. Khi kích hoạt, nó sẽ bắn băng và đóng băng (lây nhiễm) một quả bóng bất kỳ khác trên bàn.
- **Bomb Cracking Bubble:** Bom đếm lùi theo lượt merge. Nếu nổ, nó sẽ phóng sét vào các bóng đã ghép (Merged Bubbles) và tách chúng ra thành các từ rời rạc.

## 4. Cơ chế Hiển thị & Ẩn giấu (Visual & Hidden Info)
Thách thức khả năng nhận diện từ vựng của người chơi bằng cách che giấu hoặc làm biến dạng chữ trên bóng.
- **Bóng tàng hình (Cryptic / Hide Text):** Các chữ cái của từ bị ẩn đi và chỉ hiển thị dần dần sau những lượt merge nhất định của người chơi.
- **Từ ngược (Backward Word):** Hiển thị chữ đảo ngược (ví dụ: Water -> retaW).
- **Soap Bubble:** Bọt xà phòng che khuất chữ. Người chơi mất 1 lượt (Double-tap) để lau sạch bọt hoặc phải thử kéo mò.
- **Cycle Fade Out:** Chữ trên bóng thoắt ẩn thoắt hiện luân phiên sau mỗi lần merge trên bàn, không làm cản trở vật lý nhưng cản trở tầm nhìn.

## 5. Cơ chế Vật lý & Di chuyển (Movement & Physics)
Thay đổi cách quả bóng di chuyển hoặc tương tác vật lý trên bản đồ.
- **Immovable Bubbles:** Bóng bị ghim chặt, không thể kéo đi. Chỉ có thể dùng bóng khác kéo vào nó.
- **Spike Bubble:** Tương tự Immovable nhưng có gai nhọn. Merge thành công sẽ làm mất gai và biến thành bóng thường.
- **Float Bubble:** Trôi nổi và bị đẩy lên/xuống dưới cùng của hàng chờ (Drop Queue) nếu không được merge sau số lượt nhất định.
- **Teleport Bubble:** Dịch chuyển tức thời và đổi chỗ với một bóng khác trên bàn sau một số lần merge nhất định.
- **Stack Pipe:** Ống đựng bóng (ngăn xếp). Chỉ quả bóng nằm ở trên cùng của miệng ống mới có thể tương tác hoặc merge.

## Đánh giá Tổng quan
- **Sự đa dạng:** Game hiện có tổng cộng 23 cơ chế, bao trùm các khía cạnh từ tư duy logic, không gian (vật lý) đến nhận diện từ vựng (ẩn chữ, đảo chữ).
- **Mức độ tương tác chéo:** Các cơ chế đếm lùi chung (dựa trên thao tác Merge/Hit toàn bàn) tạo ra chuỗi phản ứng dây chuyền, đòi hỏi người chơi phải cân nhắc kỹ mỗi nước đi để không vô tình kích hoạt các cơ chế phạt (Ice Bomb, Burst Bomb, Bomb Cracking).
- **Khả năng mở rộng:** Cơ chế "Cắt Chunk" hoạt động như nền tảng cơ sở. Khi kết hợp Cắt Chunk với Linked, Crack hoặc Cryptic, độ khó sẽ được nhân lên nhiều lần do sự khó lường trong việc xác định mảnh ghép.
