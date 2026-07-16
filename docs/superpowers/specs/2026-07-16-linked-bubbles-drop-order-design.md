# Design: Linked Bubbles Drop Order and Constraints

## 1. Goal
Define the behavior of the "Linked Bubbles" mechanic concerning the spawn queue (drop order) and the `Max Bubbles in Scene` limit. 

## 2. Requirements
- **Drop Order:** A Main Word and its Linked Chunks must fall onto the board at the exact same time.
- **Queue Representation:** In the Sidebar Spawn Queue UI, a Main Word and its Chunks should be automatically grouped together and act as a contiguous block. 
- **Board Limits:** When dropping onto the board, the entire linked group (Main Word + N Chunks) must consume exactly **1 unit** against the `Max Bubbles in Scene` limit to prevent board overflow.

## 3. Architecture & Data Flow

### 3.1. Sidebar Queue Auto-Sorting (GraphEditor.tsx)
The Spawn Queue is maintained as an array of bubble IDs (`spawnQueueIds`). To ensure the Main Word and its Chunks fall simultaneously and group visually:
- When a user configures Linked Bubbles in the `LevelSettings` panel, an effect (or callback) in `GraphEditor` will detect the new configuration.
- The `spawnQueueIds` array will be mutated to reposition all Linked Chunks immediately *after* their respective Main Word.
- **Drag & Drop constraint (Future/Optional):** If the user drags a Main Word in the sidebar, its chunks should ideally move with it (or the auto-sort re-runs immediately to glue them back together).

### 3.2. Simulator Board Capacity (solutionCalculator.ts)
The simulator calculates if the board has room for new bubbles using `doDrops()`.
- **Current Behavior:** `doDrops(count)` pops `count` IDs from the queue. It stops early if `board.length >= maxBubbles`.
- **Proposed Behavior:** 
  - `doDrops()` will group incoming bubbles. If it encounters a Linked Main word, it automatically pulls the associated Linked Chunks from the queue at the same time.
  - The board capacity check (`board.length >= maxBubbles`) will treat the entire grouped block as taking `+1` slot conceptually (or it will allow the drop as long as the Main Word fits).
  - *Self-Review Fix:* Actually, since the chunks will physically take up space on the 2D Unity board, treating them as `+1` in the simulator but `+3` physically might cause a discrepancy. However, the user explicitly requested they count as 1 bubble against the `Max Bubbles in Scene` limit to ensure they drop together without being interrupted by a strict cap mid-drop. Thus, `doDrops` must count the entire group as 1 capacity unit.

## 4. Edge Cases & Error Handling
- **Chunk already dropped:** If a chunk was somehow dropped independently (e.g., misconfiguration), the auto-sort should forcibly repair the queue order.
- **Deadlock mitigation:** Since the Main Word and Chunks drop together, the board immediately receives all required pieces to resolve the link, removing the risk of the Main Word blocking the board while waiting for chunks.

## 5. Implementation Scope
- `LevelSettings.tsx` & `GraphEditor.tsx`: Add logic to trigger `spawnQueueIds` resorting when `linkedBubbles` changes. Add a listener to re-sort if the sidebar queue is manually reordered.
- `solutionCalculator.ts`: Modify `doDrops()` to calculate the drop cost of a Linked Group as 1.
