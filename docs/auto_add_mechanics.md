# Rules for Automatically Adding Mechanics

Tài liệu này lưu trữ các quy tắc được sử dụng khi tự động cấu hình các cơ chế (mechanics) vào level JSON.

## Quy tắc chung

1. **Độc quyền cơ chế (Mutual Exclusivity)**: Một bóng (từ) không thể nằm trong 2 config của cơ chế khác nhau cùng một lúc. Khi một từ đã được gán vào một cơ chế (ví dụ: bị đóng băng), nó sẽ không được chọn cho các cơ chế khác (ví dụ: không thể vừa bị đóng băng vừa bị khoá key).
2. **Dựa trên Drop Queue (`allWordEntries`)**: Các quy tắc liên quan đến thứ tự xuất hiện của bóng (trước/sau) sẽ được tính toán dựa trên chỉ số (index) của từ đó trong mảng `allWordEntries` của file JSON.

## Quy tắc cụ thể cho từng cơ chế (Sắp xếp theo Mechanics_Config_Spec.md)

### 1. Chain (Xích chia đôi)

- Chọn ngẫu nhiên **6-8 từ** (`linkedWords`).
- **Vị trí**: Phải nằm trong **24 bóng đầu tiên** của drop queue.
- **Đặc biệt**: Trong số các từ được chọn, phải **có ít nhất 1 category hoàn chỉnh** (nghĩa là chứa toàn bộ các từ của category đó).
- Ngưỡng phá xích (`breakThreshold`): 3.

### 2. Frozen Bubble (Bóng đóng băng)

- Chọn ngẫu nhiên 1-3 từ.
- Lượt ghép để rã đông (`mergesNeeded`): Random từ 3-5.

### 3. Lock & Key (Khoá và Chìa)

- Chọn ngẫu nhiên 1-5 cặp từ.
- Từ làm Chìa (`keyWord`) và Khoá (`lockWord`) phải thuộc hai category khác nhau.
- **Thứ tự rơi**: `keyWord` (Chìa) BẮT BUỘC phải rơi xuống trước `lockWord` (Khoá) trong drop queue.
- **Vị trí**: `keyWord` tốt nhất nên nằm trong **24 bóng đầu tiên** của màn chơi.

### 4. Burst Bubbles (Quả Bom)

- Chọn ngẫu nhiên 1 từ.
- Số lượt đi còn lại (`movesRemaining`): Random từ 4-6.

### 5. Cryptic / Hide Text (Bóng tàng hình / Khuyết chữ)

- Chọn ngẫu nhiên 1-3 từ.
- Mảng `revealAtMerge` được tạo ngẫu nhiên từ 0-5 với độ dài bằng chiều dài của từ đó.

### 6. Screw Lock (Tuốc nơ vít và Ốc vít)

- Chọn ngẫu nhiên 1 từ bị khoá ốc (`screwLockWord`) và 1-2 từ làm tuốc nơ vít (`screwDriverWords`).
- **Thứ tự rơi**: `screwLockWord` (Ốc vít/Bóng bị khoá) BẮT BUỘC phải rơi xuống trước các `screwDriverWords` (Tuốc nơ vít) trong drop queue.
- **Vị trí**: `screwLockWord` tốt nhất nên nằm trong **24 bóng đầu tiên** của màn chơi.

### 7. Backward Word (Từ ngược)

- Chọn ngẫu nhiên 1-4 bóng.

### 8. Cycle Lock

- Chọn ngẫu nhiên 1-3 từ.
- Thiết lập `startingPosition` ngẫu nhiên là `0` hoặc `1` cho mỗi từ được chọn.

### 9. Immovable Bubbles (Bóng cố định)

- Chọn ngẫu nhiên 1-2 từ.
- Nếu chọn 2 từ, chúng **không được trùng category**.

### 10. Countdown Bubbles (Bóng đếm ngược)

- Chọn ngẫu nhiên 1-2 từ.
- Giá trị đếm ngược (`countdownValue`): Bắt đầu từ 5 (config `[5, -3]`).

### 11. Linked Bubbles (Bóng liên kết)

- Chọn ngẫu nhiên 1 từ chính làm gốc (`Word1`).
- Tìm trong map (`allWordEntries`) các đoạn cắt có sẵn (`chunks` có thuộc tính `parentWord`).
- Chọn ra 2 chunks bất kỳ sao cho chúng **thuộc về 2 từ gốc khác nhau** (khác `parentWord`).
- Gán `Word1` làm từ chính và 2 chunks này vào mảng `linkedChunks`.
- (Chỉ áp dụng cho những level đã có sẵn ít nhất 2 chunks từ 2 từ khác nhau trên map).

### 12. Crack Bubbles (Bóng nứt / Đập đá)

- Chọn ngẫu nhiên 1-2 bóng (độ dài >= 4 ký tự).
- Số lượt đập vỡ (`crackCount`): Random từ 3-5 lượt.
- Bắt buộc cắt từ thành 2 phần (`chunkWords`), mỗi phần có số lượng chữ cái >= 2.

### 13. Requirement Lock (`ReqLock`)

- Level 501: Chọn chính xác 2 từ thuộc 2 category khác nhau.
- Các Level khác: Chọn ngẫu nhiên 1-3 từ thuộc các category khác nhau.
- Weight yêu cầu: `requireWeight = 2`.

### 14. Cycle Fade Out

- Chọn ngẫu nhiên 1-5 từ. Tuy nhiên sử dụng phân phối chuẩn để lấy số lượng (ưu tiên số 3 ra nhiều nhất, 1 và 5 hiếm hơn).
- Level 551: Chọn chính xác 2 bóng Cycle Fade Out nằm trong danh sách drop queue ban đầu (ưu tiên 24 bóng đầu tiên).
- Thiết lập `startingPosition` ngẫu nhiên là `0` hoặc `1` cho mỗi từ được chọn.

### 15. Ice Bomb Bubble

- Chọn ngẫu nhiên 1-3 từ (phân phối ưu tiên số 2 ra nhiều nhất).
- Level 601: Chọn chính xác 1 bóng Ice Bomb Bubble nằm trong danh sách drop queue ban đầu (ưu tiên 24 bóng đầu tiên).
- Lượt để kích nổ (`turnToActive`): Random từ 3-5 lượt (phân phối ưu tiên số 3 ra nhiều nhất).
- Lượt bị đóng băng lây nhiễm (`freezeTurns`): Random từ 1-2 lượt (phân phối ưu tiên số 1 ra nhiều nhất).

### 16. Soap Bubble

- Chọn ngẫu nhiên 1-4 từ (phân phối ưu tiên số 2 ra nhiều nhất).
- Level 601: Chọn chính xác 2 bóng Soap nằm trong danh sách drop queue ban đầu (ưu tiên 24 bóng đầu tiên).
- Lượt để tạo lại bọt xà phòng (`turnsToFill`): Random từ 3-5 lượt (phân phối ưu tiên số 3 ra nhiều nhất).

### 17. Spike Bubble

- Chọn ngẫu nhiên 1-5 từ (phân phối chuẩn, ưu tiên số 3 ra nhiều nhất).
- Level 701: Chọn chính xác 2 bóng Spike nằm trong danh sách drop queue ban đầu (ưu tiên 24 bóng đầu tiên).

### 18. Bomb Cracking Bubble

- Chọn ngẫu nhiên 1-2 từ (70% ra 1 bóng, 30% ra 2 bóng).
- Level 751: Chọn chính xác 1 bóng Bomb Cracking nằm trong danh sách drop queue ban đầu (ưu tiên 24 bóng đầu tiên).
- Số lượt merge để nổ (`mergeRemain`): Random từ 4-6 lượt (ưu tiên số 5 ra nhiều nhất).
- Số bóng bị ảnh hưởng (`chainCount`): Luôn luôn mặc định là 3.

### 19. Float Bubble
- Chọn ngẫu nhiên 1-4 từ (phân phối ưu tiên số 2 ra nhiều nhất).
- Toàn bộ các bóng Float phải ưu tiên nằm trong danh sách drop queue ban đầu (chỉ chọn từ 24 bóng đầu tiên). 
- Level 751 & 801: Chọn chính xác 2 bóng Float (tuân thủ luật luôn nằm trong 24 bóng đầu).
- Số lần ghép (`mergesToFloat`): Cài đặt mặc định ngẫu nhiên từ 3-5 lượt.

### 20. Teleport Bubble
- Chọn ngẫu nhiên 1-4 từ (phân phối ưu tiên số 2 ra nhiều nhất).
- Level 851: Chọn chính xác 2 bóng Teleport nằm trong danh sách drop queue ban đầu (ưu tiên 24 bóng đầu tiên).
- Số lần ghép để dịch chuyển (`mergesToTeleport`): Random từ 2-5 lượt (phân phối ưu tiên số 3 ra nhiều nhất).

### 21. Stack Pipe
- Mỗi màn (nếu có cơ chế này) sẽ chỉ có **duy nhất 1 Stack Pipe** (`pipeId: 0`).
- Mỗi Stack Pipe chứa từ 3 đến 4 bóng (ưu tiên số 3 ra nhiều hơn - tỉ lệ 70% ra 3 bóng).
- Level 901: Chọn chính xác 3 bóng vào Stack Pipe, và 3 bóng này phải nằm gọn trong danh sách drop queue ban đầu (ưu tiên 24 bóng đầu tiên).

### 22. Resize Bubble
- Chọn ngẫu nhiên 1-3 từ (60% ra 1 bóng, 30% ra 2 bóng, 10% ra 3 bóng).
- Level 951: Chọn chính xác 1 bóng Resize nằm trong danh sách drop queue ban đầu (ưu tiên 24 bóng đầu tiên).

## Quy Tắc Sắp Xếp (Drop Order Sorting)
- **Chain (Linked) & Stack Pipe**: Các bóng thuộc cơ chế này luôn được ưu tiên đẩy lên đầu Drop Queue (rơi ra đầu tiên).
- **Key & Lock**: Từ đóng vai trò Ổ khoá (`lockWord`) bắt buộc phải được xuất hiện/rơi ra **TRƯỚC** Từ đóng vai trò Chìa khoá (`keyWord`).
- **Screw & Driver**: Các từ đóng vai trò Tuốc nơ vít (`screwDriverWords`) bắt buộc phải được xuất hiện/rơi ra **TRƯỚC** Từ đóng vai trò Ổ ốc vít (`screwLockWord`).
