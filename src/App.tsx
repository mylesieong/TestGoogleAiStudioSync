/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Image as ImageIcon, 
  Video, 
  Download, 
  Loader2, 
  ArrowRight, 
  Maximize2,
  RefreshCw,
  Palette,
  Type,
  Layout,
  AlertCircle,
  Key
} from "lucide-react";

// Types
type ImageSize = "1K" | "2K" | "4K";
type AspectRatio = "16:9" | "9:16";

interface GenerationState {
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
  error: string | null;
  logoUrl: string | null;
  videoUrl: string | null;
  statusMessage: string;
}

export default function App() {
  const [description, setDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [state, setState] = useState<GenerationState>({
    isGeneratingImage: false,
    isGeneratingVideo: false,
    error: null,
    logoUrl: null,
    videoUrl: null,
    statusMessage: '',
  });
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  // Check for API key on mount
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Assume success as per guidelines
    }
  };

  const generateLogo = async () => {
    if (!description) return;
    
    setState(prev => ({ 
      ...prev, 
      isGeneratingImage: true, 
      error: null, 
      logoUrl: null, 
      videoUrl: null,
      statusMessage: 'Crafting your brand identity...' 
    }));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Professional logo design for a company named "${companyName}". Description: ${description}. The logo should be clean, modern, and high-quality. Minimalist aesthetic, vector style, white background.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: imageSize
          }
        },
      });

      let imageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setState(prev => ({ ...prev, isGeneratingImage: false, logoUrl: imageUrl, statusMessage: '' }));
      } else {
        throw new Error("No image was generated. Please try a different description.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
      }
      setState(prev => ({ 
        ...prev, 
        isGeneratingImage: false, 
        error: err.message || "Failed to generate logo. Please check your API key and try again." 
      }));
    }
  };

  const animateLogo = async () => {
    if (!state.logoUrl) return;

    setState(prev => ({ 
      ...prev, 
      isGeneratingVideo: true, 
      error: null, 
      statusMessage: 'Bringing your logo to life...' 
    }));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = state.logoUrl.split(',')[1];
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Animate this logo in a professional, elegant way. Subtle motion, smooth transitions, high-end commercial feel. The logo should gracefully move or have light effects.`,
        image: {
          imageBytes: base64Data,
          mimeType: 'image/png',
        },
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: aspectRatio
        }
      });

      // Polling for completion
      const statusMessages = [
        "Analyzing logo structure...",
        "Simulating motion paths...",
        "Rendering cinematic frames...",
        "Finalizing animation...",
        "Almost there..."
      ];
      let messageIndex = 0;

      while (!operation.done) {
        setState(prev => ({ ...prev, statusMessage: statusMessages[messageIndex % statusMessages.length] }));
        messageIndex++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': process.env.GEMINI_API_KEY || '',
          },
        });
        const blob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(blob);
        setState(prev => ({ ...prev, isGeneratingVideo: false, videoUrl, statusMessage: '' }));
      } else {
        throw new Error("Video generation failed to return a result.");
      }
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ 
        ...prev, 
        isGeneratingVideo: false, 
        error: err.message || "Failed to animate logo." 
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-xl tracking-tight">BrandMotion</span>
          </div>
          
          {!hasApiKey && (
            <button 
              onClick={handleOpenKeySelector}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-emerald-400 transition-colors"
            >
              <Key className="w-4 h-4" />
              Connect API Key
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-8">
          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Design Studio</h2>
              <p className="text-white/50 text-sm">Describe your vision and we'll handle the rest.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest font-semibold text-white/40">Company Name</label>
                <input 
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Lumina Tech"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest font-semibold text-white/40">Logo Concept</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your logo style, symbols, and mood..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest font-semibold text-white/40">Image Size</label>
                  <select 
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value as ImageSize)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                  >
                    <option value="1K">1K Resolution</option>
                    <option value="2K">2K Resolution</option>
                    <option value="4K">4K Resolution</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest font-semibold text-white/40">Video Aspect</label>
                  <select 
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                  >
                    <option value="16:9">16:9 Landscape</option>
                    <option value="9:16">9:16 Portrait</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={generateLogo}
                disabled={state.isGeneratingImage || !description || !hasApiKey}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/30 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group"
              >
                {state.isGeneratingImage ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Generate Logo
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              
              {!hasApiKey && (
                <p className="text-center text-xs text-amber-400/80">
                  Please connect your Gemini API key to start designing.
                </p>
              )}
            </div>
          </section>

          {state.error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-400 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{state.error}</p>
            </motion.div>
          )}
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-8">
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden min-h-[600px] flex flex-col relative group">
            <AnimatePresence mode="wait">
              {!state.logoUrl && !state.isGeneratingImage ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4"
                >
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <ImageIcon className="w-10 h-10 text-white/20" />
                  </div>
                  <h3 className="text-xl font-medium">Your Masterpiece Awaits</h3>
                  <p className="text-white/40 max-w-md">Enter your company details and click generate to see your logo come to life.</p>
                </motion.div>
              ) : state.isGeneratingImage || state.isGeneratingVideo ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6"
                >
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <Sparkles className="w-8 h-8 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium animate-pulse">{state.statusMessage}</p>
                    <p className="text-white/40 text-sm">This might take a few moments...</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex items-center justify-center p-8 bg-white"
                >
                  {state.videoUrl ? (
                    <video 
                      src={state.videoUrl} 
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                      className={`max-w-full max-h-full rounded-xl shadow-2xl ${aspectRatio === '9:16' ? 'h-[500px]' : 'w-full'}`}
                    />
                  ) : (
                    <img 
                      src={state.logoUrl!} 
                      alt="Generated Logo" 
                      className="max-w-full max-h-full object-contain shadow-2xl rounded-xl"
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions Overlay */}
            {state.logoUrl && !state.isGeneratingImage && !state.isGeneratingVideo && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
              >
                {!state.videoUrl && (
                  <button 
                    onClick={animateLogo}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors"
                  >
                    <Video className="w-5 h-5" />
                    Animate Logo
                  </button>
                )}
                
                <a 
                  href={state.videoUrl || state.logoUrl!} 
                  download={`logo-${companyName || 'brand'}.${state.videoUrl ? 'mp4' : 'png'}`}
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download
                </a>

                {state.videoUrl && (
                  <button 
                    onClick={() => setState(prev => ({ ...prev, videoUrl: null }))}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                    title="View Static Logo"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              { icon: ImageIcon, title: "High Resolution", desc: "Up to 4K resolution for professional printing." },
              { icon: Video, title: "AI Animation", desc: "Dynamic motion graphics powered by Veo." },
              { icon: Layout, title: "Modern Styles", desc: "Clean, minimalist aesthetics for today's brands." }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-emerald-500" />
                </div>
                <h4 className="font-semibold">{feature.title}</h4>
                <p className="text-white/40 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Powered by Gemini & Veo</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-white/40">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Billing Info</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
