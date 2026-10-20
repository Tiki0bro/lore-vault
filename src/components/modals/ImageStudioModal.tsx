import React, { useState, useEffect } from 'react';
import type { Article, World, ArticleCategory } from '../../types/lore';
import { 
  ImageGenerator, 
  IMAGE_STYLE_PRESETS, 
  CORE_STYLE_KEYS,
  type ImageStylePreset, 
  type ImageAspectRatio 
} from '../../lib/ai/imageGenerator';
import { useArtStore, type ArtGeneration } from '../../store/useArtStore';
import { 
  X, 
  Sparkles, 
  Upload, 
  Link as LinkIcon, 
  RefreshCw, 
  Check, 
  Download, 
  Copy, 
  ImageIcon,
  History,
  Zap,
  Star,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Plus,
  Server,
  Key,
  ImagePlus,
  Sliders
} from 'lucide-react';
import { GiSparkles, GiPhotoCamera } from 'react-icons/gi';
import { 
  validatePromptCompleteness, 
  injectFacetIntoPrompt, 
  CATEGORY_PROMPT_SCHEMAS 
} from '../../lib/ai/promptCompleteness';
import { AIHordeClient } from '../../lib/ai/aiHordeClient';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  article?: Article;
  world?: World;
  onInsertProse?: (imageUrl: string, caption?: string) => void;
  onSetCover?: (imageUrl: string, prompt?: string) => void;
  defaultMode?: 'ai' | 'upload' | 'url' | 'history';
  initialTarget?: 'prose' | 'cover';
}

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  article,
  world,
  onInsertProse,
  onSetCover,
  defaultMode = 'ai',
  initialTarget = 'cover',
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'upload' | 'url' | 'history'>(defaultMode);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<ImageStylePreset>('realism');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>(initialTarget === 'cover' ? 'banner' : 'cinematic');
  const [caption, setCaption] = useState('');

  // Generation Engine Selection: 'pollinations' (Instant direct free) vs 'horde' (Decentralized AI Horde free)
  const [engine, setEngine] = useState<'pollinations' | 'horde'>('pollinations');
  const [hordeProgress, setHordeProgress] = useState<string | null>(null);
  const [hordeApiKey, setHordeApiKey] = useState<string>(() => {
    return localStorage.getItem('lorevault_horde_api_key') || 'Yi43zfd6E58tvX3Ju80dlA';
  });
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);

  // Reference Image (img2img) State
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [useReferenceImage, setUseReferenceImage] = useState<boolean>(false);
  const [denoisingStrength, setDenoisingStrength] = useState<number>(0.65);

  // Automatically ensure key is persisted
  useEffect(() => {
    if (!localStorage.getItem('lorevault_horde_api_key')) {
      localStorage.setItem('lorevault_horde_api_key', 'Yi43zfd6E58tvX3Ju80dlA');
    }
  }, []);

  const handleSaveHordeKey = (key: string) => {
    setHordeApiKey(key);
    if (key.trim()) {
      localStorage.setItem('lorevault_horde_api_key', key.trim());
    } else {
      localStorage.removeItem('lorevault_horde_api_key');
    }
  };

  // Single Image State
  const [currentSeed, setCurrentSeed] = useState<number>(() => ImageGenerator.randomSeed());
  const [isHd, setIsHd] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  
  // Prompt Completeness Category Selector (defaults to article's category or Character)
  const [promptCategory, setPromptCategory] = useState<ArticleCategory>(article?.category || 'Character');
  const [showFacetGuide, setShowFacetGuide] = useState(false);

  // Single active selected image for output
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [targetDestination, setTargetDestination] = useState<'cover' | 'prose' | 'both'>(
    initialTarget === 'cover' ? 'cover' : 'prose'
  );

  // Direct URL state
  const [directUrlInput, setDirectUrlInput] = useState('');

  // Art Store History
  const { history, addGeneration, toggleFavorite, removeGeneration } = useArtStore();

  // Validate Prompt Completeness
  const validation = React.useMemo(() => {
    return validatePromptCompleteness(prompt, promptCategory);
  }, [prompt, promptCategory]);

  // Quick Inject missing facet snippet
  const handleInjectFacet = (facetSnippet: string) => {
    const updated = injectFacetIntoPrompt(prompt, facetSnippet);
    setPrompt(updated);
  };

  // Populate prompt suggestions and existing article images when modal opens
  useEffect(() => {
    if (isOpen) {
      if (article) {
        const suggestion = ImageGenerator.suggestPrompt(article, world);
        setPrompt(suggestion.prompt);
        setStyle(suggestion.style);
        setCaption(article.title);
        setPromptCategory(article.category || 'Character');

        // Check if article already has a visual reference (cover or first prose image)
        const proseMatch = article.content?.match(/<img[^>]+src=["']([^"']+)["']/i);
        const existingImg = article.coverImageUrl || (proseMatch ? proseMatch[1] : null);
        if (existingImg) {
          setReferenceImageUrl(existingImg);
          setUseReferenceImage(true);
        } else {
          setReferenceImageUrl(null);
          setUseReferenceImage(false);
        }
      }
      setActiveTab(defaultMode);
      setTargetDestination(initialTarget === 'cover' ? 'cover' : 'prose');
    }
  }, [isOpen, article, world, defaultMode, initialTarget]);

  if (!isOpen) return null;

  const saveCandidateToStore = (url: string, seed: number, hd = false) => {
    const { width, height } = hd 
      ? ImageGenerator.getHdDimensions(aspectRatio) 
      : ImageGenerator.getDimensions(aspectRatio);

    const record: ArtGeneration = {
      id: `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      worldId: world?.id || 'world_lore_prime',
      articleId: article?.id,
      prompt: prompt.trim(),
      style,
      ratio: aspectRatio,
      seed,
      width,
      height,
      url,
      isHd: hd,
      favorite: false,
      createdAt: new Date().toISOString(),
    };
    addGeneration(record);
  };

  // Generate 1 high-resolution artwork
  const handleGenerateArtwork = async (customSeed?: number) => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setHordeProgress(null);

    try {
      const { width, height } = ImageGenerator.getDimensions(aspectRatio);
      const seedToUse = customSeed !== undefined ? customSeed : ImageGenerator.randomSeed();
      setCurrentSeed(seedToUse);
      setIsHd(false);

      if (engine === 'horde') {
        // AI Horde Decentralized Cluster Generation
        setHordeProgress('Submitting job to AI Horde cluster...');
        const fullPrompt = ImageGenerator.buildFullPrompt(prompt, style, true);

        // Select optimal model priority by style
        const modelChoices = 
          style === 'anime' ? ['Flat-2D Animerge', 'stable_diffusion'] :
          style === 'realism' ? ['Deliberate', 'AbsoluteReality', 'stable_diffusion'] :
          style === 'concept_art' ? ['Deliberate', 'AlbedoBase XL (SDXL)', 'stable_diffusion'] :
          ['stable_diffusion', 'Deliberate'];

        const hordeDims = AIHordeClient.getHordeDimensions(aspectRatio);
        const hordeRes = await AIHordeClient.generate({
          prompt: `${fullPrompt}, upper body portrait, centered framing, head in frame, complete face`,
          negativePrompt: 'cropped, cut off head, out of frame, headless, deformed face, bad anatomy, blur, watermark, text',
          seed: seedToUse,
          width: hordeDims.width,
          height: hordeDims.height,
          models: modelChoices,
          apiKey: hordeApiKey.trim() || undefined,
          sourceImage: (useReferenceImage && referenceImageUrl) ? referenceImageUrl : undefined,
          denoisingStrength: (useReferenceImage && referenceImageUrl) ? denoisingStrength : undefined,
          onProgress: (status) => {
            if (status.done) {
              setHordeProgress('Finalizing artwork payload...');
            } else if (status.processing > 0) {
              setHordeProgress(`Worker rendering image (${status.waitTime}s estimated)...`);
            } else {
              setHordeProgress(`Waiting in queue (position ${status.queuePosition}, ~${status.waitTime}s)...`);
            }
          },
        });

        setGeneratedUrl(hordeRes.imageUrl);
        saveCandidateToStore(hordeRes.imageUrl, seedToUse, false);
      } else {
        // Pollinations.ai instant free generation
        const url = ImageGenerator.buildUrl({
          prompt: prompt.trim(),
          style,
          seed: seedToUse,
          width,
          height,
          enhancePrompt: true,
        });

        setGeneratedUrl(url);
        saveCandidateToStore(url, seedToUse, false);
      }
    } catch (e) {
      console.error('Failed to generate artwork', e);
      // Auto-fallback: if AI Horde times out or network drops, provide procedural fallback
      const { width, height } = ImageGenerator.getDimensions(aspectRatio);
      const fallbackSvg = ImageGenerator.generateProceduralFallbackSvg(
        caption || prompt || article?.title || 'Lore Emblem',
        style,
        width,
        height,
        currentSeed
      );
      setGeneratedUrl(fallbackSvg);
    } finally {
      setIsGenerating(false);
      setHordeProgress(null);
    }
  };

  // Re-roll with a new random seed
  const handleReroll = () => {
    const newSeed = ImageGenerator.randomSeed();
    handleGenerateArtwork(newSeed);
  };

  // Fallback handler for broken/paywalled candidate images
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = ImageGenerator.getDimensions(aspectRatio);
    const fallbackSvg = ImageGenerator.generateProceduralFallbackSvg(
      caption || prompt || article?.title || 'Lore Emblem',
      style,
      width,
      height,
      currentSeed
    );
    e.currentTarget.src = fallbackSvg;
    setGeneratedUrl(fallbackSvg);
  };

  // Upscale image to HD dimensions (~2048px long edge)
  const handleUpscale = async () => {
    if (!generatedUrl || isUpscaling) return;
    setIsUpscaling(true);

    try {
      const { width, height } = ImageGenerator.getHdDimensions(aspectRatio);
      const hdUrl = ImageGenerator.buildUrl({
        prompt: prompt.trim(),
        style,
        seed: currentSeed,
        width,
        height,
        enhancePrompt: true,
      });

      setIsHd(true);
      setGeneratedUrl(hdUrl);
      saveCandidateToStore(hdUrl, currentSeed, true);
    } catch (e) {
      console.error('Failed to upscale image', e);
    } finally {
      setIsUpscaling(false);
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setGeneratedUrl(dataUrl);
        if (!caption && file.name) {
          setCaption(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Direct URL apply
  const handleApplyDirectUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (directUrlInput.trim()) {
      setGeneratedUrl(directUrlInput.trim());
    }
  };

  // Auto-suggest prompt from article
  const handleAutoSuggest = () => {
    if (article) {
      const suggestion = ImageGenerator.suggestPrompt(article, world);
      setPrompt(suggestion.prompt);
      setStyle(suggestion.style);
    }
  };

  // Copy prompt formatted for Gemini Pro web app
  const handleCopyPromptForGemini = () => {
    const fullPrompt = ImageGenerator.buildFullPrompt(prompt, style, true);
    navigator.clipboard.writeText(fullPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Final Action: Apply to Lore Article
  const handleApply = () => {
    if (!generatedUrl) return;

    if (targetDestination === 'cover' || targetDestination === 'both') {
      onSetCover?.(generatedUrl, prompt);
    }
    if (targetDestination === 'prose' || targetDestination === 'both') {
      onInsertProse?.(generatedUrl, caption || article?.title);
    }

    onClose();
  };

  const handleCopyLink = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedUrl) return;
    const a = document.createElement('a');
    a.href = generatedUrl;
    a.download = `${(article?.title || 'lore_image').replace(/[^a-z0-9]/gi, '_')}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Pick an image from Vault History
  const handlePickHistoryItem = (item: ArtGeneration) => {
    setGeneratedUrl(item.url);
    setPrompt(item.prompt);
    setStyle(item.style);
    setAspectRatio(item.ratio);
    setCurrentSeed(item.seed);
    setIsHd(item.isHd || false);
    setActiveTab('ai');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <GiPhotoCamera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-sm sm:text-base text-zinc-100 flex items-center gap-2">
                <span>Lore Art Studio</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> High-Res Forge
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                {article ? `Craft visual depictions for "${article.title}"` : 'Generate and insert realm illustrations'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Tabs */}
        <div className="flex items-center border-b border-zinc-800 bg-zinc-900/40 px-4 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-2.5 px-3.5 flex items-center gap-2 font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-amber-500 text-amber-300 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GiSparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Art Studio</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-3.5 flex items-center gap-2 font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-300 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Vault Gallery ({history.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2.5 px-3.5 flex items-center gap-2 font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-amber-500 text-amber-300 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`py-2.5 px-3.5 flex items-center gap-2 font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'url'
                ? 'border-amber-500 text-amber-300 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Direct URL</span>
          </button>
        </div>

        {/* Studio Content Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Generator Controls (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* TAB A: AI GENERATOR */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                {/* Prompt Input Header */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <span>Artistic Prompt</span>
                      <span className="text-[10px] text-zinc-500 font-normal">(Describe subjects, lighting, mood)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {article && (
                        <button
                          type="button"
                          onClick={handleAutoSuggest}
                          className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                          title="Auto-build prompt using article metadata"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Auto-Fill</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCopyPromptForGemini}
                        className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                        title="Copy enriched prompt with style keywords to clipboard"
                      >
                        {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPrompt ? 'Copied!' : 'Copy for Gemini App'}</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. High Inquisitor Vaelen clad in ornate silver plate armor, wielding a burning sunshard glaive, dark fantasy oil painting..."
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/70 transition-all font-sans"
                  />
                </div>

                {/* Prompt Completeness Checklist & Guard */}
                <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${validation.isComplete ? 'text-emerald-400' : 'text-amber-400'}`} />
                        <span>Prompt Completeness Guard</span>
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full border ${
                        validation.isComplete 
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}>
                        {validation.score}% Complete ({validation.metCount}/{validation.totalCount})
                      </span>
                    </div>

                    {/* Category Target Selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500">Subject:</span>
                      <select
                        value={promptCategory}
                        onChange={(e) => setPromptCategory(e.target.value as ArticleCategory)}
                        className="bg-zinc-950 border border-zinc-700/80 rounded px-2 py-0.5 text-[11px] font-semibold text-amber-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        {(Object.keys(CATEGORY_PROMPT_SCHEMAS) as ArticleCategory[]).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Completeness Progress Bar */}
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        validation.isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'
                      }`}
                      style={{ width: `${Math.max(5, validation.score)}%` }}
                    />
                  </div>

                  {/* Facet Chips / Must-Haves */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400 font-medium">
                        Must-Have Details for <span className="text-amber-300 font-semibold">{validation.schema.categoryLabel}</span>:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowFacetGuide(!showFacetGuide)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>{showFacetGuide ? 'Hide Guide' : 'What is this?'}</span>
                      </button>
                    </div>

                    {showFacetGuide && (
                      <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[10px] text-zinc-400 leading-relaxed animate-in fade-in duration-150">
                        {validation.schema.description} Without these descriptors, image models produce generic or distorted visual artifacts.
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {validation.schema.requirements.map(req => {
                        const isMet = validation.metIds.includes(req.id);
                        return (
                          <div
                            key={req.id}
                            className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                              isMet
                                ? 'bg-emerald-950/20 border-emerald-700/50 text-emerald-300'
                                : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:border-amber-500/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-[11px] flex items-center gap-1">
                                {isMet ? (
                                  <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                )}
                                <span>{req.label}</span>
                              </span>
                              {!isMet && (
                                <button
                                  type="button"
                                  onClick={() => handleInjectFacet(req.examples[0])}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 flex items-center gap-0.5 cursor-pointer font-medium"
                                  title={`Append example: "${req.examples[0]}"`}
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>+ Add</span>
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                              {req.description}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Warning Notice if Incomplete */}
                  {!validation.isComplete && (
                    <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/60 flex items-start gap-2 text-[11px] text-amber-300/90 leading-tight">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span>Missing mandatory details: </span>
                        <span className="font-semibold text-amber-200">
                          {validation.missing.map(m => m.label).join(', ')}.
                        </span>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          Click "+ Add" on the missing cards or click "Auto-Fill" to populate a complete prompt recipe.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Style Presets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-300">
                      Illustration Style
                    </label>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      Select aesthetic for character or scene
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {CORE_STYLE_KEYS.map((key) => {
                      const meta = IMAGE_STYLE_PRESETS[key];
                      const isSelected = style === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setStyle(key)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-md shadow-amber-500/20 ring-1 ring-amber-500/50'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-heading font-bold text-xs">
                              {meta.name}
                            </span>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400 animate-pulse" />
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 line-clamp-2 mt-1 leading-snug">
                            {meta.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Visual Reference Image (img2img) Option */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Use Reference Image (img2img)</span>
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useReferenceImage && Boolean(referenceImageUrl)}
                        disabled={!referenceImageUrl}
                        onChange={(e) => setUseReferenceImage(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500 peer-disabled:opacity-40"></div>
                    </label>
                  </div>

                  {referenceImageUrl ? (
                    <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                      <img
                        src={referenceImageUrl}
                        alt="Reference"
                        className="w-12 h-12 rounded object-cover border border-zinc-700 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-medium text-zinc-200 block truncate">
                          {article?.coverImageUrl === referenceImageUrl ? 'Article Cover Image' : 'Article Reference'}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">
                          AI Horde will stylize this image to match your prompt & style
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReferenceImageUrl(null);
                          setUseReferenceImage(false);
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors text-xs"
                        title="Remove reference"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                      <span>No existing image found on this article.</span>
                      <label className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline text-[10px]">
                        <span>+ Upload Reference</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const b64 = ev.target?.result as string;
                              if (b64) {
                                setReferenceImageUrl(b64);
                                setUseReferenceImage(true);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>
                  )}

                  {useReferenceImage && referenceImageUrl && (
                    <div className="pt-1.5 border-t border-zinc-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-amber-400" />
                          <span>Similarity Influence (Denoising)</span>
                        </span>
                        <span className="font-mono text-amber-300">
                          {Math.round((1 - denoisingStrength) * 100)}% Match Original
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="0.85"
                        step="0.05"
                        value={denoisingStrength}
                        onChange={(e) => setDenoisingStrength(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                        <span>High Fidelity (0.2)</span>
                        <span>Balanced (0.65)</span>
                        <span>Creative Redesign (0.85)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Aspect Ratio Options */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-2">
                    Canvas Dimensions & Aspect Ratio
                  </label>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {[
                      { id: 'banner', label: 'Banner', sub: '21:9', icon: '▬' },
                      { id: 'cinematic', label: 'Widescreen', sub: '16:9', icon: '▭' },
                      { id: 'square', label: 'Square', sub: '1:1', icon: '◻' },
                      { id: 'portrait', label: 'Portrait', sub: '3:4', icon: '▯' },
                    ].map((ratio) => (
                      <button
                        key={ratio.id}
                        type="button"
                        onClick={() => setAspectRatio(ratio.id as ImageAspectRatio)}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                          aspectRatio === ratio.id
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-sm font-mono">{ratio.icon}</span>
                        <span className="font-semibold text-[11px] mt-0.5">{ratio.label}</span>
                        <span className="text-[9px] text-zinc-500 font-mono">{ratio.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Engine Selection: Direct Pollinations vs AI Horde */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-amber-400" />
                      <span>AI Generator Engine</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">100% Free / No Key Required</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEngine('pollinations')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        engine === 'pollinations'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-sm'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">Direct Engine</span>
                        {engine === 'pollinations' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                            Instant
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        High-speed generation, instant render
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEngine('horde')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        engine === 'horde'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-sm'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">AI Horde Cluster</span>
                        {engine === 'horde' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30">
                            {hordeApiKey ? 'Priority Key' : 'Decentralized'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        Volunteer GPU network (Flat-2D, SD)
                      </div>
                    </button>
                  </div>

                  {/* Optional AI Horde API Key Configuration */}
                  {engine === 'horde' && (
                    <div className="mt-2 p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-300 font-semibold flex items-center gap-1.5">
                          <Key className="w-3 h-3 text-amber-400" />
                          <span>AI Horde API Key</span>
                          {hordeApiKey && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Active (Kudos Priority)
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowKeyInput(!showKeyInput)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 cursor-pointer font-medium underline"
                        >
                          {showKeyInput ? 'Hide Key' : hordeApiKey ? 'Change Key' : '+ Enter API Key'}
                        </button>
                      </div>

                      {showKeyInput ? (
                        <div className="pt-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="password"
                              value={hordeApiKey}
                              onChange={(e) => handleSaveHordeKey(e.target.value)}
                              placeholder="Enter your AI Horde API Key"
                              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                            />
                            {hordeApiKey && (
                              <button
                                type="button"
                                onClick={() => handleSaveHordeKey('')}
                                className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-rose-400 text-[10px] cursor-pointer"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Your key is stored locally in your browser. Using your registered key gives you priority worker queue status based on your account Kudos.
                          </p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-zinc-500 leading-tight">
                          {hordeApiKey
                            ? 'Using your custom API key for higher priority queue and faster generations.'
                            : 'Using default anonymous key (0000000000). Click "+ Enter API Key" to use your account Kudos.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Generate 1-Image Action Button Guarded by Completeness */}
                <div>
                  <button
                    type="button"
                    onClick={() => handleGenerateArtwork()}
                    disabled={isGenerating || !prompt.trim() || !validation.isComplete}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer mt-1 ${
                      validation.isComplete
                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 shadow-amber-500/20'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Forging Artwork with AI...</span>
                      </>
                    ) : !validation.isComplete ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span>Complete {validation.missing.length} Missing Must-Have{validation.missing.length > 1 ? 's' : ''} to Forge</span>
                      </>
                    ) : (
                      <>
                        <GiSparkles className="w-4 h-4" />
                        <span>{generatedUrl ? 'Forge New Artwork' : 'Forge Artwork'}</span>
                      </>
                    )}
                  </button>
                  {!validation.isComplete && prompt.trim() && (
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500 px-1">
                      <span>Click Auto-Fill or the "+ Add" tags above to satisfy all requirements.</span>
                      <button
                        type="button"
                        onClick={handleAutoSuggest}
                        className="text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
                      >
                        Auto-Fill All
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB B: VAULT HISTORY GALLERY */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">
                    Saved Realm Illustrations
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Click to load recipe into studio
                  </span>
                </div>
                {history.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    No images saved yet. Generate artworks to build your realm gallery!
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="group relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/60 hover:border-amber-500/60 transition-all text-left flex flex-col"
                      >
                        <div 
                          className="h-28 w-full bg-zinc-950 cursor-pointer overflow-hidden relative"
                          onClick={() => handlePickHistoryItem(item)}
                        >
                          <img
                            src={item.url}
                            alt={item.prompt}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = ImageGenerator.generateProceduralFallbackSvg(
                                item.prompt,
                                item.style,
                                item.width,
                                item.height,
                                item.seed
                              );
                            }}
                          />
                          {item.isHd && (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 font-bold text-[9px] uppercase tracking-wider">
                              HD
                            </span>
                          )}
                        </div>
                        <div className="p-2 flex items-center justify-between text-[11px] bg-zinc-900">
                          <span className="font-medium text-zinc-300 truncate max-w-[110px]" title={item.prompt}>
                            {item.prompt}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleFavorite(item.id)}
                              className={`p-1 rounded hover:bg-zinc-800 cursor-pointer ${
                                item.favorite ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                              title={item.favorite ? 'Favorited' : 'Add to favorites'}
                            >
                              <Star className={`w-3.5 h-3.5 ${item.favorite ? 'fill-amber-400' : ''}`} />
                            </button>
                            <button
                              onClick={() => removeGeneration(item.id)}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 cursor-pointer"
                              title="Delete from history"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB C: UPLOAD FILE */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <label className="border-2 border-dashed border-zinc-700 hover:border-amber-500/60 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all cursor-pointer group">
                  <div className="p-3.5 rounded-2xl bg-zinc-800 group-hover:bg-amber-500/20 text-zinc-400 group-hover:text-amber-300 transition-colors">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-semibold text-zinc-200 block">
                      Choose an image file or drop it here
                    </span>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      Supports PNG, JPG, WebP, SVG (stored securely in vault)
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* TAB D: DIRECT WEB URL */}
            {activeTab === 'url' && (
              <form onSubmit={handleApplyDirectUrl} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Direct Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={directUrlInput}
                      onChange={(e) => setDirectUrlInput(e.target.value)}
                      placeholder="https://example.com/fantasy-portrait.jpg"
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={!directUrlInput.trim()}
                      className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Load Preview
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Caption & Destination Controls */}
            {generatedUrl && (
              <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3 mt-1">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Image Caption / Legend
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="e.g. Portrait of High Inquisitor Vaelen at the High Spire"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Apply Destination
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'cover', label: 'Article Cover Art' },
                      { id: 'prose', label: 'Prose Insertion' },
                      { id: 'both', label: 'Cover & Prose' },
                    ].map((dest) => (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => setTargetDestination(dest.id as 'cover' | 'prose' | 'both')}
                        className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                          targetDestination === dest.id
                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-semibold'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {dest.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Canvas Inspector & Controls (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            <span className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
              <span>Canvas Inspector</span>
              {generatedUrl && (
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ready to Apply
                </span>
              )}
            </span>

            {/* Primary Display Frame */}
            <div className="flex-1 min-h-[300px] rounded-2xl bg-zinc-900 border border-zinc-800/80 flex flex-col items-center justify-center overflow-hidden relative group">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
                    <Sparkles className="w-5 h-5 text-amber-400 absolute inset-0 m-auto" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-amber-300 block">
                      {hordeProgress || 'Forging Artwork with AI...'}
                    </span>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      {engine === 'horde' ? 'AI Horde Decentralized Cluster' : 'Direct Engine'} • {IMAGE_STYLE_PRESETS[style]?.name}
                    </span>
                  </div>
                </div>
              ) : generatedUrl ? (
                <>
                  <img
                    src={generatedUrl}
                    alt={caption || 'Generated Lore'}
                    className="w-full h-full object-contain max-h-[380px] select-none"
                    onError={handleImageError}
                  />
                  {isHd && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500/90 text-zinc-950 text-[10px] font-bold tracking-wider flex items-center gap-1 shadow-md">
                      <Zap className="w-3 h-3 fill-zinc-950" /> HD RESOLUTION
                    </div>
                  )}
                  {/* Action Overlay */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md p-1.5 rounded-xl border border-zinc-700/60">
                    <button
                      onClick={handleCopyLink}
                      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 transition-colors cursor-pointer"
                      title={copiedLink ? 'Copied!' : 'Copy Image Link'}
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 transition-colors cursor-pointer"
                      title="Download Image"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <a
                      href={generatedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 transition-colors cursor-pointer"
                      title="Open full size in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  {caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6 text-center">
                      <span className="text-xs font-serif text-amber-100 italic">
                        {caption}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-600">
                  <ImageIcon className="w-12 h-12 mb-2 text-zinc-700 stroke-1" />
                  <span className="text-xs font-medium text-zinc-400">
                    No artwork forged yet
                  </span>
                  <span className="text-[11px] text-zinc-500 mt-1 max-w-[220px]">
                    Complete the prompt must-haves on the left and click "Forge Artwork".
                  </span>
                </div>
              )}
            </div>

            {/* Single Image Action & Seed Controls */}
            {generatedUrl && (
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Seed: <span className="font-mono text-amber-300">{currentSeed}</span></span>
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {IMAGE_STYLE_PRESETS[style]?.name} • {aspectRatio.toUpperCase()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Re-roll New Seed */}
                  <button
                    type="button"
                    onClick={handleReroll}
                    disabled={isGenerating}
                    className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 border border-zinc-700 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Re-generate with a new random seed"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Re-roll (New Seed)</span>
                  </button>

                  {/* HD Upscale */}
                  <button
                    type="button"
                    onClick={handleUpscale}
                    disabled={isUpscaling || isHd}
                    className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-amber-500/30 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Render this artwork at HD ~2048px resolution"
                  >
                    {isUpscaling ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 fill-amber-300" />
                    )}
                    <span>{isHd ? 'Upscaled HD' : 'Upscale to HD'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Finalize Button */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!generatedUrl}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-40 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {targetDestination === 'cover'
                    ? 'Set as Cover Art'
                    : targetDestination === 'prose'
                    ? 'Insert into Prose'
                    : 'Apply as Cover & Prose'}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
