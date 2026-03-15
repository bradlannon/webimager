# Phase 09: Worker Lifecycle & Dead Code Cleanup - Research

**Researched:** 2026-03-14
**Domain:** React component lifecycle, Web Worker persistence, dead code removal
**Confidence:** HIGH

## Summary

This phase addresses one integration bug and three dead code items identified in the v2.0 milestone audit. The integration bug is well-understood: BottomBar.tsx conditionally renders PanelContent based on activeTab, which means switching away from the Background tab unmounts BackgroundControls, triggering the useEffect cleanup in useBackgroundRemoval that terminates the Web Worker mid-download or mid-inference.

The fix pattern is straightforward: lift the useBackgroundRemoval hook out of BackgroundControls (which gets unmounted) into a persistent parent. The hook's state and worker ref must survive tab switches. The dead code items (CropToolbar.tsx, PrivacyBadge.tsx, toggleBackground store action) are confirmed orphaned through grep analysis.

**Primary recommendation:** Lift useBackgroundRemoval hook into BottomBar (which never unmounts) and pass its return values down to BackgroundControls via props. Remove three dead code items and their associated test references.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BGREM-02 | User sees a progress bar during model download on first use (~45MB) | Progress bar survives tab switches when hook is lifted to persistent parent |
| BGREM-03 | User sees a progress/loading indicator during background removal inference | Inference indicator survives tab switches when hook is lifted to persistent parent |
</phase_requirements>

## Architecture Patterns

### The Problem: Component Unmount Kills Worker

```
BottomBar (persistent, never unmounts)
  -> OverlayPanel
    -> {activeTab && <PanelContent tabId={activeTab} />}    // LINE 143
      -> BackgroundControls                                   // UNMOUNTS on tab switch
        -> useBackgroundRemoval()                             // useEffect cleanup terminates worker
```

When user clicks Background tab, starts model download, then clicks any other tab:
1. `activeTab` changes from `'background'` to something else
2. `PanelContent` renders a different component (or null if closing)
3. `BackgroundControls` unmounts
4. `useBackgroundRemoval`'s cleanup effect runs: `workerRef.current?.terminate()`
5. Worker dies, download/inference silently aborts
6. No error shown to user -- state is lost entirely

### Fix Pattern: Lift Hook to Persistent Parent

**Option A (Recommended): Lift to BottomBar, pass as props**

BottomBar never unmounts (it's rendered directly in Editor). Move useBackgroundRemoval() into BottomBar and pass the returned object to BackgroundControls via props.

```typescript
// BottomBar.tsx
export function BottomBar() {
  const bgRemoval = useBackgroundRemoval();
  // ...
  // Pass to PanelContent which forwards to BackgroundControls
}

// BackgroundControls.tsx - change from hook consumer to props consumer
interface BackgroundControlsProps {
  bgRemoval: ReturnType<typeof useBackgroundRemoval>;
}
export function BackgroundControls({ bgRemoval }: BackgroundControlsProps) {
  const { status, downloadProgress, error, requestRemoval, confirmDownload, cancel, restoreBackground } = bgRemoval;
  // ... rest unchanged
}
```

This is the simplest change. BottomBar already imports BackgroundControls indirectly through PanelContent. The prop drilling is exactly one level deep (BottomBar -> PanelContent -> BackgroundControls), which is acceptable.

**Why NOT React Context:** Context would be overkill for a single consumer. Only BackgroundControls needs this data. Adding a provider/consumer pair adds complexity without benefit.

**Why NOT a global store approach:** The hook manages a Web Worker ref and local UI state (status, progress). Moving worker lifecycle into Zustand would conflate store concerns. The hook pattern is correct; it just needs a persistent host.

### PanelContent Prop Threading

PanelContent is an internal function component in BottomBar.tsx. It receives tabId and renders the appropriate panel. It needs to accept and forward the bgRemoval prop:

```typescript
function PanelContent({ tabId, bgRemoval }: { tabId: TabId; bgRemoval: BgRemovalReturn }) {
  switch (tabId) {
    case 'background':
      return <BackgroundControls bgRemoval={bgRemoval} />;
    // ... other cases unchanged
  }
}
```

### Worker Lifecycle After Fix

After lifting the hook:
- Worker is created on first `confirmDownload()` call
- Worker persists across tab switches (BottomBar never unmounts)
- Worker terminates only when BottomBar unmounts (page navigation away from editor) or explicit cancel
- `modelCached` state persists, so returning to Background tab after download shows instant inference option

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Worker persistence across tab switches | Custom context/provider system | Lift hook to persistent parent component | Single consumer, one level of prop drilling is simpler |
| Dead code detection | Manual grep analysis | Already done in audit -- trust the findings | Audit verified with grep; just delete |

## Common Pitfalls

### Pitfall 1: Forgetting to Update BackgroundControls Import of useBackgroundRemoval
**What goes wrong:** BackgroundControls still imports and calls useBackgroundRemoval directly, creating a second worker instance
**Why it happens:** Easy to add the prop but forget to remove the old hook call
**How to avoid:** Remove the useBackgroundRemoval import entirely from BackgroundControls.tsx. The hook should only be called in BottomBar.tsx.

### Pitfall 2: Breaking the Cancel Flow
**What goes wrong:** cancel() in useBackgroundRemoval terminates the worker when status is 'downloading'. After lifting, this still works correctly since the workerRef lives in BottomBar's render lifecycle.
**How to avoid:** Verify cancel works in both downloading and inferring states after the change.

### Pitfall 3: Test Files Referencing Dead Code
**What goes wrong:** Deleting PrivacyBadge.tsx without updating components.test.tsx breaks the test suite
**Why it happens:** Tests import the component directly
**How to avoid:** Delete the PrivacyBadge test block in components.test.tsx. Delete the toggleBackground test in editorStore.test.ts. Update backgroundRemoval.test.ts test name that mentions toggleBackground (just the description string, the actual test logic already tests clearBackgroundMask).

### Pitfall 4: TypeScript Interface Not Updated
**What goes wrong:** Removing toggleBackground from the store implementation but not the EditorStore interface causes TS error
**How to avoid:** Remove from interface (line 50), implementation (line 165), and type definition.

## Dead Code Inventory

### 1. CropToolbar.tsx -- FULLY ORPHANED
- **File:** `src/components/CropToolbar.tsx` (105 lines)
- **Evidence:** grep for "CropToolbar" returns only the file itself -- zero importers
- **History:** Superseded by CropPanel inline in BottomBar.tsx during Phase 6 sidebar redesign
- **Action:** Delete file entirely

### 2. PrivacyBadge.tsx -- TEST-ONLY
- **File:** `src/components/PrivacyBadge.tsx` (10 lines)
- **Evidence:** grep returns only `src/__tests__/components.test.tsx` and the file itself
- **History:** Was in the old sidebar, removed during redesign but file left behind
- **Action:** Delete file and remove test block (lines 31-38 in components.test.tsx)

### 3. toggleBackground Store Action -- NO CALLERS
- **File:** `src/store/editorStore.ts` -- interface line 50, implementation line 165
- **Evidence:** grep shows only the definition, plus tests in editorStore.test.ts and a test name string in backgroundRemoval.test.ts
- **History:** Was used by old restoreBackground; Phase 8 switched to clearBackgroundMask
- **Action:** Remove from interface + implementation. Remove/update test references.

## Code Examples

### Lifting useBackgroundRemoval to BottomBar

```typescript
// In BottomBar.tsx - add import type
import type { useBackgroundRemoval } from '../hooks/useBackgroundRemoval';

// Type for the return value
type BgRemovalState = ReturnType<typeof useBackgroundRemoval>;

// BottomBar component - call hook at top level
export function BottomBar() {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const bgRemoval = useBackgroundRemoval();  // <-- LIFTED HERE
  // ... rest of state

  return (
    <>
      <OverlayPanel open={activeTab !== null} onClose={handleClosePanel} disableBackdrop={activeTab === 'crop'}>
        {activeTab && <PanelContent tabId={activeTab} bgRemoval={bgRemoval} />}
      </OverlayPanel>
      {/* ... tab bar unchanged */}
    </>
  );
}
```

### BackgroundControls Refactored to Props

```typescript
// BackgroundControls.tsx
import type { useBackgroundRemoval } from '../hooks/useBackgroundRemoval';

type BgRemovalState = ReturnType<typeof useBackgroundRemoval>;

export function BackgroundControls({ bgRemoval }: { bgRemoval: BgRemovalState }) {
  const { status, downloadProgress, error, requestRemoval, confirmDownload, cancel, restoreBackground } = bgRemoval;
  // Remove: import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval';
  // Remove: const { ... } = useBackgroundRemoval();
  // ... rest of component body identical
}
```

### Removing toggleBackground from Store

```typescript
// editorStore.ts - Remove from interface:
// DELETE: toggleBackground: () => void;

// Remove from implementation:
// DELETE: toggleBackground: () => set((s) => ({ backgroundRemoved: !s.backgroundRemoved })),
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via vitest run) |
| Config file | vitest config in vite.config.ts or vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BGREM-02 | Progress bar survives tab switch (hook persists in BottomBar) | unit | `npx vitest run src/__tests__/components.test.tsx -t "background"` | Needs new test in Wave 0 |
| BGREM-03 | Inference indicator survives tab switch | unit | `npx vitest run src/__tests__/components.test.tsx -t "background"` | Needs new test in Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Test: switching tabs while background removal is active does NOT reset status (verifies hook persistence)
- [ ] Update: remove PrivacyBadge test block from components.test.tsx
- [ ] Update: remove toggleBackground test from editorStore.test.ts
- [ ] Update: backgroundRemoval.test.ts test description mentioning toggleBackground

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hook in BackgroundControls (unmounts) | Hook in BottomBar (persists) | Phase 9 | Worker survives tab switches |
| toggleBackground (toggle bool) | clearBackgroundMask (full reset) | Phase 8 | toggleBackground now dead code |

## Open Questions

None. The problem, fix pattern, and dead code inventory are all well-defined by the audit and confirmed by code analysis.

## Sources

### Primary (HIGH confidence)
- Direct code analysis of BottomBar.tsx, useBackgroundRemoval.ts, BackgroundControls.tsx, editorStore.ts
- v2.0 Milestone Audit (`.planning/v2.0-MILESTONE-AUDIT.md`)
- Grep verification of dead code (CropToolbar, PrivacyBadge, toggleBackground)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, only restructuring existing code
- Architecture: HIGH - single well-understood React pattern (lift hook to persistent parent)
- Pitfalls: HIGH - all edge cases identified from direct code reading
- Dead code: HIGH - grep-verified, no ambiguity

**Research date:** 2026-03-14
**Valid until:** Indefinite (codebase-specific, not library-dependent)
