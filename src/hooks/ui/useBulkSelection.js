import { useState } from 'react';

export function useBulkSelection(filteredItems) {
  const [selected, setSelected] = useState(new Set());
  const allChecked = filteredItems.length > 0 && selected.size === filteredItems.length;
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filteredItems.map(item => item.id)));
  };
  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const clearSelection = () => setSelected(new Set());
  return { selected, allChecked, toggleAll, toggleOne, clearSelection };
}
