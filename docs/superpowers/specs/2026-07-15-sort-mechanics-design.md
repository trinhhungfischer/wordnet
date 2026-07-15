# Sort Mechanics Setting

## Goal
The goal is to sort the mechanic settings in `LevelSettings.tsx` so that active mechanics (those with existing data or toggle set to on) are displayed at the top of the mechanics list, while inactive mechanics are displayed below them. This improves the UI by prioritizing relevant information.

## Approach
- Modify `src/components/LevelSettings.tsx`.
- Keep the UI rendering logic in the same file.
- Extract the rendering logic of each mechanic into a configuration object array containing:
  - `id`: Unique identifier (e.g., 'chain', 'frozen', etc.)
  - `isActive(levelData, forceOpen)`: Function evaluating to boolean to determine if a mechanic has data or is explicitly forced open by the user in the current session.
  - `render(...)`: Function returning the React JSX for the mechanic.
- Maintain a state variable `sortedMechanicIds` that stores the sorted order.
- Add a `useEffect` that runs when the `LevelSettings` popup opens (`isOpen`) or when the current level changes (`levelName`). This effect will calculate the `isActive` state of all mechanics and sort their IDs, placing active ones first.
- The sorted order is only calculated on mount/level change to prevent the UI from unexpectedly jumping when a user toggles a mechanic while actively editing.

## Technical Details
- The state hook for ordering:
```tsx
const [sortedMechanicIds, setSortedMechanicIds] = useState<string[]>([]);

useEffect(() => {
  if (isOpen && levelData) {
    const sorted = [...mechanicsConfig].sort((a, b) => {
      const aActive = a.isActive(levelData, forceOpen) ? 1 : 0;
      const bActive = b.isActive(levelData, forceOpen) ? 1 : 0;
      return bActive - aActive; // 1 goes first
    });
    setSortedMechanicIds(sorted.map(m => m.id));
  }
}, [isOpen, levelName]); // intentionally excluding levelData/forceOpen to avoid jumping
```
- We will iterate over `sortedMechanicIds` to render the components in the calculated order.

## Testing
- Verify that opening a level with existing mechanics shows them at the top.
- Verify that toggling a mechanic doesn't instantly move it, keeping the UI stable during interaction.
- Verify that closing and reopening the modal updates the sorting.
