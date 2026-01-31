# Calendar Panel Enhancement Session Notes

## Date: January 31, 2026

---

## Completed Enhancements

### 1. Scroll to Focus Date on Panel Close (FIXED)

**Problem:** When the calendar panel collapsed, it wasn't scrolling back to show the selected/focus date.

**Solution:** Replaced the setTimeout in `handleSnapChange` with a dedicated `useEffect` that watches `currentSnapIndex`:

```tsx
// In CalendarPanel.tsx
useEffect(() => {
  if (currentSnapIndex === 0 && dates.length > 0) {
    const timer = setTimeout(() => {
      scrollToFocusDate(false);
    }, 300);
    return () => clearTimeout(timer);
  }
}, [currentSnapIndex, dates.length, scrollToFocusDate]);
```

And simplified `handleSnapChange`:
```tsx
const handleSnapChange = useCallback(
  (index: number) => {
    snapIndexRef.current = index;
    setCurrentSnapIndex(index);
  },
  []
);
```

**Status:** Working correctly.

---

## In-Progress Enhancement: Sticky Month Labels

### Goal
Implement iOS-style sticky section headers (inverted - sticky at bottom) for month labels:

1. **Continuous timeline line** on the left side of the calendar
2. **Month labels scroll with content** - positioned at the last date of each month
3. **Labels become "sticky"** at the bottom when their row scrolls past
4. **Bumping behavior** - when a new month's label approaches, it pushes the current sticky label up/out
5. **Bidirectional** - works when scrolling in both directions

### Reference Behavior (from design images)
- The left side has a continuous vertical timeline line
- Month labels (e.g., "Dec", "Jan") appear next to the LAST date of each month
- When scrolling to show newer dates, the current month's label stays pinned at the bottom
- When the next month's label row enters the visible area, it pushes the pinned label upward
- The pushed label eventually exits off the top of the visible area
- Only ONE label should be "sticky" at a time

### Current Implementation State

#### Files Modified:
- `/components/CalendarPanel.tsx`
- `/components/CalendarDateRow.tsx`

#### CalendarDateRow.tsx Changes:
- Added optional `monthLabel` prop
- Renders month label (dot + text) in the timeline column when provided
- Timeline line extended to 56px (row + margin) for continuous appearance

```tsx
interface CalendarDateRowProps {
  entry: CalendarDateEntry;
  onPress: () => void;
  monthLabel?: string; // Show month label on this row (last day of month)
}
```

#### CalendarPanel.tsx Changes:

1. **Month Boundaries Calculation:**
```tsx
const monthBoundaries = useMemo(() => {
  const boundaries: { index: number; month: string }[] = [];
  for (let i = 0; i < dates.length; i++) {
    const currentDate = dates[i].date;
    const nextDate = dates[i + 1]?.date;
    if (!nextDate || !isSameMonth(currentDate, nextDate)) {
      boundaries.push({
        index: i,
        month: format(currentDate, 'MMM'),
      });
    }
  }
  return boundaries;
}, [dates]);
```

2. **Visible Labels State:**
```tsx
const [visibleLabels, setVisibleLabels] = useState<
  Array<{
    month: string;
    rowIndex: number;
    bottomOffset: number; // position from bottom of panel
  }>
>([]);
```

3. **Labels Rendered in Overlay:**
```tsx
overlay={
  <>
    {visibleLabels.map((label) => (
      <View
        key={`label-${label.rowIndex}`}
        style={[
          styles.stickyLabelContainer,
          { bottom: label.bottomOffset },
        ]}
      >
        <View style={styles.monthDot} />
        <Text style={styles.monthLabel}>{label.month}</Text>
      </View>
    ))}
  </>
}
```

### Current Issues

1. **Multiple labels stacking:** Old month labels that should have scrolled off the top are staying visible and stacking up (Nov, Dec, Jan all showing simultaneously).

2. **Coordinate system confusion:** The position calculations for `bottomOffset` may not be correctly mapping content scroll coordinates to overlay positioning.

3. **Unclear which label should be "sticky":** The logic for determining which single label should be pinned vs naturally visible needs refinement.

### Key Calculations That Need Verification

```tsx
// Natural position calculation
const rowCenterY = boundary.index * ROW_HEIGHT + ROW_HEIGHT / 2;
const distFromVisibleBottom = (offsetY + visibleHeight) - rowCenterY;
const naturalBottomOffset = stickyPosition + (distFromVisibleBottom - ROW_HEIGHT / 2);
```

**Questions to resolve:**
- What does `offsetY` represent in the TopSheetScrollView? (scroll offset from top?)
- How does `bottomOffset` in the overlay translate to actual screen position?
- Is the coordinate system inverted for the top sheet?

### Attempted Approaches

1. **Single sticky label + inline labels:** Tracked one sticky label separately, hid inline when sticky. Issue: duplicates appeared.

2. **All labels in overlay with natural positions:** Calculated all visible label positions from scroll. Issue: multiple labels stacking.

3. **Sticky + visible separation:** Find ONE sticky label and separately track visible ones. Issue: still seeing multiple labels.

### Latest Approach (End of Session)

**Key Insight from User:** The month label is tied to the entire DATE BLOCK, not just one row. Think of it like flexbox alignment:
- **Active month** (dates spanning bottom of panel): label is at BOTTOM of block (pinned)
- **Month scrolled past**: label at TOP of block, scrolls out with its dates
- **Month entering from below**: label at BOTTOM of block (enters first)

**New Data Structure - Month Blocks:**
```tsx
const monthBlocks = useMemo(() => {
  const blocks: { startIndex: number; endIndex: number; month: string }[] = [];
  // ... calculates start/end index for each month's date range
}, [dates]);
```

**New Logic:**
1. For each block, calculate if it's visible (any part in visible area)
2. If block spans the bottom edge → it's "active", pin label at bottom
3. If block is above the active one → label at natural position (bottom of block in content coords)
4. Handle bumping between adjacent labels
5. Filter out labels pushed off screen

### Next Steps to Try

1. **Debug the coordinate system:**
   - Add console.logs to trace `offsetY`, `visibleHeight`, `labelBottomOffset` values
   - Verify what position values actually place labels where on screen
   - Key question: does `bottom: X` in the overlay mean X pixels from panel bottom?

2. **Verify block detection:**
   - Log which blocks are being detected as "active" (spanning bottom)
   - Ensure only ONE block can be active at a time

3. **Check TopSheetScrollView implementation:**
   - Understand how its overlay positioning works
   - The overlay is a sibling to the scroll content, so `bottom` should be from panel bottom

4. **Alternative approach - use Animated values:**
   - Instead of state updates, use Animated.Value tied to scroll
   - May give smoother results and easier position debugging

5. **Simplify further:**
   - Start with just showing the active month's label pinned
   - Then add the "above" months with natural positions
   - Then add bumping logic

### Constants Used
```tsx
const ROW_HEIGHT = 56;
const HANDLE_HEIGHT = 36;
const stickyPosition = HANDLE_HEIGHT + 14; // Where sticky label sits
```

---

## Code Snapshots

### Latest handleScroll function (month blocks approach):
```tsx
const handleScroll = useCallback(
  (offsetY: number) => {
    scrollOffsetRef.current = offsetY;

    const topRowIndex = Math.floor(offsetY / ROW_HEIGHT);
    checkLazyLoadTrigger(topRowIndex);

    const blocks = monthBlocksRef.current;
    if (blocks.length === 0) {
      setVisibleLabels([]);
      return;
    }

    const visibleHeight = snapPoints[snapIndexRef.current] - SAFE_AREA_TOP - HANDLE_HEIGHT;

    // The bottom edge of visible content in content coordinates
    const visibleBottomY = offsetY + visibleHeight;
    // The top edge of visible content
    const visibleTopY = offsetY;

    // The "pinned" position for the active month's label (from panel bottom edge)
    const pinnedBottomOffset = HANDLE_HEIGHT + 14;

    const labels: Array<{
      month: string;
      bottomOffset: number;
    }> = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Block's position in content coordinates
      const blockTopY = block.startIndex * ROW_HEIGHT;
      const blockBottomY = (block.endIndex + 1) * ROW_HEIGHT;

      // Check if this block is visible or relevant
      const blockIsAboveVisible = blockBottomY < visibleTopY;
      const blockIsBelowVisible = blockTopY > visibleBottomY;

      if (blockIsAboveVisible || blockIsBelowVisible) {
        continue; // Block is completely off screen
      }

      // Label is at the BOTTOM of its block
      const labelContentY = blockBottomY;

      // Convert to screen position
      const distFromVisibleBottom = visibleBottomY - labelContentY;
      let labelBottomOffset = pinnedBottomOffset + distFromVisibleBottom;

      // Check if this block spans the bottom edge (active month)
      const blockSpansBottom = blockTopY <= visibleBottomY && blockBottomY >= visibleBottomY;

      if (blockSpansBottom) {
        // Active month - pin at bottom
        labelBottomOffset = pinnedBottomOffset;
      } else if (labelBottomOffset < pinnedBottomOffset) {
        // Block entering from below, not fully in view yet
        continue;
      }

      const maxBottomOffset = HANDLE_HEIGHT + visibleHeight;
      if (labelBottomOffset > maxBottomOffset) {
        continue; // Off the top
      }

      labels.push({
        month: block.month,
        bottomOffset: labelBottomOffset,
      });
    }

    // Handle bumping
    labels.sort((a, b) => a.bottomOffset - b.bottomOffset);
    for (let i = 1; i < labels.length; i++) {
      const gap = labels[i].bottomOffset - labels[i - 1].bottomOffset;
      if (gap < ROW_HEIGHT) {
        labels[i].bottomOffset = labels[i - 1].bottomOffset + ROW_HEIGHT;
      }
    }

    // Filter off-screen
    const maxBottomOffset = HANDLE_HEIGHT + visibleHeight;
    setVisibleLabels(labels.filter((l) => l.bottomOffset <= maxBottomOffset));
  },
  [snapPoints, SAFE_AREA_TOP, checkLazyLoadTrigger]
);
```

---

## Related Files
- `/components/CalendarPanel.tsx` - Main calendar panel component
- `/components/CalendarDateRow.tsx` - Individual date row component
- `/components/TopSheetScrollView.tsx` - The scroll view wrapper (may need inspection)
- `/hooks/useCalendarDates.ts` - Date data hook

---

## Session Summary
- Fixed: Scroll to focus date on panel close
- In Progress: Sticky month labels with bumping behavior
- Main challenge: Coordinate system mapping between scroll content and overlay positioning

---

## Session 2 - January 31, 2026 (Continued)

### Problem Identified
The complex scroll-based position calculations were:
1. Causing multiple labels to stack incorrectly
2. Creating gaps where labels took up their own rows instead of appearing beside cards
3. Resulting in delayed month transitions

### Solution: Simplified "Fake Sticky" Approach

Instead of calculating label positions on every scroll frame, we switched to a simpler architecture:

#### How It Works
1. **Inline labels** at TOP and BOTTOM of each month group - scroll naturally with content
2. **One fixed overlay label** - always pinned at bottom, shows current month
3. **No scroll-based positioning logic** - labels are part of the row structure

When you scroll:
- Inline top/bottom labels enter and exit naturally
- Fixed label always shows the "active" month (based on bottom-most visible row)
- When inline label is at same position as fixed one, they overlap (same content = invisible)

#### Implementation

**CalendarPanel.tsx Changes:**
```tsx
// Simple state instead of complex visibleLabels
const [activeMonth, setActiveMonth] = useState<string>('');
const activeMonthRef = useRef<string>('');

// Simplified handleScroll - just track active month
const handleScroll = useCallback((offsetY: number) => {
  scrollOffsetRef.current = offsetY;
  const topRowIndex = Math.floor(offsetY / ROW_HEIGHT);
  checkLazyLoadTrigger(topRowIndex);

  // Determine active month from bottom-most visible row
  const visibleHeight = snapPoints[snapIndexRef.current] - SAFE_AREA_TOP - HANDLE_HEIGHT;
  const bottomRowIndex = Math.floor((offsetY + visibleHeight) / ROW_HEIGHT);

  for (const block of monthBlocks) {
    if (bottomRowIndex >= block.startIndex && bottomRowIndex <= block.endIndex) {
      if (activeMonthRef.current !== block.month) {
        activeMonthRef.current = block.month;
        setActiveMonth(block.month);
      }
      break;
    }
  }
}, [snapPoints, SAFE_AREA_TOP, checkLazyLoadTrigger, monthBlocks]);

// Render structure
overlay={
  <View style={styles.fixedLabelContainer}>
    <View style={styles.monthDot} />
    <Text style={styles.monthLabel}>{activeMonth}</Text>
  </View>
}

// Content - iterate by month blocks
{monthBlocks.map((block, blockIdx) => (
  <React.Fragment key={`block-${block.month}-${blockIdx}`}>
    {dates.slice(block.startIndex, block.endIndex + 1).map((entry, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === block.endIndex - block.startIndex;
      return (
        <CalendarDateRow
          key={`date-${block.startIndex + idx}`}
          entry={entry}
          onPress={() => handleDatePress(entry.date, entry.workout)}
          topLabel={isFirst ? block.month : undefined}
          bottomLabel={isLast ? block.month : undefined}
        />
      );
    })}
  </React.Fragment>
))}
```

**CalendarDateRow.tsx Changes:**
```tsx
interface CalendarDateRowProps {
  entry: CalendarDateEntry;
  onPress: () => void;
  topLabel?: string;    // First day of month
  bottomLabel?: string; // Last day of month
}

// Labels render in timeline column, vertically centered
{(topLabel || bottomLabel) && (
  <View style={styles.monthLabelContainer}>
    <View style={styles.monthDot} />
    <Text style={styles.monthLabel}>{topLabel || bottomLabel}</Text>
  </View>
)}

// Style for vertical centering
monthLabelContainer: {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  flexDirection: 'row',
  alignItems: 'center',
},
```

### Current Status
- Labels now appear beside cards (no gaps)
- Fixed overlay shows active month
- Month transitions are faster with ref comparison

### Remaining Refinements
1. **Test with real data** - verify transitions look smooth
2. **Consider showing only bottom labels** - if top+bottom looks redundant
3. **Verify fixed label position** - ensure it aligns correctly with inline labels when they overlap

### Files Modified
- `/components/CalendarPanel.tsx` - Simplified state and rendering
- `/components/CalendarDateRow.tsx` - Added topLabel/bottomLabel props with vertical centering
