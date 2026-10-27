import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Copy, 
  Check, 
  ExternalLink, 
  Tv, 
  Settings, 
  Volume2, 
  Radio, 
  History, 
  BookOpen, 
  Sparkles, 
  Send,
  AlertCircle,
  RefreshCw,
  Sliders,
  DollarSign,
  MessageSquare
} from 'lucide-react';
import { ObsOverlay } from './ObsOverlay';
import { SetupGuide } from './SetupGuide';
import { ParsedDonation } from '../utils/abaParser';
import { speakKhmerTts } from '../utils/ttsHelper';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'preview' | 'guide' | 'telegram' | 'history'>('preview');
  const [copied, setCopied] = useState(false);
  
  // App Config
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('-5214008501');
  const [thankPrefix, setThankPrefix] = useState('អរគុណ មេ');
  const [verb, setVerb] = useState('បានឧបត្ថម្ភ');
  const [glowColor, setGlowColor] = useState('#00d68f');
  const [fontSize, setFontSize] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  
  // Status & Data
  const [listenerRunning, setListenerRunning] = useState(false);
  const [listenerError, setListenerError] = useState('');
  const [donations, setDonations] = useState<ParsedDonation[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [customTestModal, setCustomTestModal] = useState(false);
  const [customName, setCustomName] = useState('zaion');
  const [customAmount, setCustomAmount] = useState('1.00');
  const [customCurrency, setCustomCurrency] = useState<'USD' | 'KHR'>('USD');
  const [customRemark, setCustomRemark] = useState('This is a test message from your viewer.');
  
  // Raw message test input
  const [rawInput, setRawInput] = useState('$1.00 paid by zaion (*123) on Oct 27, 01:41 PM via ABA PAY. Remark: This is a test message from your viewer.');
  const [parseResult, setParseResult] = useState<ParsedDonation | null>(null);

  // Fetch initial config and donation history
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.config) {
          setBotToken(data.config.botToken || '');
          setChatId(data.config.chatId || '-5214008501');
          setThankPrefix(data.config.thankPrefix || 'អរគុណ មេ');
          setVerb(data.config.verb || 'បានឧបត្ថម្ភ');
          setGlowColor(data.config.glowColor || '#00d68f');
        }
        if (data.listenerStatus) {
          setListenerRunning(data.listenerStatus.running);
          setListenerError(data.listenerStatus.lastError || '');
        }
      })
      .catch(err => console.warn('Config fetch error:', err));

    fetch('/api/donations')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDonations(data);
      })
      .catch(err => console.warn('Donations fetch error:', err));
  }, []);

  const overlayUrl = `${window.location.origin}/?view=overlay`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken,
          chatId,
          thankPrefix,
          verb,
          glowColor,
          soundEnabled,
          ttsEnabled,
        }),
      });
      const data = await res.json();
      if (data.listenerStatus) {
        setListenerRunning(data.listenerStatus.running);
        setListenerError(data.listenerStatus.lastError || '');
      }
    } catch (err) {
      console.error('Save config error:', err);
    }
  };

  const handleToggleListener = async () => {
    const nextAction = listenerRunning ? 'stop' : 'start';
    try {
      const res = await fetch('/api/telegram/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextAction }),
      });
      const data = await res.json();
      if (data.listenerStatus) {
        setListenerRunning(data.listenerStatus.running);
        setListenerError(data.listenerStatus.lastError || '');
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const triggerTestAlert = async (name: string, amount: number, remark?: string) => {
    setIsTriggering(true);
    try {
      const res = await fetch('/api/test-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorName: name,
          amount,
          currency: 'USD',
          remark,
        }),
      });
      const data = await res.json();
      if (data.donation) {
        setDonations(prev => [data.donation, ...prev]);
      }
    } catch (err) {
      console.error('Trigger test alert error:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  const testKhmerVoiceOnly = () => {
    const phrase = `${thankPrefix} zaion ${verb} 1 ដុល្លារ This is a test message from your viewer.`;
    speakKhmerTts(phrase, { volume: 1.0 });
  };

  const handleParseRawText = async (trigger: boolean = false) => {
    try {
      const res = await fetch('/api/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawInput, triggerAlert: trigger }),
      });
      const data = await res.json();
      setParseResult(data.parsed);
      if (trigger && data.parsed) {
        setDonations(prev => [data.parsed, ...prev]);
      }
    } catch (err) {
      console.error('Parse error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Tv className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight text-white">
                  ABA PayWay OBS Alert
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE OVERLAY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Telegram ABA Bot Reader • Khmer TTS Voice • Emerald Glow
              </p>
            </div>
          </div>

          {/* Quick Browser Source Link */}
          <div className="w-full md:w-auto flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 pl-3">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline truncate max-w-[240px]">
              {overlayUrl}
            </span>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-sm"
              title="Copy OBS Browser Source URL"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy OBS URL'}</span>
            </button>
            <a
              href="/?view=overlay"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Open Overlay in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Quick Action Test Bar */}
      <section className="bg-slate-900/50 border-b border-slate-800/80 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Quick Test Alerts:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => triggerTestAlert('zaion', 1.00, 'This is a test message from your viewer.')}
              disabled={isTriggering}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition-colors"
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <span>Test $1.00 (zaion)</span>
            </button>

            <button
              onClick={() => triggerTestAlert('HUN CHHING CHHING', 0.50)}
              disabled={isTriggering}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition-colors"
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <span>Test $0.50 (HUN CHHING CHHING)</span>
            </button>

            <button
              onClick={testKhmerVoiceOnly}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-400" />
              <span>Test Khmer Voice</span>
            </button>

            <button
              onClick={() => setCustomTestModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Custom Donation...</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'preview'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Live Preview & Customizer</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'guide'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Setup Instructions</span>
          </button>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'telegram'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Telegram Bot Listener</span>
            {listenerRunning && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Donations ({donations.length})</span>
          </button>
        </div>

        {/* TAB 1: Live Preview & Customizer */}
        {activeTab === 'preview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive Preview Frame */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 text-xs font-mono text-slate-400">
                      OBS Canvas Preview (1920 × 1080)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Transparent Background
                  </span>
                </div>

                {/* Simulated OBS Canvas */}
                <div 
                  className="relative w-full aspect-video bg-black flex items-center justify-center p-6 border-b border-slate-800 select-none overflow-hidden"
                  style={{
                    backgroundImage: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.4) 0%, #000 100%)',
                  }}
                >
                  <ObsOverlay
                    isStandalone={false}
                    glowColor={glowColor}
                    fontSize={fontSize}
                    showSampleIfIdle={true}
                  />
                </div>

                <div className="p-4 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Exact styling matched to screenshot: Khmer font & emerald glow</span>
                  </div>
                  <button
                    onClick={() => triggerTestAlert('zaion', 1.00, 'This is a test message from your viewer.')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all"
                  >
                    Trigger Animation & TTS
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Customization Controls */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Overlay Appearance</span>
                </h3>

                {/* Glow Color Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    Amount Glow Color (Default: Emerald Green)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: 'Emerald', hex: '#00d68f' },
                      { name: 'Cyan', hex: '#00f0ff' },
                      { name: 'Golden', hex: '#f59e0b' },
                      { name: 'Purple', hex: '#a855f7' },
                    ].map(c => (
                      <button
                        key={c.hex}
                        onClick={() => {
                          setGlowColor(c.hex);
                          handleSaveConfig();
                        }}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                          glowColor === c.hex
                            ? 'bg-slate-800 border-white text-white font-bold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full shadow-md"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-[10px]">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Khmer Text Wording */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Khmer Thank Prefix
                    </label>
                    <input
                      type="text"
                      value={thankPrefix}
                      onChange={(e) => setThankPrefix(e.target.value)}
                      onBlur={handleSaveConfig}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-khmer focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Khmer Donation Verb
                    </label>
                    <input
                      type="text"
                      value={verb}
                      onChange={(e) => setVerb(e.target.value)}
                      onBlur={handleSaveConfig}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-khmer focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Font Scaling */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Size Scale</span>
                    <span className="font-mono text-emerald-400">{Math.round(fontSize * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.4"
                    step="0.05"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Audio Toggles */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      Khmer Voice TTS
                    </span>
                    <input
                      type="checkbox"
                      checked={ttsEnabled}
                      onChange={(e) => {
                        setTtsEnabled(e.target.checked);
                        handleSaveConfig();
                      }}
                      className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Alert Chime Sound
                    </span>
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => {
                        setSoundEnabled(e.target.checked);
                        handleSaveConfig();
                      }}
                      className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveConfig}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Setup Guide */}
        {activeTab === 'guide' && (
          <SetupGuide />
        )}

        {/* TAB 3: Telegram Bot Listener Configuration */}
        {activeTab === 'telegram' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    <Radio className="w-5 h-5 text-emerald-400" />
                    <span>Telegram Bot Configuration</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure your bot to poll notifications from your ABA Alert group.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    listenerRunning
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${listenerRunning ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                    <span>{listenerRunning ? 'Listener Active' : 'Listener Idle'}</span>
                  </span>

                  <button
                    onClick={handleToggleListener}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      listenerRunning
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                    }`}
                  >
                    {listenerRunning ? 'Stop Listener' : 'Start Listener'}
                  </button>
                </div>
              </div>

              {listenerError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Telegram Listener Notice: </span>
                    <span>{listenerError}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Telegram Bot Token (from @BotFather)
                  </label>
                  <input
                    type="password"
                    placeholder="e.g. 7123456789:AAH..."
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Send <code className="text-slate-400">/token</code> to @BotFather to retrieve your token.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Telegram Chat / Group ID
                  </label>
                  <input
                    type="text"
                    placeholder="-5214008501"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pre-filled with your group ID from screenshot: <code className="text-emerald-400">-5214008501</code>
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleSaveConfig}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md"
                >
                  Save & Apply Settings
                </button>
              </div>
            </div>

            {/* Raw Message Simulator */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>ABA Message Parser & Simulator</span>
              </h3>
              <p className="text-xs text-slate-400">
                Paste any message received from ABA PayWay bot to test how our parser extracts donor, amount, and remark:
              </p>

              <textarea
                rows={3}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                placeholder="Paste ABA bot notification text here..."
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleParseRawText(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors"
                >
                  Inspect Parsed Data
                </button>
                <button
                  onClick={() => handleParseRawText(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-md flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Parse & Send to OBS Overlay</span>
                </button>
              </div>

              {parseResult && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="text-emerald-400 font-bold text-sm">✓ Successfully Parsed!</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-300">
                    <div><span className="text-slate-500">Donor:</span> <span className="text-white font-bold">{parseResult.donorName}</span></div>
                    <div><span className="text-slate-500">Amount:</span> <span className="text-emerald-400 font-bold">{parseResult.formattedAmount}</span></div>
                    <div><span className="text-slate-500">Trx ID:</span> <span className="text-white">{parseResult.trxId || 'N/A'}</span></div>
                    <div><span className="text-slate-500">APV:</span> <span className="text-white">{parseResult.apv || 'N/A'}</span></div>
                  </div>
                  {parseResult.remark && (
                    <div><span className="text-slate-500">Remark:</span> <span className="text-teal-300">{parseResult.remark}</span></div>
                  )}
                  <div className="pt-2 border-t border-slate-900 text-slate-400">
                    <span className="text-slate-500">Khmer TTS Output: </span>
                    <span className="text-white font-khmer">{parseResult.ttsScript}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Donation History */}
        {activeTab === 'history' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Recent Donation Activity</span>
              </h3>
              <span className="text-xs text-slate-400">
                {donations.length} total captured
              </span>
            </div>

            {donations.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No donations received yet. Trigger a test alert to see it appear here!
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {donations.map((d) => (
                  <div key={d.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{d.donorName}</span>
                        <span className="font-khmer text-slate-400">បានឧបត្ថម្ភ</span>
                        <span className="font-black text-emerald-400 font-mono text-sm">{d.formattedAmount}</span>
                      </div>
                      {d.remark && (
                        <p className="text-slate-300 text-xs italic">
                          "{d.remark}"
                        </p>
                      )}
                      <div className="text-[10px] text-slate-500 font-mono">
                        {d.dateStr || new Date(d.timestamp).toLocaleTimeString()} {d.trxId ? `• Trx: ${d.trxId}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => triggerTestAlert(d.donorName, d.amount, d.remark)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                      >
                        <Play className="w-3 h-3 text-emerald-400" />
                        <span>Replay on OBS</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Custom Test Modal */}
      {customTestModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Simulate Custom Donation Alert</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Donor Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Currency
                  </label>
                  <select
                    value={customCurrency}
                    onChange={(e) => setCustomCurrency(e.target.value as 'USD' | 'KHR')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="KHR">KHR (៛)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Remark / Message
                </label>
                <textarea
                  rows={2}
                  value={customRemark}
                  onChange={(e) => setCustomRemark(e.target.value)}
                  placeholder="e.g. Good luck on your stream!"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCustomTestModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  triggerTestAlert(customName, parseFloat(customAmount) || 1, customRemark);
                  setCustomTestModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md"
              >
                Send Alert Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
