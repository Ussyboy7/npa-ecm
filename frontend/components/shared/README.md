# Shared Components

Reusable UI components for consistent patterns across the ECM frontend.

## FilterPanel

A collapsible filter panel component that provides consistent filter UI across pages.

**Usage:**
```typescript
import { FilterPanel, FilterBadgeGroup } from '@/components/shared/FilterPanel';

const MyPage = () => {
  const [showFilters, setShowFilters] = useState(false);
  const activeFilters = [
    { key: 'status', label: 'Status: Active', value: 'active', onClick: () => {} },
  ];

  return (
    <FilterPanel
      title="Filters"
      activeFilterCount={activeFilters.length}
      onClearAll={() => {
        // Clear all filters
      }}
      defaultOpen={false}
    >
      {/* Filter inputs go here */}
      <Select>
        <SelectItem value="all">All Status</SelectItem>
        <SelectItem value="active">Active</SelectItem>
      </Select>
      
      {/* Display active filters */}
      <FilterBadgeGroup
        filters={activeFilters}
        onRemove={(key) => {
          // Remove filter
        }}
      />
    </FilterPanel>
  );
};
```

## Benefits

- **Consistent UI**: Same filter panel design across all pages
- **Accessibility**: Built-in ARIA labels and keyboard navigation
- **Flexible**: Can be customized with className and props
- **Active Filter Display**: Built-in badge display for active filters

