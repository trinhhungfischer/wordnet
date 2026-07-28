# Bubble Game - Mechanics JSON Config Spec

Tài liệu này tổng hợp cấu trúc JSON thực tế mà game engine sử dụng để render các mechanic đặc biệt (Blockers/Power-ups) trên các quả bóng. Các cấu hình này nằm ở cấp cao nhất (root level) của file `Level [X].json`.

> [!IMPORTANT]
> **Về các trường `has___` và `minMax___`:**
> Những trường này (ví dụ: `hasFrozenBubbles`, `minMaxFrozenBubbles`) **HIỆN TẠI KHÔNG QUAN TRỌNG VÀ KHÔNG ĐƯỢC SỬ DỤNG CHÍNH THỨC DƯỚI ENGINE** để render cơ chế.
> Đó là lý do bạn thấy `hasFrozenBubbles: 0` nhưng màn chơi vẫn xuất hiện bóng đóng băng. Nguyên nhân là do UI của tool Wordnet (`LevelSettings.tsx`) tự sinh ra các trường `has_`/`minMax_` này, trong khi Game Engine thực tế lại đọc dữ liệu từ các mảng Object chi tiết (như `frozenBubbles`, `burstBubbles`...) để biết chính xác chữ nào bị gắn mechanic gì.

Dưới đây là cấu trúc chi tiết của các mảng Object mechanic thực tế:

---

## 1. Xích chia đôi (Chain) - Lv 20

**Trường áp dụng:** `useBubbleSeparator` và `bubbleSeparatorData`

Cấu trúc:

```json
"useBubbleSeparator": 1,
"bubbleSeparatorData": {
  "breakThreshold": 3,
  "linkedWords": [
    "Bloom",
    "Flower",
    "Garden",
    "Blossom",
    "Hydration",
    "Diet",
    "Basket"
  ]
}
```

- `breakThreshold`: Số category cần đập vỡ để mở xích.
- `linkedWords`: Danh sách các từ (hoặc mảnh từ) nằm ở bên dưới dây xích.

---

## 2. Bóng đóng băng (Frozen Bubble) - Lv 30

**Trường áp dụng:** `frozenBubbles` (Mảng)

Cấu trúc:

```json
"frozenBubbles": [
  {
    "word": "Banana",
    "mergesNeeded": 5
  },
  {
    "word": "Currency",
    "mergesNeeded": 6
  }
]
```

- `word`: Cụm từ đích danh bị đóng băng.
- `mergesNeeded`: Số lần hit (hoặc ghép) cần thiết để rã đông bóng.

---

## 3. Ổ khóa & Chìa (Lock & Key) - Lv 50

**Trường áp dụng:** `keyLockBubbles` (Mảng)

Cấu trúc:

```json
"keyLockBubbles": [
  {
    "keyWord": "Black",
    "lockWord": "Hexagon",
    "id": 0
  },
  {
    "keyWord": "Tenderloin",
    "lockWord": "Mob",
    "id": 1
  }
]
```

- `keyWord`: Từ chứa chìa khóa.
- `lockWord`: Từ bị khóa (cần ghép thành công `keyWord` để mở).
- `id`: Tương ứng với màu/loại của khóa (để ghép đúng chìa với khóa).

---

## 4. Quả Bom (Burst Bubbles) - Lv 81

**Trường áp dụng:** `burstBubbles` (Mảng)

Cấu trúc:

```json
"burstBubbles": [
  {
    "word": "Solid",
    "movesRemaining": 6
  },
  {
    "word": "Saw",
    "movesRemaining": 4
  }
]
```

- `word`: Chữ bị gắn bom nổ chậm.
- `movesRemaining`: Số lượt đi còn lại trước khi quả bom phát nổ. (Dưới 3 turn sẽ hiển thị cảnh báo đỏ). Mỗi lần hit (hoặc ghép) sẽ làm giảm đi 1.
- `results`: Nếu bom nổ, lượt chơi sẽ trừ đi một lượt -> thay đổi cách tính toán và recommend lời giải

---

## 5. Bóng tàng hình / Khuyết chữ (Cryptic/Hide Text) - Lv 121

**Trường áp dụng:** `crypticBubbles` (Mảng)

Cấu trúc:

```json
"crypticBubbles": [
  {
    "word": "Dolphin",
    "revealAtMerge": [5, 0, 2, 3, 1, 4, 0]
  }
]
```

- `word`: Từ bị tàng hình.
- `revealAtMerge`: Định nghĩa ở lượt merge thứ mấy (của game) thì ký tự tương ứng tại vị trí đó mới ló mặt ra (0 = hiển thị luôn từ đầu). Mảng này chứa các số nguyên tương ứng với vị trí từng chữ cái trong `word`.

---

## 6. Tuốc nơ vít & Ốc vít (Screw Lock) - Lv 161

**Trường áp dụng:** `screwLockBubbles` (Mảng)

Cấu trúc:

```json
"screwLockBubbles": [
  {
    "screwLockWord": "Chamber",
    "screwDriverWords": ["Grain", "whose"],
    "id": 0,
    "screwCount": 2
  },
  {
    "screwLockWord": "Faraway",
    "screwDriverWords": ["Bold", "red", "locke", "font"],
    "id": 1,
    "screwCount": 4
  }
]
```

- `screwLockWord`: Quả bóng bị khóa bởi các con ốc vít.
- `screwDriverWords`: Danh sách các từ đóng vai trò làm tuốc nơ vít để vặn ốc.
- `id`: Loại ốc / màu ốc.
- `screwCount`: Số lượng ốc vít đang gắn trên quả bóng bị khóa.

**Luật chơi:** Các từ bị lock (`screwLockWord`) sẽ không thể merge cho đến khi các screw (thông qua việc merge các `screwDriverWords`) được vặn hết (mất screw đi).

---

## 7. Từ ngược (Backward Word) - Lv 201

**Trường áp dụng:** `backwardBubbles` (Mảng)

Cấu trúc:

```json
"backwardBubbles": [
  {"word": "Water"},
  {"word": "King"},
  {"word": "Television"}
]
```

- `word`: Từ sẽ bị hiển thị ngược chữ trên quả bóng (ví dụ: `Water` -> `retaW`).

## 8. Cycle Lock

**Trường áp dụng:** `cycleLockBubbles` (Mảng)
Cấu trúc:

```json
"cycleLockBubbles": [
  {
    "cycleLockWord": "Cycle",
    "startingPosition": 0
  }
]
```

- `startingPosition`: Vị trí ban đầu của từ khi bắt đầu level (0 = không bị khoá khởi đầu, 1 = bị khoá khởi đầu)

**Luật chơi:** Các từ bị Cycle Lock là 1 sẽ không thể merge và khi sang trạng thái 0 thì có thể merge. Số lần hit (hoặc ghép) sẽ chuyển khoá từ 0 sang 1 và ngược lại. Khi merge vào bóng Cycle (hoặc ngược lại) thì bóng merge sẽ mất luôn Cycle Lock trở lại trạng thái bình thường.

## 9. Immovable Bubbles

**Trường áp dụng:** `immovableBubbles` (Mảng)
Cấu trúc:

```json
"immovableBubbles": ["Immovable", "Unmovable"]
```

**Luật chơi:** Quả bóng không di chuyển được, chỉ bóng khác kéo vào merge, thay visual của bóng. Bóng merge vào cũng không thể di chuyển. Quan trọng, không thay đổi thuật toán giải gì khác

**Chú ý:** Khi generate level, 2 từ cùng category sẽ không cùng có cơ chế Immovable. Nếu có, sẽ không thể merge hoàn thành được và gây lỗi logic game.

## 10. Countdown Bubbles

**Trường áp dụng:** `countdownBubbles` (Mảng)
Cấu trúc:

```json
"countdownBubbles": [
  {
    "word": "Countdown",
    "countdownValue": [5,-3]
  }
```

**Luật chơi:** Có một số đếm ngược phía bên phải của quả bóng. Mỗi lần hit (Hoặc ghép) countdown sẽ trừ đi 1 và trừ tối đa về min trong config. Config "countdownValue" là mảng chứa giá trị ban đầu và giá trị tối thiểu. Tới khi merge quả bóng này, cộng thêm số lượt move bằng số điểm countdown

**Chú ý:** Không thể xuất hiện cùng lúc với các cơ chế khác như Frozen, Burst, Screw Lock, Cycle Lock. Nếu xuất hiện cùng lúc thì sẽ bị lỗi hiển thị.

## 11. Linked Bubbles

**Trường áp dụng:** `linkedBubbles` (Mảng)
Cấu trúc:

```json
"linkedBubbles": [
  {
    "word": "Friday",
    "linkedChunks": ["Go", "Hor"]
  }
]
```

**Luật chơi:**
1. Có một từ chính (ví dụ: `Friday`) bị linked với 1 hoặc nhiều chunk (ví dụ: `Go`, `Hor`). 
2. Từ chính (`Friday`) bị khoá cứng: không thể di chuyển, không thể tương tác hay merge vào từ khác.
3. Các bóng Chunk bị liên kết (`Go`, `Hor`) cũng bị khoá chiều kéo đi: không thể kéo chúng đi merge với từ khác (không làm source).
4. Chỉ có thể dùng bóng khác kéo vào các Chunk liên kết này (chúng chỉ làm target). Khi ghép thành công (ví dụ kéo `At` vào `Go` để thành `Goat`), liên kết đó sẽ bị tháo gỡ.
5. Khi **tất cả** các chunk liên kết đều bị tháo gỡ (đã ghép thành từ hoàn chỉnh), từ chính (`Friday`) sẽ trở lại trạng thái bình thường, có thể tương tác/merge.

**Chú ý:** 
- Các phần tử trong mảng `linkedChunks` chỉ chứa các mảnh từ (chunk), không dùng cho từ hoàn chỉnh.
- **Cảnh báo Deadlock (Lỗi thiết kế màn chơi):** Tuyệt đối KHÔNG đưa toàn bộ các mảnh cắt ra của cùng một từ (ví dụ: cả `"Hor"` và `"Se"`) vào chung mảng `linkedChunks`. Vì các mảnh trong `linkedChunks` không thể kéo đi (bị khoá vai trò source), người chơi sẽ không thể kéo mảnh này vào mảnh kia để ghép thành từ hoàn chỉnh, dẫn đến màn chơi bị **deadlock** (bế tắc không thể giải).

## 12. Crack Bubbles

**Trường áp dụng:** `crackBubbles` (Mảng)
Cấu trúc:

```json
"crackBubbles": [
  {
    "word": "Cracked",
    "crackCount": 3,
    "chunkWords": ["Cra", "cked"]
  }
]
```

**Luật chơi:** Quả bóng đang bị nứt. Mỗi lần hit (hoặc ghép) sẽ làm giảm crackCount đi 1. Khi crackCount = 0, quả bóng sẽ bị vỡ ra và spawn ra các chunkWords tương ứng. Các chunkWords này có thể merge được và tạo lại thành từ bình thường.

# 13. Requirement Lock
**Trường áp dụng:** `requirementLockBubbles` (Mảng)
Cấu trúc:
```json
"requirementLockBubbles": [
  {
    "requirementLockWord": "Requirement",
    "requireWeight": 3
  },
  {
    "requirementLockWord": "Lock",
    "requireWeight": 2
  }
]
```

**Luật chơi:** Quả bóng có khoá Requirement Lock từ 2 tới 3. Khoá này quy định quả bóng này chỉ merge được vào Merge Bubble có số lượng từ (weight) bằng hoặc lớn hơn `requireWeight`. Chiều ngược lại merge Merge Bubble cũng thế. 
Ví dụ: nếu `requireWeight` = 2, thì quả bóng này chỉ merge được vào Merge Bubble có 2 từ trở lên rồi


# 14. Cycle Fade Out
**Trường áp dụng:** `cycleFadeOutBubbles` (Mảng)
Cấu trúc:
```json
"cycleFadeOutBubbles": [
  {
    "fadeWord": "CycleFadeOut",
    "startingPosition": 0
  }
]
```
- `startingPosition`: Vị trí ban đầu của từ khi bắt đầu level (0 = không bị ẩn từ, 1 = bị ẩn từ)

**Luật chơi:** Tương tự Cycle Lock mỗi lần hit (merge) sẽ ẩn hoặc hiện chữ trong bóng đi luân phiên. Bóng đó vẫn được merge hoặc kéo đi chỗ khác nên không ảnh hưởng tới thuật toán giải. Chỉ ảnh hưởng tới hiển thị chữ trên bóng.

# 15. 