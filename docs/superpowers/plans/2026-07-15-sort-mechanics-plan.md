# Sort Mechanics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sort active mechanics to the top of the LevelSettings panel.

**Architecture:** Refactor `LevelSettings.tsx` to use a configuration array for mechanics, evaluate their active state on mount, sort them, and map over the array to render.

**Tech Stack:** React, TypeScript

## Global Constraints
None.

---

### Task 1: Refactor LevelSettings Mechanics Rendering

**Files:**
- Modify: `src/components/LevelSettings.tsx`

**Interfaces:**
- Consumes: `levelData`, `forceOpen`, `handleChange`, `setForceOpen`, `onFocusWord`
- Produces: Sorted mechanics UI

- [ ] **Step 1: Define mechanics configuration array**

Extract the rendering logic for each mechanic into an array of objects inside `LevelSettings`, before the `return` statement but inside the component function so it has access to props and local state.

```tsx
const mechanicsConfig = [
  {
    id: 'chain',
    isActive: (levelData: any, forceOpen: any) => levelData.useBubbleSeparator === 1,
    render: () => (
      // Existing JSX for Chain mechanic from lines 107-193
    )
  },
  // Add objects for frozen, burst, backward, keyLock, screwLock, cycleLock, cryptic, immovable with their corresponding isActive logic and JSX
];
```

- [ ] **Step 2: Add sorting state and effect**

Add state for the sorted order and an effect that runs when `isOpen` or `levelName` changes.

```tsx
const [sortedMechanicIds, setSortedMechanicIds] = useState<string[]>([]);

useEffect(() => {
  if (isOpen && levelData) {
    const sorted = [...mechanicsConfig].sort((a, b) => {
      const aActive = a.isActive(levelData, forceOpen) ? 1 : 0;
      const bActive = b.isActive(levelData, forceOpen) ? 1 : 0;
      return bActive - aActive; 
    });
    setSortedMechanicIds(sorted.map(m => m.id));
  }
}, [isOpen, levelName]); // Do not include levelData/forceOpen to avoid live jumping
```

- [ ] **Step 3: Update return statement to render sorted mechanics**

Replace the hardcoded mechanics JSX with a map over the `sortedMechanicIds`.

```tsx
{/* General Settings */}
// ... existing general settings JSX ...

{sortedMechanicIds.map(id => {
  const mechanic = mechanicsConfig.find(m => m.id === id);
  return mechanic ? <div key={id}>{mechanic.render()}</div> : null;
})}
```

- [ ] **Step 4: Commit changes**

```bash
git add src/components/LevelSettings.tsx
git commit -m "feat: sort active mechanics to the top of LevelSettings"
```
