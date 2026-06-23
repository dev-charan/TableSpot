import { useState, useRef } from 'react';
import { ScanLine, Upload, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MenuOCR({ onExtracted }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [items, setItems] = useState([]);
  const fileRef = useRef();

  const processImage = async (file) => {
    setLoading(true);
    setProgress(0);
    setItems([]);

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m) => { if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100)); },
      });

      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 2);
      const parsed = [];

      for (const line of lines) {
        const priceMatch = line.match(/[\d,]+\.?\d{0,2}$/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(',', '')) : null;
        const name = price ? line.replace(priceMatch[0], '').trim().replace(/[.\-_]+$/, '').trim() : line;
        if (name.length > 2 && name.length < 80) {
          parsed.push({ name, price, description: '' });
        }
      }

      setItems(parsed);
      toast.success(`Extracted ${parsed.length} items from menu`);
    } catch {
      toast.error('OCR failed. Please try a clearer image.');
    }
    setLoading(false);
  };

  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  return (
    <div className="space-y-4">
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5 transition-all"
      >
        <ScanLine size={32} className="mx-auto mb-3 text-white/40" />
        <p className="text-sm font-medium">Upload Menu Photo for OCR</p>
        <p className="text-xs text-white/40 mt-1">Supports JPG, PNG — AI will extract items automatically</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && processImage(e.target.files[0])} />
      </div>

      {loading && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <ScanLine size={16} className="text-brand-500 animate-pulse" />
            <span className="text-sm">Scanning menu... {progress}%</span>
          </div>
          <div className="w-full bg-dark-600 rounded-full h-1.5">
            <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/70">Extracted Items ({items.length})</p>
            <button onClick={() => onExtracted?.(items)} className="btn-primary text-xs py-1.5 px-4 flex items-center gap-2">
              <Check size={13} /> Use These Items
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {items.map((item, i) => (
              <div key={i} className="glass rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(i, 'name', e.target.value)}
                    className="input py-1.5 text-sm"
                    placeholder="Item name"
                  />
                  <input
                    value={item.price || ''}
                    onChange={(e) => updateItem(i, 'price', e.target.value)}
                    className="input py-1.5 text-sm"
                    placeholder="Price"
                    type="number"
                  />
                </div>
                <button onClick={() => removeItem(i)} className="text-red-400/60 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
