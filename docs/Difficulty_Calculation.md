# Hướng Dẫn Thuật Toán Tính Điểm Độ Khó (Difficulty Calculation)

Tài liệu này giải thích chi tiết cách hệ thống `Solution Simulator` tính toán điểm độ khó (Difficulty Score) của một màn chơi trong Wordnet. Điểm số này sẽ quyết định Rank (Cấp độ) cuối cùng của màn chơi.

---

## 1. Cơ Chế Chấm Điểm (Scoring System)

Thuật toán bắt đầu với mức điểm `Score = 0` và cộng/trừ dồn dựa trên các yếu tố sau:

### A. Yếu Tố Cơ Bản
* **Số bước giải (Base Moves):** 
  * `+1 điểm` cho mỗi bước (move) cần thiết để hoàn thành màn chơi. 
  * *Ví dụ:* Màn chơi cần 12 bước gộp sẽ nhận được 12 điểm gốc.

### B. Mật Độ & Tắc Nghẽn (Congestion)
* Phụ thuộc vào giới hạn số lượng bong bóng tối đa trên màn hình (`maxBubblesInScene`).
* **Medium Congestion:** Nếu tổng số bong bóng trong màn chơi **lớn hơn** giới hạn màn hình -> `+5 điểm`.
* **High Congestion:** Nếu tổng số bong bóng **vượt quá 1.5 lần** giới hạn màn hình (màn chơi sẽ thả bóng rất nhiều nhịp) -> `+15 điểm`.

### C. Mức Độ Đánh Lừa (Misleading / Duplicates)
* **Duplicated Chunks:** Nếu màn chơi có các "mảnh ghép" (chunks) trùng lặp tên với nhau (gây nhầm lẫn cho người chơi) -> `+8 điểm` cho mỗi nhóm trùng lặp.

### D. Cơ Chế Cản Trở (Mechanics)
* **Bubble Separator (Xích/Chain):** Kích hoạt -> `+10 điểm`.
* **Frozen Bubbles (Băng):** `+4 điểm` cho mỗi bong bóng bị đóng băng.
* **Key-Lock (Ổ Khóa):** `+8 điểm` cho mỗi bong bóng chứa Ổ Khóa.

### E. Độ Khó Từ Vựng (Word Rarity)
Dựa vào chỉ số `Popularity` (Độ phổ biến) của từ khóa so với bộ từ điển. Thuật toán soi từng từ trên bàn chơi:
* **Ultra Rare** (Cực hiếm, Pop < 15): `+8 điểm` / từ.
* **Very Rare** (Rất hiếm, Pop < 30): `+4 điểm` / từ.
* **Rare** (Hiếm, Pop < 50): `+2 điểm` / từ.
* **Common Deduct** (Trừ điểm dễ): Nếu **hơn 70%** số từ trong màn chơi là từ cực kỳ phổ biến (Pop > 80), màn chơi sẽ được giảm nhẹ độ khó -> `-10 điểm`.

---

## 2. Thang Đo Cấp Độ (Rank Labels)

Sau khi tính tổng tất cả các điểm trên, hệ thống sẽ chốt Rank theo mốc điểm:

| Tổng Điểm (Score) | Cấp Độ (Rank) | Màu Sắc | Nhận Xét |
| :---: | :--- | :--- | :--- |
| **0 - 20** | **Easy** (Dễ) | 🟢 Xanh Lá | Màn chơi ít bước, từ vựng quen thuộc, ít cơ chế cản trở. |
| **21 - 40** | **Medium** (Trung bình) | 🟡 Vàng | Số bước vừa phải, có thể xuất hiện Xích hoặc 1-2 từ vựng hơi lạ. |
| **41 - 60** | **Hard** (Khó) | 🟠 Cam | Từ vựng cực hiếm kết hợp với các cơ chế Khóa, Băng hoặc quá tải bóng. |
| **> 60** | **Expert** (Chuyên gia) | 🔴 Đỏ | Màn chơi cực kỳ dài, dễ bị kẹt (deadlock), hoặc kết hợp liên tục Xích + Băng + Ổ khóa cùng với từ vựng siêu hiếm. |

---

## 3. Đánh Giá Tính Cân Bằng (Balance Analysis)

* **Từ Vựng vs Cơ Chế Cản Trở:** 
  Việc một từ vựng "Cực hiếm" (Ultra Rare) được cộng +8 điểm là cực kỳ cân xứng và hợp lý. Tại sao? Vì +8 điểm tương đương với **1 Ổ khóa** hoặc **2 Cục băng**. Trong thực tế khi chơi, việc người chơi mù tịt một từ vựng không biết gộp với ai cũng gây ức chế và tốn thời gian y hệt như việc phải tìm cách phá một ổ khóa.
* **Sự Tích Lũy:** Nếu một màn chơi bình thường (10 moves = 10 điểm) nhưng sử dụng 3 từ Ultra Rare (3 x 8 = 24 điểm), tổng điểm sẽ là 34 (Medium/Hard). Điều này phản ánh chính xác là dù màn chơi không có chướng ngại vật vật lý, nhưng rào cản tri thức đã đẩy độ khó lên mức cao.
* **Hạ Nhiệt (Cooldown):** Cơ chế trừ 10 điểm khi > 70% từ vựng đều là từ phổ thông giúp hệ thống công bằng. Nếu màn chơi tuy dài (25 bước) nhưng từ vựng quanh quẩn "Dog", "Cat", "Sun", nó vẫn có khả năng giữ vững ở mức Medium thay vì bị vọt lên Hard một cách oan uổng.
