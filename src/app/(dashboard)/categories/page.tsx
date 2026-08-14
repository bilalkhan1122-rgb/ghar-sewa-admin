'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiErrorMessage,
  categoriesApi,
  type ServiceCategory,
} from '@/lib/api';
import { Badge, Button, Card, Empty, ErrorNote, Field, FilterBar, inputClass, PageBody, PageHeader, selectClass, Table } from '@/components/ui';
import { useToast } from '@/components/toast';

type Filter = 'all' | 'active' | 'hidden';

const emptyDraft = { name: '', icon: '', description: '' };

export default function CategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  // `error` is only for a page that would not load; action outcomes toast.
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ServiceCategory | null>(null);

  const load = useCallback(() => {
    categoriesApi
      .list({ limit: 100, search: search || undefined })
      .then((res) => setCategories(res.data))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load categories.')))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = categories.filter((category) =>
    filter === 'all' ? true : filter === 'active' ? category.isActive : !category.isActive,
  );

  const create = async () => {
    const name = draft.name.trim();
    if (name.length < 2) {
      toast.error('Enter a category name.');
      return;
    }
    setCreating(true);
    try {
      await categoriesApi.create({
        name,
        icon: draft.icon.trim() || undefined,
        description: draft.description.trim() || undefined,
        // Append to the end; ordering is adjusted with the arrows below.
        displayOrder: categories.length + 1,
      });
      setDraft(emptyDraft);
      toast.success('Category created.');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create the category.'));
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      await categoriesApi.update(editing.id, {
        name: editing.name.trim(),
        icon: editing.icon?.trim() || undefined,
        description: editing.description?.trim() || undefined,
      });
      setEditing(null);
      toast.success('Category saved.');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the category.'));
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (category: ServiceCategory) => {
    setBusyId(category.id);
    try {
      await categoriesApi.toggleStatus(category.id);
      toast.success(category.isActive ? 'Category hidden.' : 'Category shown.');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not change visibility.'));
    } finally {
      setBusyId(null);
    }
  };

  /** Swaps a category with its neighbour and persists the whole order. */
  const move = async (index: number, direction: -1 | 1) => {
    const ordered = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

    setCategories(ordered.map((c, i) => ({ ...c, displayOrder: i + 1 })));
    try {
      await categoriesApi.reorder(ordered.map((c) => c.id));
      toast.success('New order saved.');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the new order.'));
      load();
    }
  };

  const ordered = [...visible].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Services customers can pick from. The app reads these live — no release needed."
        actions={<span className="text-sm text-fg-muted">{categories.length} total</span>}
      />

      <PageBody>
      <ErrorNote message={error} />

      <Card>
        <div className="grid gap-3 sm:grid-cols-[7rem_1fr_auto] sm:items-end">
          <Field label="Icon">
            <input
              value={draft.icon}
              onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
              placeholder="🔧"
              className={inputClass}
            />
          </Field>
          <Field label="New category">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Carpenter"
              onKeyDown={(e) => e.key === 'Enter' && create()}
              className={inputClass}
            />
          </Field>
          <Button onClick={create} disabled={creating}>
            {creating ? 'Adding…' : 'Add category'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-fg-subtle">
          The slug is generated from the name. New categories appear at the end of the list.
        </p>
      </Card>

      <FilterBar>
        <Field label="Search">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name"
            className={inputClass}
          />
        </Field>
        <Field label="Visibility">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className={selectClass}>
            <option value="all">All</option>
            <option value="active">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </Field>
      </FilterBar>

      {loading && <p className="text-sm text-fg-subtle">Loading…</p>}
      {!loading && ordered.length === 0 && <Empty message="No categories match." />}

      {ordered.length > 0 && (
        <Table head={['Order', 'Category', 'Slug', 'Status', 'Actions']}>
          {ordered.map((category, index) => (
            <tr key={category.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || filter !== 'all'}
                    title={filter !== 'all' ? 'Switch to All to reorder' : 'Move up'}
                    className="rounded px-1.5 py-0.5 text-fg-muted transition hover:bg-surface-muted disabled:opacity-30">
                    ↑
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === ordered.length - 1 || filter !== 'all'}
                    title={filter !== 'all' ? 'Switch to All to reorder' : 'Move down'}
                    className="rounded px-1.5 py-0.5 text-fg-muted transition hover:bg-surface-muted disabled:opacity-30">
                    ↓
                  </button>
                  <span className="ml-1 text-xs tabular-nums text-fg-subtle">
                    {category.displayOrder}
                  </span>
                </div>
              </td>

              <td className="px-4 py-3">
                {editing?.id === category.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editing.icon ?? ''}
                      onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                      className={`w-16 ${inputClass}`}
                    />
                    <input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{category.icon ?? '🛠️'}</span>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      {category.description && (
                        <p className="text-xs text-fg-subtle">{category.description}</p>
                      )}
                    </div>
                  </div>
                )}
              </td>

              <td className="px-4 py-3 font-mono text-xs text-fg-subtle">{category.slug}</td>

              <td className="px-4 py-3">
                <Badge status={category.isActive ? 'ACTIVE' : 'SUSPENDED'} />
              </td>

              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {editing?.id === category.id ? (
                    <>
                      <Button onClick={saveEdit} disabled={busyId === category.id}>
                        Save
                      </Button>
                      <Button variant="secondary" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={() => setEditing(category)}>
                        Edit
                      </Button>
                      <Button
                        variant={category.isActive ? 'danger' : 'success'}
                        disabled={busyId === category.id}
                        onClick={() => toggle(category)}>
                        {category.isActive ? 'Hide' : 'Show'}
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <p className="text-xs text-fg-subtle">
        Hiding a category removes it from the app everywhere — home, search, posting a job and
        provider sign-up — while leaving existing jobs that used it untouched. Prefer it to
        deleting.
      </p>
      </PageBody>
    </>
  );
}
