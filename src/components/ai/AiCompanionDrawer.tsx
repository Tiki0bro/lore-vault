import React, { useState } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import { aiOrchestrator } from '../../lib/ai/aiOrchestrator';
import type { AiMessage, WorldDoctorReport } from '../../lib/ai/geminiClient';
import { buildVaultContext } from '../../lib/ai/loreContextBuilder';
import type { AiProviderType, TonePreset } from '../../types/lore';
import { 
  GiBrain, 
  GiFlame, 
  GiHealthNormal, 
  GiCog, 
  GiCheckMark,
  GiSparkles,
  GiPhotoCamera
} from 'react-icons/gi';
import { 
  X, 
  Send, 
  Sparkles, 
  RefreshCw, 
  Server
} from 'lucide-react';
import { 
  IMAGE_STYLE_PRESETS, 
  type ImageStylePreset, 
  type ImageAspectRatio,
  ImageGenerator
} from '../../lib/ai/imageGenerator';

interface AiCompanionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiCompanionDrawer: React.FC<AiCompanionDrawerProps> = ({ isOpen, onClose }) => {
  const { 
    worlds, 
    activeWorldId, 
    articles, 
    isPlayerMode, 
    setActiveView, 
    setSelectedArticleId,
    updateArticle,
    createArticle,
    aiSettings,
    updateAiSettings
  } = useLoreStore();

  const activeWorld = worlds.find((w) => w.id === activeWorldId) || worlds[0];

  const [activeTab, setActiveTab] = useState<'chat' | 'griller' | 'doctor' | 'illustrator' | 'settings'>('chat');
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Realm Illustrator state
  const [artPrompt, setArtPrompt] = useState('');
  const [artStyle, setArtStyle] = useState<ImageStylePreset>('grimdark');
  const [artRatio, setArtRatio] = useState<ImageAspectRatio>('cinematic');
  const [artGeneratedUrl, setArtGeneratedUrl] = useState<string | null>(null);
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [selectedTargetArticleId, setSelectedTargetArticleId] = useState<string>(articles[0]?.id || '');
  const [attachedSuccess, setAttachedSuccess] = useState(false);

  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: `Greetings, Scholar. I am attuned to the lore of **${activeWorld.name}**. Ask me about your factions, characters, or locations, or trigger Arthur Vance's Socratic stress-test.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // World Doctor state
  const [doctorReport, setDoctorReport] = useState<WorldDoctorReport | null>(null);

  // Settings state
  const [tempApiKey, setTempApiKey] = useState(aiSettings.geminiApiKey);
  const [tempGeminiModel, setTempGeminiModel] = useState(aiSettings.geminiModel);
  const [tempOllamaEndpoint, setTempOllamaEndpoint] = useState(aiSettings.ollamaEndpoint);
  const [tempOllamaModel, setTempOllamaModel] = useState(aiSettings.ollamaModel);
  const [tempProvider, setTempProvider] = useState<AiProviderType>(aiSettings.provider);
  const [tempTone, setTempTone] = useState<TonePreset>(aiSettings.tonePreset);
  const [tempNoGenerate, setTempNoGenerate] = useState(aiSettings.noGenerateMode);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  if (!isOpen) return null;

  // Handle Chat Submit
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isLoading) return;

    const userMsg: AiMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: inputPrompt.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const promptToSend = inputPrompt.trim();
    setInputPrompt('');
    setIsLoading(true);

    try {
      const context = buildVaultContext(activeWorld, articles, isPlayerMode, promptToSend);
      const systemInstruction = `You are the LoreVault Worldbuilding AI Assistant for the realm "${activeWorld.name}" (Genre: ${activeWorld.genre}).
Lore context:
${context.articlesContext}

Guidelines:
1. Ground answers in canonical lore. Wrap known entities in double brackets like [[High Inquisitor Vaelen]] so they become wiki-links.
2. If Player Mode is active (${isPlayerMode}), never reveal GM secrets.`;

      const replyText = await aiOrchestrator.generateWithFallback(promptToSend, {
        systemInstruction,
        temperature: 0.7,
        maxTokens: 1200,
      });

      const aiMsg: AiMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Run Arthur Vance Socratic Griller
  const handleTriggerGriller = async () => {
    setIsLoading(true);
    setActiveTab('griller');

    try {
      const context = buildVaultContext(activeWorld, articles, isPlayerMode);
      const prompt = `Perform an aggressive Socratic Causality Audit (Arthur "The Griller" Vance persona) on this world's lore:
Realm: ${context.world.name} (${context.world.genre})
Lore Context:
${context.articlesContext}

Identify 3 unspoken logistical holes, contradictory motivations, or hand-waved magic rules. Apply the 5-Whys probe.`;

      const auditResult = await aiOrchestrator.generateWithFallback(prompt, {
        systemInstruction: 'You are Arthur "The Griller" Vance, Socratic Architect. Probe logic ruthlessly.',
        temperature: 0.65,
        maxTokens: 1400,
      });

      const grillerMsg: AiMessage = {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        persona: 'Arthur Vance',
        text: auditResult,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, grillerMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Run Dynamic World Doctor Audit
  const handleTriggerDoctor = async () => {
    setIsLoading(true);
    setActiveTab('doctor');

    try {
      const context = buildVaultContext(activeWorld, articles, isPlayerMode);
      const report = await aiOrchestrator.runWorldDoctor({
        worldName: activeWorld.name,
        worldGenre: activeWorld.genre,
        articlesContext: context.articlesContext,
      });
      setDoctorReport(report);
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Flesh Out Stub from Doctor Report
  const handleFleshOutDoctorStub = async (stubTitle: string, stubHook: string) => {
    setIsLoading(true);
    try {
      const context = buildVaultContext(activeWorld, articles, isPlayerMode);
      const generatedContent = await aiOrchestrator.fleshOutArticleStub({
        title: stubTitle,
        category: 'Lore',
        summary: stubHook,
        worldName: activeWorld.name,
        worldGenre: activeWorld.genre,
        existingArticlesContext: context.articlesContext,
      });

      const newArt = {
        id: `art-${Date.now()}`,
        worldId: activeWorldId,
        title: stubTitle,
        category: 'Lore' as const,
        summary: stubHook,
        content: generatedContent.startsWith('<') ? generatedContent : `<p>${generatedContent.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
        tags: ['Auto-Cured', 'Canon'],
        isSecret: false,
        updatedAt: new Date().toISOString(),
      };

      createArticle(newArt);
      setSelectedArticleId(newArt.id);
      setActiveView('manuscript');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateAiSettings({
      geminiApiKey: tempApiKey.trim(),
      geminiModel: tempGeminiModel,
      ollamaEndpoint: tempOllamaEndpoint.trim(),
      ollamaModel: tempOllamaModel.trim(),
      provider: tempProvider,
      tonePreset: tempTone,
      noGenerateMode: tempNoGenerate,
    });
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  // Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      updateAiSettings({
        geminiApiKey: tempApiKey.trim(),
        geminiModel: tempGeminiModel,
        ollamaEndpoint: tempOllamaEndpoint.trim(),
        ollamaModel: tempOllamaModel.trim(),
        provider: tempProvider,
      });
      const res = await aiOrchestrator.testActiveProviderConnection();
      if (res.success) {
        setTestResult(`✓ ${res.message}`);
      } else {
        setTestResult(`✖ ${res.message}`);
      }
    } catch (err: any) {
      setTestResult(`✖ Error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Generate Realm Illustrator Art
  const handleGenerateCompanionArt = async () => {
    if (!artPrompt.trim()) return;
    setIsGeneratingArt(true);
    try {
      const url = await ImageGenerator.generateImage({
        prompt: artPrompt.trim(),
        style: artStyle,
        aspectRatio: artRatio,
      });
      if (url) {
        setArtGeneratedUrl(url);
      }
    } catch (e: any) {
      alert(`Art generation failed: ${e.message}`);
    } finally {
      setIsGeneratingArt(false);
    }
  };

  const handleAttachCoverToArticle = () => {
    if (!artGeneratedUrl || !selectedTargetArticleId) return;
    updateArticle(selectedTargetArticleId, {
      coverImageUrl: artGeneratedUrl,
      coverImagePrompt: artPrompt,
    });
    setAttachedSuccess(true);
    setTimeout(() => setAttachedSuccess(false), 2000);
  };

  // Parse [[WikiLinks]] in message text
  const renderMessageTextWithLinks = (text: string) => {
    const parts = text.split(/(\[\[.*?\]\])/g);
    return parts.map((part, idx) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const title = part.slice(2, -2);
        return (
          <button
            key={idx}
            onClick={() => {
              setActiveView('manuscript');
              onClose();
            }}
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition-colors mx-0.5 cursor-pointer"
            title={`View lore entry for ${title}`}
          >
            @{title}
          </button>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 bg-zinc-900/80 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <GiBrain className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm text-zinc-100 flex items-center gap-2">
              <span>Worldbuilding AI Companion</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                {aiSettings.provider.toUpperCase()}
              </span>
            </h2>
            <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
              <span>{activeWorld.name}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-amber-400">{activeWorld.genre}</span>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="p-1 rounded text-zinc-500 hover:text-zinc-300 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="grid grid-cols-5 border-b border-zinc-800 bg-zinc-900/40 text-xs">
        <button
          onClick={() => setActiveTab('chat')}
          className={`py-2 flex items-center justify-center gap-1 font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'chat'
              ? 'border-amber-500 text-amber-300 bg-zinc-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Ask World</span>
        </button>
        <button
          onClick={handleTriggerGriller}
          className={`py-2 flex items-center justify-center gap-1 font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'griller'
              ? 'border-amber-500 text-amber-300 bg-zinc-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          title="Arthur Vance Socratic 5-Whys Audit"
        >
          <GiFlame className="w-3.5 h-3.5 text-rose-500" />
          <span>Grill Me</span>
        </button>
        <button
          onClick={handleTriggerDoctor}
          className={`py-2 flex items-center justify-center gap-1 font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'doctor'
              ? 'border-amber-500 text-amber-300 bg-zinc-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          title="Dynamic World Health Audit & Contradiction Scanner"
        >
          <GiHealthNormal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Doctor</span>
        </button>
        <button
          onClick={() => setActiveTab('illustrator')}
          className={`py-2 flex items-center justify-center gap-1 font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'illustrator'
              ? 'border-amber-500 text-amber-300 bg-zinc-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          title="AI Realm Concept Art Studio"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Illustrate</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-2 flex items-center justify-center gap-1 font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'border-amber-500 text-amber-300 bg-zinc-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <GiCog className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>

      {/* Main Tab View Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Chat / Ask World Tab & Griller Output */}
        {(activeTab === 'chat' || activeTab === 'griller') && (
          <div className="flex-1 flex flex-col gap-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3.5 rounded-xl text-xs leading-relaxed max-w-[90%] ${
                  msg.sender === 'user'
                    ? 'ml-auto bg-amber-500/15 border border-amber-500/30 text-amber-100'
                    : 'mr-auto bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-md'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1 font-sans">
                  <span className="font-bold text-amber-400">
                    {msg.sender === 'user' ? 'You' : msg.persona ? `🔥 ${msg.persona}` : 'World Archivist'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-line font-serif">
                  {renderMessageTextWithLinks(msg.text)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="mr-auto p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-amber-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Consulting vault archives & causal matrices...</span>
              </div>
            )}
          </div>
        )}

        {/* Dynamic World Doctor Diagnostic Tab */}
        {activeTab === 'doctor' && (
          <div className="flex flex-col gap-4 text-xs font-sans">
            {isLoading ? (
              <div className="p-8 text-center text-amber-400 flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>Scanning timeline events, cross-links, and causal logic...</span>
              </div>
            ) : doctorReport ? (
              <>
                {/* Health Score Gauge */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500">World Health Score</span>
                    <div className="text-3xl font-heading font-bold text-emerald-400 mt-1">
                      {doctorReport.healthScore} <span className="text-base text-zinc-500">/ 100</span>
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-xs ${
                    doctorReport.healthScore >= 90
                      ? 'border-emerald-500/40 border-t-emerald-400 text-emerald-300'
                      : doctorReport.healthScore >= 75
                      ? 'border-amber-500/40 border-t-amber-400 text-amber-300'
                      : 'border-rose-500/40 border-t-rose-400 text-rose-300'
                  }`}>
                    {doctorReport.healthScore >= 90 ? 'A' : doctorReport.healthScore >= 75 ? 'B' : 'C'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-300 leading-relaxed">
                  <span className="font-bold text-amber-400 block mb-1">Executive Diagnostic:</span>
                  {doctorReport.executiveSummary}
                </div>

                {/* Contradictions list */}
                <div>
                  <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block mb-2">
                    Timeline & Lore Contradictions:
                  </span>
                  {doctorReport.contradictions.length > 0 ? (
                    doctorReport.contradictions.map((c, i) => (
                      <div key={i} className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40 text-zinc-300 space-y-1 mb-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-300">{c.title}</span>
                          <span className="text-[10px] font-bold px-1.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                            {c.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-zinc-400">{c.description}</p>
                        <p className="text-emerald-400 text-[11px] font-semibold pt-1">
                          💡 Recommended Fix: {c.suggestedFix}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300">
                      ✓ No contradictory records detected across active articles.
                    </div>
                  )}
                </div>

                {/* Stubs to flesh out */}
                <div>
                  <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block mb-2">
                    Unwritten Stubs to Flesh Out:
                  </span>
                  {doctorReport.stubsToFleshOut.map((stub, i) => (
                    <div key={i} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-bold text-amber-300">{stub.title}</span>
                        <p className="text-zinc-400 text-[11px] mt-0.5">{stub.proposedHook}</p>
                      </div>
                      <button
                        onClick={() => handleFleshOutDoctorStub(stub.title, stub.proposedHook)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold hover:bg-amber-500/30 whitespace-nowrap cursor-pointer transition-colors"
                      >
                        <GiSparkles className="w-3 h-3 text-amber-400" />
                        <span>Flesh Out</span>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center p-8 text-zinc-500 space-y-3">
                <GiHealthNormal className="w-10 h-10 text-zinc-700 mx-auto" />
                <p>Run the World Doctor to analyze causal contradictions, timeline paradoxes, and missing stubs.</p>
                <button
                  onClick={handleTriggerDoctor}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  Run Comprehensive Audit
                </button>
              </div>
            )}
          </div>
        )}

        {/* Illustrator Tab */}
        {activeTab === 'illustrator' && (
          <div className="flex flex-col gap-4 text-xs font-sans">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
              <span className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Realm Illustrator
              </span>
              <p className="text-[11px] leading-relaxed text-zinc-300">
                Generate high-resolution visual depictions for characters, castles, artifacts, or factions in {activeWorld.name}.
              </p>
            </div>

            <div>
              <label className="text-zinc-300 font-semibold block mb-1">Visual Prompt</label>
              <textarea
                rows={3}
                value={artPrompt}
                onChange={(e) => setArtPrompt(e.target.value)}
                placeholder="Describe your subject... (e.g. Ancient marble fortress half-submerged in eerie glowing astral bog, dark fantasy oil painting)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-semibold block mb-1.5">Aesthetic Style</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(IMAGE_STYLE_PRESETS) as ImageStylePreset[]).map((key) => {
                  const meta = IMAGE_STYLE_PRESETS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setArtStyle(key)}
                      className={`p-2 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                        artStyle === key
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="truncate">{meta.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-zinc-300 font-semibold block mb-1.5">Aspect Ratio</label>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { id: 'banner', label: 'Banner' },
                  { id: 'cinematic', label: '16:9' },
                  { id: 'square', label: '1:1' },
                  { id: 'portrait', label: '3:4' },
                ] as { id: ImageAspectRatio; label: string }[]).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setArtRatio(r.id)}
                    className={`py-1.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
                      artRatio === r.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateCompanionArt}
              disabled={isGeneratingArt || !artPrompt.trim()}
              className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isGeneratingArt ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Artwork...</span>
                </>
              ) : (
                <>
                  <GiPhotoCamera className="w-4 h-4" />
                  <span>Generate Art</span>
                </>
              )}
            </button>

            {artGeneratedUrl && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-3 mt-1">
                <div className="rounded-lg overflow-hidden border border-zinc-800 max-h-56 relative group">
                  <img src={artGeneratedUrl} alt="Generated Art" className="w-full h-full object-cover" />
                </div>

                <div className="space-y-2 pt-1 border-t border-zinc-800">
                  <span className="text-[11px] font-semibold text-zinc-300 block">
                    Attach as Cover to Article:
                  </span>
                  <div className="flex gap-2">
                    <select
                      value={selectedTargetArticleId}
                      onChange={(e) => setSelectedTargetArticleId(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer truncate"
                    >
                      {articles.map((art) => (
                        <option key={art.id} value={art.id}>
                          {art.title} ({art.category})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAttachCoverToArticle}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {attachedSuccess ? 'Attached!' : 'Set Cover'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="flex flex-col gap-4 text-xs font-sans">
            {/* Provider Selector Segmented Bar */}
            <div>
              <label className="text-zinc-300 font-semibold block mb-1.5">Active AI Provider</label>
              <div className="grid grid-cols-3 gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setTempProvider('gemini')}
                  className={`py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    tempProvider === 'gemini'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  Gemini Cloud
                </button>
                <button
                  type="button"
                  onClick={() => setTempProvider('ollama')}
                  className={`py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    tempProvider === 'ollama'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  Local Ollama
                </button>
                <button
                  type="button"
                  onClick={() => setTempProvider('simulation')}
                  className={`py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    tempProvider === 'simulation'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  Zero-Key Mode
                </button>
              </div>
            </div>

            {/* Provider specific settings */}
            {tempProvider === 'gemini' && (
              <div className="space-y-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Google Gemini API Key</label>
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    Free keys available from Google AI Studio. Stored securely in browser localStorage.
                  </span>
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Gemini Model</label>
                  <select
                    value={tempGeminiModel}
                    onChange={(e) => setTempGeminiModel(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest & Recommended)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
                  </select>
                </div>
              </div>
            )}

            {tempProvider === 'ollama' && (
              <div className="space-y-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Ollama Local Endpoint</label>
                  <input
                    type="text"
                    value={tempOllamaEndpoint}
                    onChange={(e) => setTempOllamaEndpoint(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    Private & offline. Start Ollama with 'ollama serve' on your machine.
                  </span>
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Local Model Name</label>
                  <input
                    type="text"
                    value={tempOllamaModel}
                    onChange={(e) => setTempOllamaModel(e.target.value)}
                    placeholder="llama3.2, mistral, gemma2..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Tone Preset */}
            <div>
              <label className="text-zinc-300 font-semibold block mb-1">Tone & Aesthetic Preset</label>
              <select
                value={tempTone}
                onChange={(e) => setTempTone(e.target.value as TonePreset)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="high_fantasy">High Fantasy (Lyrical, epic wonder)</option>
                <option value="grimdark">Grimdark (Gritty, visceral tension)</option>
                <option value="scifi">Sci-Fi / Aetherpunk (Techno-speculative)</option>
                <option value="gothic">Gothic Horror (Dread & melancholia)</option>
                <option value="academic">Academic Scholar (Objective archival)</option>
                <option value="mythic">Mythic Legend (Biblical grand scale)</option>
              </select>
            </div>

            {/* Craft Purist "No-Generate Mode" */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <div>
                <span className="font-semibold text-zinc-200 block text-xs">Craft Purist Mode (No-Generate)</span>
                <span className="text-[10px] text-zinc-500">
                  Outputs structured template outlines & writing prompts only. Never generates AI prose.
                </span>
              </div>
              <input
                type="checkbox"
                checked={tempNoGenerate}
                onChange={(e) => setTempNoGenerate(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Connection Test feedback */}
            {testResult && (
              <div className={`p-2.5 rounded-lg border text-xs font-mono ${
                testResult.startsWith('✓')
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}>
                {testResult}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold border border-zinc-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
                <span>Test Connection</span>
              </button>

              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <GiCheckMark className="w-3.5 h-3.5" />
                <span>{isSavedRecently ? 'Saved!' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Bottom Chat Prompt Input (Only in Chat mode) */}
      {(activeTab === 'chat' || activeTab === 'griller') && (
        <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-zinc-900/90 flex gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask about factions, history, secrets, or plot hooks..."
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="p-2.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </aside>
  );
};
