import React, { useState } from 'react';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Maximize2, 
  Trash2, 
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';

export type ImageAlignment = 'left' | 'center' | 'right' | 'banner';
export type ImageSize = 'sm' | 'md' | 'lg' | 'full';

interface ImageLayoutToolbarProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLayout: (alignment: ImageAlignment, size: ImageSize, caption?: string) => void;
  onRemoveImage: () => void;
  currentAlignment?: ImageAlignment;
  currentSize?: ImageSize;
  initialCaption?: string;
  imageUrl?: string;
}

export const ImageLayoutToolbar: React.FC<ImageLayoutToolbarProps> = ({
  isOpen,
  onClose,
  onApplyLayout,
  onRemoveImage,
  currentAlignment = 'center',
  currentSize = 'md',
  initialCaption = '',
  imageUrl,
}) => {
  const [alignment, setAlignment] = useState<ImageAlignment>(currentAlignment);
  const [size, setSize] = useState<ImageSize>(currentSize);
  const [caption, setCaption] = useState(initialCaption);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyLayout(alignment, size, caption);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <h3 className="font-heading font-bold text-sm text-zinc-100">
              Image Layout & Placement
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thumbnail Preview */}
        {imageUrl && (
          <div className="h-32 w-full rounded-xl overflow-hidden bg-black/60 border border-zinc-800 flex items-center justify-center">
            <img
              src={imageUrl}
              alt="Preview"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}

        {/* Alignment Selection */}
        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-2">
            Text Flow & Alignment
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'left', label: 'Wrap Left', icon: <AlignLeft className="w-4 h-4" /> },
              { id: 'center', label: 'Centered', icon: <AlignCenter className="w-4 h-4" /> },
              { id: 'right', label: 'Wrap Right', icon: <AlignRight className="w-4 h-4" /> },
              { id: 'banner', label: 'Banner', icon: <Maximize2 className="w-4 h-4" /> },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAlignment(item.id as ImageAlignment)}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  alignment === item.id
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-xs'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Size Selection */}
        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-2">
            Image Scale
          </label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { id: 'sm', label: 'Small', sub: '200px' },
              { id: 'md', label: 'Medium', sub: '320px' },
              { id: 'lg', label: 'Large', sub: '480px' },
              { id: 'full', label: 'Full', sub: '100%' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSize(item.id as ImageSize)}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  size === item.id
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-xs'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[9px] text-zinc-500 font-mono">{item.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Caption */}
        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-1">
            Caption & Citation
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g. Brum Montague, Veteran of the Oakhaven War"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onRemoveImage();
              onClose();
            }}
            className="p-2 text-rose-400 hover:bg-rose-950/40 rounded-xl border border-rose-900/40 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Delete this image from article"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Layout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
