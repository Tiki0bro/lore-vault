import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Mention from '@tiptap/extension-mention';
import Image from '@tiptap/extension-image';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  Quote, 
  List, 
  ListOrdered, 
  Code,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { GiPadlock, GiQuillInk } from 'react-icons/gi';
import { useLoreStore } from '../../store/useLoreStore';
import type { Article, World } from '../../types/lore';
import { ImageStudioModal } from '../modals/ImageStudioModal';
import { ImageLayoutToolbar, type ImageAlignment, type ImageSize } from './ImageLayoutToolbar';
import { TipTapAiMenu } from './TipTapAiMenu';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  isTypewriterMode: boolean;
  article?: Article;
  world?: World;
  onSetCover?: (imageUrl: string, prompt?: string) => void;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  isTypewriterMode,
  article,
  world,
  onSetCover,
}) => {
  const { articles, isPlayerMode } = useLoreStore();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [aiSelectedText, setAiSelectedText] = useState('');
  const [aiPrecedingText, setAiPrecedingText] = useState('');
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [pendingImageCaption, setPendingImageCaption] = useState<string>('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'codex-code-block',
          },
        },
      }),
      Placeholder.configure({
        placeholder: 'Weave your manuscript here... Type @ to reference characters, locations, or factions...',
      }),
      CharacterCount,
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'article-image',
        },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention-pill bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-medium text-xs inline-flex items-center gap-1 mx-0.5',
        },
        suggestion: {
          items: ({ query }: { query: string }) => {
            const list = isPlayerMode ? articles.filter((a) => !a.isSecret) : articles;
            return list
              .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5)
              .map((item) => ({ id: item.id, label: item.title, category: item.category }));
          },
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-invert max-w-none focus:outline-none min-h-[420px] font-serif text-zinc-200 text-base leading-relaxed py-4 ${
          isTypewriterMode ? 'typewriter-scroll' : ''
        }`,
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const src = e.target?.result as string;
                if (src) {
                  const node = view.state.schema.nodes.image?.create({ src, alt: file.name || 'Pasted lore artwork' });
                  if (node) {
                    const tr = view.state.tr.replaceSelectionWith(node);
                    view.dispatch(tr);
                  }
                }
              };
              reader.readAsDataURL(file);
              return true; // Handled image paste
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const file = files[0];
        if (file && file.type.indexOf('image') === 0) {
          event.preventDefault();
          const reader = new FileReader();
          reader.onload = (e) => {
            const src = e.target?.result as string;
            if (src) {
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              const node = view.state.schema.nodes.image?.create({ src, alt: file.name || 'Dropped lore artwork' });
              if (node && coordinates) {
                const tr = view.state.tr.insert(coordinates.pos, node);
                view.dispatch(tr);
              }
            }
          };
          reader.readAsDataURL(file);
          return true; // Handled image drop
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Keep content in sync when selected article changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  // Insert GM-only Secret Block
  const insertSecretBlock = () => {
    editor.chain().focus().insertContent(
      `<div class="secret-block p-4 my-4 rounded-lg bg-rose-950/30 border-2 border-rose-800/60 border-dashed text-rose-200 text-sm">
        <div class="font-sans font-bold text-xs uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1">
          🔒 GM Only Secret (Redacted in Player Mode)
        </div>
        <p>Enter private campaign notes, dungeon traps, or true character motivations here...</p>
      </div>`
    ).run();
  };

  // Insert Image into Prose
  const handleInsertImageProse = (url: string, caption?: string) => {
    setPendingImageUrl(url);
    setPendingImageCaption(caption || article?.title || '');
  };

  const handleApplyProseLayout = (alignment: ImageAlignment, size: ImageSize, customCaption?: string) => {
    if (!editor || !pendingImageUrl) return;

    const alignClass = 
      alignment === 'left' ? 'article-img-float-left' :
      alignment === 'right' ? 'article-img-float-right' :
      alignment === 'banner' ? 'article-img-banner' : 'article-img-center';
    
    const sizeClass = 
      size === 'sm' ? 'article-img-sm' :
      size === 'lg' ? 'article-img-lg' :
      size === 'full' ? 'article-img-full' : 'article-img-md';

    const finalCaption = customCaption !== undefined ? customCaption : pendingImageCaption;

    const figureHtml = `<figure class="my-6 ${alignClass} ${sizeClass} article-img-portrait-frame"><img src="${pendingImageUrl}" alt="${finalCaption || 'Lore artwork'}" class="rounded-xl border border-amber-500/30 shadow-xl mx-auto" />${
      finalCaption ? `<figcaption class="text-xs text-zinc-400 font-serif italic mt-2">${finalCaption}</figcaption>` : ''
    }</figure>`;

    editor.chain().focus().insertContent(figureHtml).run();
    setPendingImageUrl(null);
  };

  const openAiMenu = () => {
    if (!editor) return;
    const { state } = editor;
    const { from, to } = state.selection;
    const selected = state.doc.textBetween(from, to, ' ');
    const preceding = state.doc.textBetween(Math.max(0, from - 1500), from, ' ');
    setAiSelectedText(selected);
    setAiPrecedingText(preceding);
    setIsAiMenuOpen(true);
  };

  const handleInsertAiContent = (generatedHtmlOrText: string, replaceSelection = false) => {
    if (!editor) return;
    const formatted = generatedHtmlOrText.startsWith('<p>') || generatedHtmlOrText.startsWith('<h')
      ? generatedHtmlOrText
      : `<p>${generatedHtmlOrText.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
    
    if (replaceSelection) {
      editor.chain().focus().deleteSelection().insertContent(formatted).run();
    } else {
      editor.chain().focus().insertContent(formatted).run();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        openAiMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  return (
    <div className="flex flex-col flex-1" ref={editorRef}>
      {/* Editor Formatting Ribbon */}
      <div className="h-11 border-b border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-1">
          {/* Headings */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`btn-pill p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`btn-pill p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

          {/* Bold & Italic */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`btn-pill p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('bold')
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`btn-pill p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('italic')
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

          {/* Quotes and Lists */}
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`btn-pill p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('blockquote')
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`btn-pill p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('bulletList')
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`btn-pill p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('orderedList')
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`btn-pill p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('codeBlock')
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>

        {/* Right: AI Co-Writer, Art Studio & Secret Block Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={openAiMenu}
            className="btn-tactile flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-sans font-medium transition-colors cursor-pointer shadow-sm shadow-amber-500/10"
            title="Summon Manuscript AI Co-Pilot (Ctrl + J)"
          >
            <GiQuillInk className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Co-Writer</span>
            <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-zinc-900 border border-amber-500/30 text-[9px] font-mono text-amber-300">
              Ctrl+J
            </kbd>
          </button>

          <button
            onClick={() => setIsImageStudioOpen(true)}
            className="btn-tactile flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 text-xs font-sans font-medium transition-colors cursor-pointer"
            title="Open Lore Art Studio (AI Generation, Upload, or Link)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
            <span>+ Art / Image</span>
          </button>

          <button
            onClick={insertSecretBlock}
            className="btn-tactile flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-950/60 text-xs font-sans font-medium transition-colors cursor-pointer"
            title="Insert GM-Only Secret Block"
          >
            <GiPadlock className="w-3.5 h-3.5 text-rose-400" />
            <span>+ Secret Block</span>
          </button>
        </div>
      </div>

      {/* TipTap Document Surface with Vertical and Horizontal Scrolling */}
      <div className="flex-1 overflow-y-auto overflow-x-auto px-6 sm:px-12 py-6 scrollbar-thin">
        <div className="min-w-0 max-w-4xl mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Lore Art Studio Modal */}
      <ImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        article={article}
        world={world}
        onInsertProse={handleInsertImageProse}
        onSetCover={onSetCover}
        initialTarget="prose"
      />

      {/* Image Layout & Placement Modal */}
      <ImageLayoutToolbar
        isOpen={Boolean(pendingImageUrl)}
        onClose={() => setPendingImageUrl(null)}
        onApplyLayout={handleApplyProseLayout}
        onRemoveImage={() => setPendingImageUrl(null)}
        imageUrl={pendingImageUrl || ''}
        initialCaption={pendingImageCaption}
      />

      {/* Manuscript AI Co-Pilot Menu */}
      <TipTapAiMenu
        isOpen={isAiMenuOpen}
        onClose={() => setIsAiMenuOpen(false)}
        selectedText={aiSelectedText}
        precedingText={aiPrecedingText}
        onInsertContent={handleInsertAiContent}
      />
    </div>
  );
};
