import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, Star, ScanLine, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import MenuOCR from '../../components/MenuOCR';

export default function MenuUpload() {
  const { restaurantId } = useOutletContext();
  const qc = useQueryClient();
  const [showOCR, setShowOCR] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(null);
  const [expandedCat, setExpandedCat] = useState(null);
  const [catName, setCatName] = useState('');
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', is_must_try: false });
  const [selectedCategory, setSelectedCategory] = useState('');

  const { data: menu = [] } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => api.get(`/menu/${restaurantId}`).then((r) => r.data),
    enabled: !!restaurantId,
  });

  const invalidate = () => qc.invalidateQueries(['menu', restaurantId]);

  const createCatMutation = useMutation({
    mutationFn: (name) => api.post(`/menu/${restaurantId}/categories`, { name }),
    onSuccess: () => { toast.success('Category added'); invalidate(); setShowAddCategory(false); setCatName(''); },
  });

  const createItemMutation = useMutation({
    mutationFn: ({ catId, item }) => {
      const fd = new FormData();
      Object.entries(item).forEach(([k, v]) => fd.append(k, v));
      fd.append('category_id', catId);
      return api.post(`/menu/${restaurantId}/items`, fd);
    },
    onSuccess: () => { toast.success('Item added'); invalidate(); setShowAddItem(null); setNewItem({ name: '', description: '', price: '', is_must_try: false }); },
  });

  const bulkMutation = useMutation({
    mutationFn: ({ catId, items }) => api.post(`/menu/${restaurantId}/items/bulk`, { category_id: catId, items }),
    onSuccess: (_, vars) => { toast.success(`${vars.items.length} items added`); invalidate(); setShowOCR(false); },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => api.delete(`/menu/items/${id}`),
    onSuccess: () => { invalidate(); },
  });

  const toggleMustTry = useMutation({
    mutationFn: ({ id, is_must_try }) => api.patch(`/menu/items/${id}`, { is_must_try }),
    onSuccess: () => invalidate(),
  });

  const handleOCRExtracted = (items) => {
    if (!selectedCategory) return toast.error('Select a category first');
    bulkMutation.mutate({ catId: selectedCategory, items });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Menu</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowOCR(!showOCR)} className="btn-ghost text-sm flex items-center gap-2">
            <ScanLine size={14} /> OCR Scan
          </button>
          <button onClick={() => setShowAddCategory(!showAddCategory)} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={14} /> Add Category
          </button>
        </div>
      </div>

      {showAddCategory && (
        <div className="card p-4 flex gap-3 animate-fade-in">
          <input value={catName} onChange={(e) => setCatName(e.target.value)}
            className="input text-sm flex-1" placeholder="e.g. Starters, Main Course, Desserts" />
          <button onClick={() => createCatMutation.mutate(catName)} disabled={!catName} className="btn-primary text-sm">Add</button>
        </div>
      )}

      {showOCR && (
        <div className="card p-5 animate-fade-in">
          <div className="mb-4">
            <label className="text-sm text-white/60 mb-2 block">Add OCR items to category:</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="input text-sm">
              <option value="">Select Category</option>
              {menu.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <MenuOCR onExtracted={handleOCRExtracted} />
        </div>
      )}

      <div className="space-y-4">
        {menu.length === 0 ? (
          <div className="text-center py-12 text-white/40">No categories yet. Add one to get started.</div>
        ) : (
          menu.map((cat) => (
            <div key={cat.id} className="card overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{cat.name}</span>
                  <span className="badge bg-white/5 text-white/40 text-xs">{cat.items?.length || 0} items</span>
                </div>
                {expandedCat === cat.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {expandedCat === cat.id && (
                <div className="border-t border-white/5">
                  {cat.items?.filter(Boolean).map((item) => (
                    <div key={item.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/3 border-b border-white/5 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{item.name}</p>
                          {item.is_must_try && <span className="badge bg-brand-500/20 text-brand-400 text-[10px]">Must Try</span>}
                        </div>
                        {item.description && <p className="text-xs text-white/40 mt-0.5">{item.description}</p>}
                      </div>
                      {item.price && <p className="text-sm text-brand-400 font-medium shrink-0">₹{item.price}</p>}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleMustTry.mutate({ id: item.id, is_must_try: !item.is_must_try })}
                          className={`transition-colors ${item.is_must_try ? 'text-brand-500' : 'text-white/20 hover:text-white/50'}`}
                          title="Toggle Must Try"
                        >
                          <Star size={14} fill={item.is_must_try ? 'currentColor' : 'none'} />
                        </button>
                        <button onClick={() => deleteItemMutation.mutate(item.id)} className="text-red-400/40 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {showAddItem === cat.id ? (
                    <div className="p-4 bg-dark-700/50 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          className="input text-sm col-span-2" placeholder="Item name *" />
                        <input value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                          className="input text-sm" placeholder="Description" />
                        <input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                          className="input text-sm" placeholder="Price (₹)" />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                        <input type="checkbox" checked={newItem.is_must_try}
                          onChange={(e) => setNewItem({ ...newItem, is_must_try: e.target.checked })}
                          className="accent-brand-500" />
                        Mark as Must Try
                      </label>
                      <div className="flex gap-2">
                        <button onClick={() => createItemMutation.mutate({ catId: cat.id, item: newItem })}
                          disabled={!newItem.name} className="btn-primary text-sm">Add</button>
                        <button onClick={() => setShowAddItem(null)} className="btn-ghost text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddItem(cat.id)}
                      className="w-full flex items-center justify-center gap-2 p-3 text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all">
                      <Plus size={14} /> Add Item
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
