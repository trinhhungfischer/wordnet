# Quy trình tích hợp một Cơ chế (Mechanic) mới vào Wordnet Tool

Tài liệu này tổng hợp các bước cần thiết dựa trên kinh nghiệm thực tế (sau khi đã implement Frozen Bubbles, Chains, Cracked Glass, Locks & Keys) để bạn có thể tự thêm hoặc yêu cầu thêm các cơ chế game mới một cách trọn vẹn và không bỏ sót logic.

---

## 1. Định nghĩa Cấu trúc Dữ liệu (Data Structure)

Mỗi cơ chế cần một nơi để lưu trữ cấu hình trong file JSON của level.

- **Thêm field vào LevelData:** Xác định kiểu dữ liệu cho cơ chế (VD: mảng các object `{ word: string, mergesNeeded: number }` cho Ice, hoặc `{ lockWord: string, keyWord: string }` cho Key & Lock).
- **Cập nhật Structure Matcher / Magic Change:** Đảm bảo khi người dùng import file từ điển mới hoặc sử dụng Magic Change, logic copy mechanic sẽ map từ cũ sang từ mới. Bạn cần cập nhật hàm `handleImportDictionary` trong `GraphEditor.tsx` để copy các rule của cơ chế sang tên node mới.

## 2. Giao diện Cài đặt Level (Level Settings UI)

Cần có giao diện để người dùng thiết lập và chỉnh sửa cơ chế này cho từng màn chơi.

- **Tạo UI Section mới trong `LevelSettings.tsx`:** Tách biệt thành một khung giao diện riêng, chứa tiêu đề và icon.
- **Hỗ trợ thêm/xóa/sửa (CRUD):** Các input/button để thay đổi thông số của cơ chế. Sử dụng hàm `handleChange('fieldName', newData)` để lưu vào `levelData`.
- **Focus Node:** Gắn sự kiện `onClick` vào tên từ trong bảng setting để tự động focus đến Node đó trên đồ thị bằng hàm `onFocusWord()`.

## 3. Hiển thị Trực quan (Visual Rendering)

Người dùng (và người thiết kế level) cần nhìn thấy ngay từ nào đang bị áp dụng cơ chế.

- **Graph Nodes (`CustomNode.tsx`):**
  - Viết các hàm kiểm tra trạng thái node (VD: `isNodeFrozen()`, `isNodeLock()`) trong `GraphEditor.tsx`.
  - Truyền dữ liệu trạng thái này vào prop `data` của ReactFlow nodes.
  - Cập nhật `CustomNode.tsx` để đổi màu nền (background), màu viền (border), đổ bóng (box-shadow) và thêm icon (Lucide React) tương ứng cho cơ chế.
- **Drop Queue List (`GraphEditor.tsx`):**
  - Cập nhật hàm map của `spawnQueueIds` ở panel bên trái.
  - Tương tự như CustomNode, hãy áp dụng màu sắc và icon tương ứng để người dùng biết node nào trong hàng chờ đang có cơ chế.

## 4. Thuật toán Giải đố (Solution Calculator)

Đây là bước quan trọng nhất để giả lập xem level có thể giải được hay không. Cập nhật file `solutionCalculator.ts`:

- **State của từng Bong bóng (`BoardBubbleState`):** Thêm các field tracking (như `isLocked`, `mergesLeft`) để theo dõi trạng thái của bong bóng trên board qua từng turn.
- **Khởi tạo State ban đầu (`getBubbleState`):** Đọc cấu hình từ `levelData` để gán trạng thái ban đầu cho bubble mỗi khi nó xuất hiện trên board.
- **Tracking Logic (Tracking Variables):** Khai báo các biến đếm (như `usedWords`, `completedCategoriesCount`, `moveCount`) để tính toán điều kiện phá vỡ/mở khoá.
- **Ràng buộc Ghép (Merge Constraints):** Trong vòng lặp tìm cặp ghép (chunk + word), thêm câu lệnh điều kiện: _Nếu bubble bị ảnh hưởng bởi cơ chế (bị đóng băng, bị khoá) thì bỏ qua, không cho phép ghép._
- **Sự kiện Giải phóng (Event Steps):** Khi thoả mãn điều kiện mở khoá (ghép thành công chìa khoá, đủ số lần merge...), ghi nhận lại bằng một event step (`type: 'event'`) để đẩy vào Timeline hiển thị cho người xem.
- **Độ khó (Difficulty Factors):** Đẩy thông tin cảnh báo độ khó vào mảng `factors` (VD: "Có 5 cơ chế khoá-chìa") để cộng điểm độ khó.
- **Kiểm tra Kết quả (Result Check):** Sau khi tìm được giải pháp, kiểm tra lại thuật toán trên các màn có cơ chế đó để đảm bảo nó hoạt động đúng, không bỏ sót logic nào. Viết unit test nếu cần thiết để cover các trường hợp đặc biệt (VD: có nhiều hơn 1 bubble bị đóng băng cùng lúc).

## 5. Giao diện Lời giải (Solution Modal UI)

Cập nhật giao diện mô phỏng lời giải `SolutionModal.tsx` để tái hiện lại tác động của cơ chế.

- **Đọc State:** Trong `displayNodes`, map các biến trạng thái mới từ `bubbleState`.
- **Hiển thị Board State:** Tại cột bên phải (Board State), sử dụng các trạng thái vừa đọc để render màu sắc nền, màu viền và icon (kèm số lần cần merge nếu có) lên từng bong bóng ứng với từng mốc thời gian trong Timeline.

---

### 💡 Lưu ý chung

- Cố gắng giữ màu sắc hiển thị **nhất quán** trên toàn bộ 3 màn hình: Graph Editor, Drop Queue, và Solution Modal.
- Cân nhắc sử dụng **mảng màu động (dynamic palette)** (như đã làm với Lock & Key) nếu một màn chơi có thể có nhiều cụm cơ chế giống nhau để người chơi phân biệt (Khoá A đi với Chìa A, Khoá B đi với Chìa B).
