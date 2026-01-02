# Merge Minute Thread & Original Document - Layout Proposals

## Current Layout (3-Panel)

```
┌─────────────────────────────────────────────────────────────┐
│                    CorrespondenceHeader                     │
├──────────────┬──────────────────────────┬──────────────────┤
│              │                           │                  │
│  Document    │    Minute Thread          │    Actions       │
│  Preview     │                           │    Panel         │
│  (30%)       │        (40%)              │    (30%)         │
│              │                           │                  │
│  - Preview   │  - Minute cards           │  - Status        │
│  - Attach.   │  - Routing history        │  - Actions       │
│              │                           │  - Workflow      │
└──────────────┴──────────────────────────┴──────────────────┘
```

---

## Option 1: Vertical Stack (Recommended ⭐)

**Layout:** Document on top, Thread below in one panel

```
┌─────────────────────────────────────────────────────────────┐
│                    CorrespondenceHeader                     │
├──────────────────────────────────────────┬──────────────────┤
│                                          │                  │
│  Combined Panel (60-70%)                 │    Actions       │
│  ┌────────────────────────────────────┐ │    Panel         │
│  │  Original Document                  │ │    (30-40%)      │
│  │  ────────────────────────────────  │ │                  │
│  │  [Document Preview Area]            │ │  - Status        │
│  │  [Attachments List]                 │ │  - Actions       │
│  │  [Linked Documents]                 │ │  - Workflow      │
│  ├────────────────────────────────────┤ │                  │
│  │  Minute Thread                      │ │                  │
│  │  ────────────────────────────────  │ │                  │
│  │  [Minute Cards - Scrollable]        │ │                  │
│  │  [Routing History]                  │ │                  │
│  └────────────────────────────────────┘ │                  │
│                                          │                  │
└──────────────────────────────────────────┴──────────────────┘
```

**Pros:**
- ✅ More space for document preview (60-70% vs 30%)
- ✅ Better document readability
- ✅ Natural flow: Document → Thread
- ✅ Still maintains Actions panel separate
- ✅ Easier to scroll through both sections

**Cons:**
- ⚠️ Less vertical space for each section
- ⚠️ Need to scroll to see both document and thread

**Implementation:**
```tsx
<div className="flex flex-col md:flex-row md:gap-2">
  {/* Combined Panel - 60-70% */}
  <div className="w-full md:w-[60%] md:max-w-[800px] flex flex-col">
    {/* Document Section */}
    <DocumentPreviewPanel ... />
    
    {/* Thread Section */}
    <MinuteThreadPanel ... />
  </div>
  
  {/* Actions Panel - 30-40% */}
  <ActionsPanel ... />
</div>
```

---

## Option 2: Tabs in Combined Panel

**Layout:** Tabs to switch between Document and Thread

```
┌─────────────────────────────────────────────────────────────┐
│                    CorrespondenceHeader                     │
├──────────────────────────────────────────┬──────────────────┤
│  [Document] [Thread]                     │    Actions       │
│  ──────────────────────────────────────  │    Panel         │
│                                          │    (30-40%)      │
│  [Active Tab Content]                    │                  │
│  - Either Document Preview OR            │  - Status        │
│    Minute Thread                         │  - Actions       │
│                                          │  - Workflow      │
│                                          │                  │
└──────────────────────────────────────────┴──────────────────┘
```

**Pros:**
- ✅ Full space for active section
- ✅ Clean, focused view
- ✅ No scrolling needed

**Cons:**
- ⚠️ Can't see document and thread simultaneously
- ⚠️ Need to switch tabs to compare
- ⚠️ Less efficient workflow

---

## Option 3: Split View (50/50)

**Layout:** Document and Thread side-by-side in combined panel

```
┌─────────────────────────────────────────────────────────────┐
│                    CorrespondenceHeader                     │
├──────────────────────────────┬─────────────────────────────┤
│  Document (50%)              │  Thread (50%)                │
│  ──────────────────────────  │  ──────────────────────────  │
│  [Preview]                   │  [Minute Cards]             │
│  [Attachments]               │  [Routing History]          │
│                              │                              │
├──────────────────────────────┴─────────────────────────────┤
│  Actions Panel (Full Width Below)                           │
│  ─────────────────────────────────────────────────────────  │
│  [Status] [Actions] [Workflow]                              │
└─────────────────────────────────────────────────────────────┘
```

**Pros:**
- ✅ See both document and thread at once
- ✅ Good for comparison

**Cons:**
- ⚠️ Narrower columns (50% each)
- ⚠️ Actions panel below (less accessible)
- ⚠️ More vertical scrolling

---

## Option 4: Accordion/Collapsible Sections

**Layout:** Collapsible sections in one panel

```
┌─────────────────────────────────────────────────────────────┐
│                    CorrespondenceHeader                     │
├──────────────────────────────────────────┬──────────────────┤
│  ▼ Original Document                     │    Actions       │
│  ──────────────────────────────────────  │    Panel         │
│  [Document Preview]                      │    (30-40%)      │
│  [Attachments]                           │                  │
│                                          │  - Status        │
│  ▶ Minute Thread (3)                     │  - Actions       │
│                                          │  - Workflow      │
│                                          │                  │
└──────────────────────────────────────────┴──────────────────┘
```

**Pros:**
- ✅ Space efficient
- ✅ User controls what's visible
- ✅ Can expand both if needed

**Cons:**
- ⚠️ Extra clicks to view content
- ⚠️ Can't see both simultaneously by default

---

## Recommendation: Option 1 (Vertical Stack) ⭐

**Why:**
1. **Better Document Preview** - 60-70% width is much better for reading PDFs
2. **Natural Flow** - Document first, then routing history makes logical sense
3. **Maintains Actions Panel** - Still easily accessible on the right
4. **Better Mobile Experience** - Already uses tabs, works well
5. **More Space** - Each section gets more horizontal space

**Layout Details:**
- **Combined Panel:** `w-full md:w-[65%] md:max-w-[900px]`
- **Actions Panel:** `w-full md:w-[35%] md:max-w-[400px]`
- **Document Section:** Scrollable, takes ~40-50% of combined panel height
- **Thread Section:** Scrollable, takes remaining height

**Visual Structure:**
```
┌──────────────────────────────────────────┬──────────────────┐
│  Combined Panel (65%)                    │  Actions (35%)   │
│  ──────────────────────────────────────  │  ────────────────  │
│                                          │                  │
│  📄 Original Document                    │  📊 Status       │
│  ┌────────────────────────────────────┐ │  ┌──────────────┐ │
│  │  [Document Preview - Scrollable]   │ │  │ Current: MD  │ │
│  │  [Attachments List]                │ │  │ Your Turn    │ │
│  │  [Linked Documents]                │ │  └──────────────┘ │
│  └────────────────────────────────────┘ │                  │
│                                          │  🔄 Workflow     │
│  💬 Minute Thread                        │  [Progress Bar] │
│  ┌────────────────────────────────────┐ │                  │
│  │  [Minute Card 1]                  │ │  ⚡ Actions      │
│  │  [Minute Card 2]                  │ │  [Minute]        │
│  │  [Minute Card 3]                  │ │  [Treat]         │
│  │  [Scrollable...]                  │ │  [Complete]      │
│  └────────────────────────────────────┘ │                  │
│                                          │                  │
└──────────────────────────────────────────┴──────────────────┘
```

---

## Implementation Considerations

### 1. Scroll Behavior
- **Document Section:** Independent scroll
- **Thread Section:** Independent scroll
- **Or:** Single scroll for entire combined panel

### 2. Height Management
- Use `flex-1` and `min-h-0` for proper flex behavior
- Set max heights for each section
- Use `ScrollArea` components

### 3. Responsive Behavior
- **Mobile:** Keep current tab system (works well)
- **Tablet:** Could use 2-panel (Combined | Actions)
- **Desktop:** Use merged layout

### 4. User Preference
- Could add toggle to switch between merged and split views
- Save preference in localStorage

---

## Code Structure

```tsx
<div className="flex flex-col md:flex-row md:gap-2 min-h-0">
  {/* Combined Panel */}
  <div className="w-full md:w-[65%] md:max-w-[900px] flex flex-col border-r border-border">
    {/* Document Section - Takes ~45% of height */}
    <div className="flex-shrink-0 border-b border-border" style={{ height: '45%', minHeight: '300px' }}>
      <DocumentPreviewPanel ... />
    </div>
    
    {/* Thread Section - Takes remaining height */}
    <div className="flex-1 min-h-0">
      <MinuteThreadPanel ... />
    </div>
  </div>
  
  {/* Actions Panel */}
  <div className="w-full md:w-[35%] md:max-w-[400px]">
    <ActionsPanel ... />
  </div>
</div>
```

---

## Alternative: Resizable Panels

Could also implement resizable panels so users can adjust the split:
- Drag handle between Document and Thread sections
- Save user preference
- More flexible but adds complexity

