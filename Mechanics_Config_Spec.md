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
*   `breakThreshold`: Số category cần đập vỡ để mở xích.
*   `linkedWords`: Danh sách các từ (hoặc mảnh từ) nằm ở bên dưới dây xích.

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
*   `word`: Cụm từ đích danh bị đóng băng.
*   `mergesNeeded`: Số lần hit (hoặc ghép) cần thiết để rã đông bóng.

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
*   `keyWord`: Từ chứa chìa khóa.
*   `lockWord`: Từ bị khóa (cần ghép thành công `keyWord` để mở).
*   `id`: Tương ứng với màu/loại của khóa (để ghép đúng chìa với khóa).

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
*   `word`: Chữ bị gắn bom nổ chậm.
*   `movesRemaining`: Số lượt đi còn lại trước khi quả bom phát nổ. (Dưới 3 turn sẽ hiển thị cảnh báo đỏ).

---

## 5. Bóng tàng hình / Khuyết chữ (Cryptic/Hide Text) - Lv 121
**Trường áp dụng:** `crypticBubbles` (Mảng)

Cấu trúc:
```json
"crypticBubbles": [
  {
    "word": "Dolphin",
    "letters": [
      {"letter": 68, "revealAtMerge": 5},
      {"letter": 111, "revealAtMerge": 0},
      {"letter": 108, "revealAtMerge": 2},
      {"letter": 112, "revealAtMerge": 3},
      {"letter": 104, "revealAtMerge": 1},
      {"letter": 105, "revealAtMerge": 4},
      {"letter": 110, "revealAtMerge": 0}
    ]
  }
]
```
*   `word`: Từ bị tàng hình.
*   `letters`: Chứa danh sách các ký tự trong từ đó (mã hóa ASCII - ví dụ 68 là 'D', 111 là 'o').
*   `revealAtMerge`: Định nghĩa ở lượt merge thứ mấy (của game) thì ký tự này mới ló mặt ra (0 = hiển thị luôn từ đầu).

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
*   `screwLockWord`: Quả bóng bị khóa bởi các con ốc vít.
*   `screwDriverWords`: Danh sách các từ đóng vai trò làm tuốc nơ vít để vặn ốc.
*   `id`: Loại ốc / màu ốc.
*   `screwCount`: Số lượng ốc vít đang gắn trên quả bóng bị khóa.

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
*   `word`: Từ sẽ bị hiển thị ngược chữ trên quả bóng (ví dụ: `Water` -> `retaW`).
