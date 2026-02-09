import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Permission } from '@/services/superadmin/superadminApi';

type Props = {
  permissions: Permission[];
  initialSelectedIds: number[];
  onSave: (permissionIds: number[]) => Promise<void>;
  onClose: () => void;
};

function uniqSorted(ids: number[]) {
  return Array.from(new Set(ids)).sort((a, b) => a - b);
}

export function PermissionMatrix({ permissions, initialSelectedIds, onSave, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number[]>(() => uniqSorted(initialSelectedIds));

  useEffect(() => {
    setSelected(uniqSorted(initialSelectedIds));
  }, [initialSelectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter((p) => {
      const hay = `${p.module} ${p.action} ${p.name} ${p.codename}`.toLowerCase();
      return hay.includes(q);
    });
  }, [permissions, query]);

  const byModule = useMemo(() => {
    const m = new Map<string, Permission[]>();
    for (const p of filtered) {
      const key = p.module || 'general';
      m.set(key, [...(m.get(key) ?? []), p]);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const initialKey = useMemo(() => uniqSorted(initialSelectedIds).join(','), [initialSelectedIds]);
  const currentKey = useMemo(() => uniqSorted(selected).join(','), [selected]);
  const dirty = initialKey !== currentKey;

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : uniqSorted([...prev, id])));
  };

  const moduleStats = (_module: string, perms: Permission[]) => {
    const total = perms.length;
    const sel = perms.reduce((acc, p) => acc + (selectedSet.has(p.id) ? 1 : 0), 0);
    return { total, sel, all: sel === total && total > 0, none: sel === 0 };
  };

  const toggleModule = (module: string, perms: Permission[]) => {
    const stats = moduleStats(module, perms);
    if (stats.all) {
      const removeIds = new Set(perms.map((p) => p.id));
      setSelected((prev) => prev.filter((id) => !removeIds.has(id)));
    } else {
      setSelected((prev) => uniqSorted([...prev, ...perms.map((p) => p.id)]));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(uniqSorted(selected));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Search permissions..." value={query} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} />
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Close
        </Button>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400">
        Selected: <span className="font-medium">{selected.length}</span> / {permissions.length}
        {dirty && <span className="ml-2 text-gray-900 dark:text-white">• Unsaved changes</span>}
      </div>

      {permissions.length === 0 ? (
        <div className="rounded-md border p-4 text-sm text-gray-500">No permissions available.</div>
      ) : byModule.length === 0 ? (
        <div className="rounded-md border p-4 text-sm text-gray-500">No results match your search.</div>
      ) : (
        <div className="space-y-3">
          {byModule.map(([moduleName, perms]) => {
            const stats = moduleStats(moduleName, perms);
            return (
              <div key={moduleName} className="rounded-md border">
                <div className="flex items-center justify-between p-3 border-b bg-gray-50 dark:bg-gray-800">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stats.all}
                      onChange={() => toggleModule(moduleName, perms)}
                      className="rounded"
                    />
                    <span className="capitalize">{moduleName}</span>
                    <span className="text-xs text-gray-500">
                      ({stats.sel}/{stats.total})
                    </span>
                  </label>
                </div>

                <div className="p-3 space-y-2">
                  {perms
                    .slice()
                    .sort((a, b) => (a.action + a.name).localeCompare(b.action + b.name))
                    .map((p) => (
                      <label key={p.id} className="flex items-start gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(p.id)}
                          onChange={() => toggle(p.id)}
                          className="rounded mt-0.5"
                        />
                        <span className="flex-1">
                          <span className="font-medium">{p.name}</span>
                          <span className="block text-xs text-gray-500">{p.codename}</span>
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
