
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { STAGES, STAGE_INFO } from '@/lib/constants';
import { ChevronRight, RotateCcw, ArrowRight, Languages } from 'lucide-react';
import VideoUploader from '@/components/VideoUploader';
import LanguageSelector from '@/components/LanguageSelector';
import TranslationProcess from '@/components/TranslationProcess';
import VideoPlayer from '@/components/VideoPlayer';
import useTranslation from '@/hooks/useTranslation';

const Index = () => {
  const {
    state,
    setSourceLanguage,
    setTargetLanguage,
    setVideoFile,
    translate,
    reset,
    getProcessSteps,
    canTranslate
  } = useTranslation();
  
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const stageInfo = STAGE_INFO[state.stage];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 bg-fixed overflow-hidden">
      {/* Decorative elements */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-radial from-primary/5 to-transparent" />
      </div>
      
      <header className={cn(
        "fixed top-0 left-0 right-0 z-10 transition-all duration-300",
        isScrolled ? "bg-background/80 backdrop-blur-md shadow-sm" : ""
      )}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Languages className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-medium">VideoTranslate</h1>
          </div>
          
          {state.stage !== STAGES.UPLOAD && (
            <button
              onClick={reset}
              className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-foreground button-transition"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </header>
      
      <main className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel p-6 md:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-medium">{stageInfo.title}</h2>
              <p className="text-muted-foreground mt-1">{stageInfo.description}</p>
            </div>
            
            {state.stage === STAGES.UPLOAD && (
              <div className="space-y-8 animate-fade-in">
                <VideoUploader
                  onFileSelected={setVideoFile}
                  file={state.videoFile}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <LanguageSelector
                    label="Original Language"
                    value={state.sourceLanguage}
                    onChange={setSourceLanguage}
                    excludedCode={state.targetLanguage?.code}
                  />
                  
                  <LanguageSelector
                    label="Target Language"
                    value={state.targetLanguage}
                    onChange={setTargetLanguage}
                    excludedCode={state.sourceLanguage?.code}
                  />
                </div>
                
                <div className="pt-4 flex justify-center">
                  <button
                    onClick={translate}
                    disabled={!canTranslate()}
                    className={cn(
                      "flex items-center space-x-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium button-transition",
                      canTranslate() ? "hover:shadow-md hover:scale-105" : "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <span>Translate Video</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            
            {(state.stage === STAGES.TRANSCRIBING || 
              state.stage === STAGES.TRANSLATING || 
              state.stage === STAGES.GENERATING_AUDIO || 
              state.stage === STAGES.PROCESSING_VIDEO) && (
              <div className="animate-fade-in">
                <TranslationProcess
                  steps={getProcessSteps()}
                  currentStep={state.stage}
                  progress={state.progress}
                />
              </div>
            )}
            
            {state.stage === STAGES.COMPLETED && state.translatedVideoUrl && (
              <div className="animate-fade-in">
                <div className="mb-8">
                  <VideoPlayer src={state.translatedVideoUrl} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-panel p-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Original Text ({state.sourceLanguage?.name})</h3>
                    <p className="text-sm">{state.transcription}</p>
                  </div>
                  
                  <div className="glass-panel p-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Translated Text ({state.targetLanguage?.name})</h3>
                    <p className="text-sm">{state.translation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Powered by advanced AI translation models
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
