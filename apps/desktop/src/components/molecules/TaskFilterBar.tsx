import type { TaskFilter } from '../../lib/view/task-helpers.ts';

const FILTERS: readonly (readonly [TaskFilter, string])[] = [
  ['all', 'すべて'],
  ['active', '進行中'],
  ['finished', '終了'],
];

export function TaskFilterBar({
  filter,
  onChange,
}: {
  filter: TaskFilter;
  onChange: (filter: TaskFilter) => void;
}) {
  return (
    <div className="filter" role="group" aria-label="仕事の絞り込み">
      {FILTERS.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={filter === value}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
