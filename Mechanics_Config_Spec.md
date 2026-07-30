# Bubble Game - Mechanics JSON Config Spec

Tài liệu này tổng hợp cấu trúc JSON thực tế mà game engine sử dụng để render các mechanic đặc biệt (Blockers/Power-ups) trên các quả bóng. Các cấu hình này nằm ở cấp cao nhất (root level) của file `Level [X].json`.

> [!IMPORTANT]
> **Về các trường `has___` và `minMax___`:**
> Những trường này (ví dụ: `hasFrozenBubbles`, `minMaxFrozenBubbles`) **HIỆN TẠI KHÔNG QUAN TRỌNG VÀ KHÔNG ĐƯỢC SỬ DỤNG CHÍNH THỨC DƯỚI ENGINE** để render cơ chế.
> Đó là lý do bạn thấy `hasFrozenBubbles: 0` nhưng màn chơi vẫn xuất hiện bóng đóng băng. Nguyên nhân là do UI của tool Wordnet (`LevelSettings.tsx`) tự sinh ra các trường `has_`/`minMax_` này, trong khi Game Engine thực tế lại đọc dữ liệu từ các mảng Object chi tiết (như `frozenBubbles`, `burstBubbles`...) để biết chính xác chữ nào bị gắn mechanic gì.

Dưới đây là cấu trúc chi tiết của các mảng Object mechanic thực tế:

---

## Định nghĩa thuật ngữ cơ bản (Terminology)

Để làm rõ cách hoạt động của các cơ chế đếm lùi/tính lượt, các khái niệm tương tác được định nghĩa thống nhất như sau:

1. **Merge (Ghép đúng):**
   - Là hành động kéo một quả bóng (source) thả vào một quả bóng khác (target) **cùng nhóm** thành công, khiến chúng gộp lại với nhau.
   - Khi một cơ chế đếm theo "Merge" (Ví dụ: đếm lùi toàn bàn hoặc đếm lùi trực tiếp), bộ đếm **chỉ giảm khi người chơi ghép thành công**.

2. **Hit (Lượt tương tác / Nước đi):**
   - Là **bất kỳ** hành động thao tác nào của người chơi làm tiêu tốn 1 lượt đi (Turn/Move). Bao gồm:
     - Kéo ghép thành công (Merge đúng).
     - Kéo ghép thất bại (Kéo sai nhóm khiến 2 bóng đẩy nhau ra).
     - Tương tác đặc biệt (Ví dụ: Double-tap để lau bọt xà phòng Soap Bubble).
   - Khi cơ chế đếm theo "Hit", bộ đếm sẽ giảm ở mọi nước đi của người chơi (bất kể đúng sai).

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
- `mergesNeeded`: Số lần ghép đúng (merge) cần thiết để rã đông bóng.

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
- `movesRemaining`: Số lượt đi (Hit) còn lại trước khi quả bom phát nổ. (Dưới 3 turn sẽ hiển thị cảnh báo đỏ). Mỗi lần **Hit** (bất kể ghép đúng hay kéo sai) sẽ làm giảm đi 1.
- `results`: Nếu bom nổ, lượt chơi sẽ trừ đi một lượt -> thay đổi cách tính toán và recommend lời giải.
- _Lưu ý mô phỏng:_ Khi quả bom đếm ngược về 0 (hết lượt), nó sẽ nổ và mất cơ chế Bom (trở về hiển thị như một quả bóng thường trên board state).

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

**Luật chơi:** Các từ bị Cycle Lock là 1 sẽ không thể merge và khi sang trạng thái 0 thì có thể merge. Số lần merge sẽ chuyển khoá từ 0 sang 1 và ngược lại. Khi merge vào bóng Cycle (hoặc ngược lại) thì bóng merge sẽ mất luôn Cycle Lock trở lại trạng thái bình thường.

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

**Luật chơi:** Có một số đếm ngược phía bên phải của quả bóng. Mỗi lần ghép đúng (Merge) countdown sẽ trừ đi 1 và trừ tối đa về min trong config. Config "countdownValue" là mảng chứa giá trị ban đầu và giá trị tối thiểu. Tới khi merge quả bóng này, cộng thêm số lượt move bằng số điểm countdown

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

**Luật chơi:** Quả bóng đang bị nứt. Mỗi lần ghép đúng (Merge) liên quan tới quả bóng này sẽ làm giảm crackCount đi 1. Khi crackCount = 0, quả bóng sẽ bị vỡ ra và spawn ra các chunkWords tương ứng. Các chunkWords này có thể merge được và tạo lại thành từ bình thường.

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
Ví dụ: nếu `requireWeight` = 2, thì quả bóng này chỉ merge được vào Merge Bubble có 2 từ trở lên rồi.
_Lưu ý:_

- Requirement Lock chỉ áp dụng cho từ hoàn chỉnh (không cản trở việc ghép các mảnh chunks của từ đó lại với nhau).
- Sau khi ghép thành công vào một bong bóng đủ weight, cụm bong bóng mới tạo ra sẽ không còn bị khoá Requirement Lock nữa.

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

**Luật chơi:** Tương tự Cycle Lock mỗi lần merge sẽ ẩn hoặc hiện chữ trong bóng đi luân phiên. Bóng đó vẫn được merge hoặc kéo đi chỗ khác nên không ảnh hưởng tới thuật toán giải. Chỉ ảnh hưởng tới hiển thị chữ trên bóng.

# 15. Ice Bomb Bubble

**Trường áp dụng:** `iceBombBubbles` (Mảng)
Cấu trúc:

```json
"iceBombBubbles": [
  {
    "word": "IceBomb",
    "turnToActive": 3,
    "freezeTurns": 1
  }
]
```

"turnToActive": Số lượt merge (theo chu kì) trên toàn bàn để quả bóng này active kĩ năng biến một quả bóng bất kỳ thành Freeze "Ice Bomb Bubble".
"freezeTurns": Số lượt Freeze "Ice Bomb Bubble" để nó biến thành một "Ice Bomb Bubble" mới

**Luật chơi:**

- Khi người chơi thực hiện thành công một lần ghép đúng (Merge) trên bàn, `turnToActive` của Ice Bomb sẽ giảm 1.
- Khi đếm ngược đạt 0, nó sẽ biến một quả bóng bất kỳ trên bàn thành "Ice Bomb Bubble" ở trạng thái bị đóng băng. Đếm ngược của Ice Bomb gốc sẽ reset về lại `turnToActive` ban đầu và tiếp tục vòng lặp nổ.
- Quả bóng mục tiêu bị lây nhiễm sẽ bị đóng băng (hiển thị giống cơ chế Frozen Bubble) trong `freezeTurns` lượt merge. Sau đó nó sẽ rã đông và chính thức biến thành Ice Bomb Bubble với config giống config của cha.
- Nếu quả bóng đang là Ice Bomb bị người chơi ghép (merge) thành chữ khác, cơ chế Ice Bomb trên quả bóng đó sẽ biến mất hoàn toàn.
- **Merge giữa các Ice Bomb và Bóng bị lây nhiễm (Infected):** Bóng Ice Bomb hoặc bóng đang bị lây nhiễm (Infected - chưa hóa hoàn toàn thành Ice Bomb) hoàn toàn có thể tự merge với nhau hoặc merge với bóng bình thường (nếu cùng nhóm) để tạo ra một Merge Bubble bình thường. Khi đó tất cả sẽ mất cơ chế Ice Bomb/Infected. Bóng Infected **không bị khoá merge**.
- **Lưu ý mục tiêu:** Ice Bomb **KHÔNG** lây nhiễm sang các quả bóng đang là mảnh ghép cắt ra (chunk) hoặc các Merge Bubble (đã gộp nhiều chữ). Nếu trên bàn không còn bong bóng hợp lệ nào để lây nhiễm, nó sẽ bỏ qua lượt nổ đó và tự động reset lại đếm ngược.

## 16. Soap Bubble

**Trường áp dụng:** `soapBubbles` (Mảng)
Cấu trúc đề xuất:

```json
"soapBubbles": [
  {
    "word": "Soap",
    "turnsToFill": 3
  }
]
```

**Luật chơi:**

- Chữ trên bong bóng bị che mờ hoàn toàn bởi một lớp bọt xà phòng bẩn (chỉ hiển thị dấu chấm hỏi `?` hoặc chữ bị nhòe).
- **Cách hết mờ:** Người chơi phải chạm đúp (Double-tap) vào bong bóng đó để "lau sạch" bọt và nhìn rõ từ vựng bên trong. Thao tác chạm đúp này sẽ tính là **1 lượt đi (Move)**.
- **Kéo bừa (thử vận may):** Nếu người chơi lười mở chữ mà kéo một từ khác vào để thử ghép:
  - Nếu **sai nhóm**: Mất 1 lượt đi và hai bong bóng đẩy nhau ra.
  - Nếu **đúng nhóm**: Bong bóng tự mở chữ và gộp nhóm thành công (không bị phạt lượt lau bọt).
- **Khi hết bọt:** Bong bóng sẽ trở về trạng thái bình thường, và sau "turnsToFill" lượt đi (Move) tiếp theo, nó sẽ tự động xuất hiện bọt xà phòng trở lại (bị che mờ chữ).

- **Lưu ý:**
  - Cơ chế này không ảnh hưởng tới thuật toán giải của level nhưng sẽ làm recommend move thêm một với mỗi bong bóng Soap (Do người chơi phải trỏ vào để xem là nó là gì), chỉ là một lớp tương tác vật lý và hiển thị chữ trên bóng.

---

## 17. Spike Bubble

**Trường áp dụng:** `spikeBubbles` (Mảng)
Cấu trúc đề xuất:

```json
"spikeBubbles": ["Spike", "Thorn"]
```

**Luật chơi:**

- Tương tự như cơ chế **Immovable Bubbles** (không thể tự kéo đi), nhưng khi có một quả bóng khác kéo vào ghép (merge) thì bóng gai sẽ mất gai và biến thành bóng thường.
- Có visual gai nhọn xung quanh quả bóng.

---

## 18. Bomb Cracking Bubble

**Trường áp dụng:** `bombCrackingBubbles` (Mảng)
Cấu trúc đề xuất:

```json
"bombCrackingBubbles": [
  {
    "word": "Bomb",
    "mergeRemain": 5,
    "chainCount": 3
  }
]
```

- `mergeRemain`: Số lần ghép đúng (Merge) trên toàn bàn chơi trước khi quả bom nổ.
- `chainCount`: Số lượng Merged Bubble tối đa bị chọn làm mục tiêu khi bom nổ để tách chữ.

**Luật chơi:**

- Mỗi khi người chơi thực hiện thành công một lượt **Merge** (bất kỳ đâu trên bàn chơi), bộ đếm `mergeRemain` của quả bom sẽ giảm đi 1.
- **Gỡ bom (Defuse):** Bất cứ khi nào quả bóng chứa bom được ghép (Merge) thành công với một bóng khác (bất kể là kéo vào hay bị kéo vào, biến thành Merged Bubble), quả bom sẽ bị gỡ, mất trạng thái bom và không bao giờ phát nổ nữa.
- **Bom nổ:** Khi bộ đếm `mergeRemain` về 0:
  - Game engine sẽ tạo hiệu ứng nổ và chọn ra tối đa `chainCount` quả bóng đã ghép (Merged Bubbles) trên bàn.
  - Tia sét sẽ giật vào các Merged Bubbles này và **tách 1 từ nguyên vẹn (uncut word) ra khỏi mỗi Merged Bubble bị chọn** (Ví dụ: `apple|orange|grape` bị tách thành `apple|orange` và `grape`).
  - Sau khi nổ xong, bộ đếm `mergeRemain` của quả bom tự động **reset lại về giá trị ban đầu** và lặp lại chu kỳ đếm ngược mới.
- **Lưu ý cho mô phỏng logic (Solution Calculator):** Việc tia sét chọn và tách các Merged Bubbles chỉ là tính năng dưới game engine. Đối với thuật toán giải đố của Wordnet Tool, bộ Solver sẽ **bỏ qua hành động tách chữ** này (vì yếu tố ngẫu nhiên sẽ không thể giả lập chính xác). Solver chỉ cần mô phỏng đếm lùi bộ đếm, kích hoạt event Nổ và reset lại bộ đếm vòng tiếp theo.

---

## 19. Float Bubble

**Trường áp dụng:** `floatBubbles` (Mảng)
Cấu trúc đề xuất:

```json
"floatBubbles": [
  {
    "word": "Float",
    "mergesToFloat": 3
  }
]
```

- `mergesToFloat`: Số lần ghép đúng (Merge) trên toàn bàn chơi.

**Luật chơi:**

- Nếu trải qua `mergesToFloat` lần ghép đúng trên màn chơi mà quả bóng này **không bị merge**, nó sẽ bị đẩy xuống dưới cùng của Drop Queue. Có thể thay đổi thuật toán giải của level.
- **Visual:** Kéo quả bóng bay ngược lên trên.

---

## 20. Teleport Bubble

**Trường áp dụng:** `teleportBubbles` (Mảng)
Cấu trúc đề xuất:

```json
"teleportBubbles": [
  {
    "word": "Teleport",
    "mergesToTeleport": 4
  }
]
```

- `mergesToTeleport`: Số lần ghép đúng (Merge) toàn bàn chơi để kích hoạt dịch chuyển.

**Luật chơi:**

- Sau `mergesToTeleport` lần merge trên bàn chơi, bóng sẽ tự động đổi vị trí với một quả bóng khác trên bản đồ.
- Việc dịch chuyển này không làm thay đổi thuật toán giải của level (chỉ đổi vị trí hiển thị vật lý).

---

## 21. Stack Pipe

**Trường áp dụng:** `stackPipes` (Mảng)
Cấu trúc đề xuất:

```json
"stackPipes": [
  {
    "pipeId": 0,
    "words": ["TopWord", "MiddleWord", "BottomWord"]
  }
]
```

- `words`: Danh sách các từ nằm trong ống, theo thứ tự từ miệng ống (trên cùng) xuống đáy.

**Luật chơi:**

- Trên map có một cấu trúc ống (pipe) giữ từ 3-4 bóng tạo thành một cấu trúc ngăn xếp (stack).
- **Chỉ có bóng ở đầu stack** mới có thể được kéo ra để merge với bóng khác, hoặc cho phép bóng khác kéo vào để merge.
- Hành động kéo ra/merge này sẽ đẩy quả bóng đó ra ngoài stack, để lộ quả bóng tiếp theo lên đầu ống.

---

## 22. Resize Bubble

**Trường áp dụng:** `resizeBubbles` (Mảng)
Cấu trúc đề xuất:

```json
"resizeBubbles": ["Resize"]
```

**Luật chơi:**

- Bóng sẽ to dần tới kích thước của bóng weight `maxWeight` (ví dụ: weight 3), trong lúc đó tương tác vật lý đẩy nhau diễn ra bình thường.
- Không ảnh hưởng tới thuật toán logic (từ bên trong không đổi).
- Khi merge thành công vào một bóng khác, bóng sẽ trở về trạng thái/kích thước bình thường và không to dần nữa.
