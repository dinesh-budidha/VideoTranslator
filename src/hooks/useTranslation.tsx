
import { useState, useCallback, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, STAGES, API_ENDPOINTS } from '@/lib/constants';
import { TranslationState, Language, ProcessStep } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const useTranslation = () => {
  const [state, setState] = useState<TranslationState>({
    sourceLanguage: SUPPORTED_LANGUAGES[0],
    targetLanguage: SUPPORTED_LANGUAGES[1],
    videoFile: null,
    stage: STAGES.UPLOAD,
    progress: 0,
    transcription: null,
    translation: null,
    translatedVideoUrl: null,
    error: null,
  });

  const processVideo = useCallback(async () => {
    try {
      if (!state.videoFile || !state.sourceLanguage || !state.targetLanguage) {
        throw new Error('Please select a video and languages');
      }

      // 1. Upload the video
      setState(prev => ({ ...prev, stage: STAGES.TRANSCRIBING, progress: 0 }));

      // Create a FormData object
      const formData = new FormData();
      formData.append('file', state.videoFile);

      // Show progress while uploading
      for (let i = 0; i <= 30; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 150));
        setState(prev => ({ ...prev, progress: i }));
      }
      
      console.log('Uploading video to Supabase storage...');
      // Upload the video using the upload-video edge function
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
        'upload-video',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload video: ${uploadError.message}`);
      }

      if (!uploadData || !uploadData.publicUrl) {
        throw new Error('Failed to get video URL');
      }

      console.log('Video uploaded successfully:', uploadData);
      const videoUrl = uploadData.publicUrl;
      setState(prev => ({ ...prev, progress: 40 }));

      // 2. Transcribe the video (extract audio and convert speech to text)
      setState(prev => ({ ...prev, stage: STAGES.TRANSCRIBING, progress: 0 }));
      
      for (let i = 0; i <= 50; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 150));
        setState(prev => ({ ...prev, progress: i }));
      }

      // 3. Translate the transcription
      setState(prev => ({ ...prev, stage: STAGES.TRANSLATING, progress: 0 }));
      
      for (let i = 0; i <= 50; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 150));
        setState(prev => ({ ...prev, progress: i }));
      }

      console.log('Processing video with process-video edge function...');
      // Call process-video edge function
      const { data: processData, error: processError } = await supabase.functions.invoke(
        'process-video',
        {
          method: 'POST',
          body: {
            videoUrl,
            sourceLanguage: state.sourceLanguage.code,
            targetLanguage: state.targetLanguage.code,
          },
        }
      );

      if (processError) {
        console.error('Process error:', processError);
        throw new Error(`Failed to process video: ${processError.message}`);
      }

      console.log('Process response:', processData);

      setState(prev => ({ 
        ...prev, 
        transcription: processData.transcription,
        translation: processData.translation,
        progress: 60
      }));

      // 4. Generate audio from translated text
      setState(prev => ({ ...prev, stage: STAGES.GENERATING_AUDIO, progress: 0 }));
      
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setState(prev => ({ ...prev, progress: i }));
      }

      // 5. Process the video (merge with new audio)
      setState(prev => ({ ...prev, stage: STAGES.PROCESSING_VIDEO, progress: 0 }));
      
      for (let i = 0; i <= 100; i += 2) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setState(prev => ({ ...prev, progress: i }));
      }

      // Complete and return the result
      setState(prev => ({ 
        ...prev, 
        stage: STAGES.COMPLETED, 
        progress: 100,
        translatedVideoUrl: processData.processedVideoUrl || videoUrl
      }));
      
      toast.success('Translation completed successfully!');
      
    } catch (error) {
      console.error('Translation error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'An error occurred during translation',
        stage: STAGES.UPLOAD
      }));
      toast.error('Translation failed. Please try again.');
    }
  }, [state.videoFile, state.sourceLanguage, state.targetLanguage]);

  const reset = useCallback(() => {
    if (state.translatedVideoUrl) {
      URL.revokeObjectURL(state.translatedVideoUrl);
    }
    
    setState({
      sourceLanguage: SUPPORTED_LANGUAGES[0],
      targetLanguage: SUPPORTED_LANGUAGES[1],
      videoFile: null,
      stage: STAGES.UPLOAD,
      progress: 0,
      transcription: null,
      translation: null,
      translatedVideoUrl: null,
      error: null,
    });
  }, [state.translatedVideoUrl]);

  const setSourceLanguage = useCallback((language: Language) => {
    setState(prev => ({ ...prev, sourceLanguage: language }));
  }, []);

  const setTargetLanguage = useCallback((language: Language) => {
    setState(prev => ({ ...prev, targetLanguage: language }));
  }, []);

  const setVideoFile = useCallback((file: File) => {
    setState(prev => ({ ...prev, videoFile: file }));
  }, []);

  const getProcessSteps = useCallback((): ProcessStep[] => {
    const steps: ProcessStep[] = [
      {
        id: STAGES.TRANSCRIBING,
        title: 'Speech to Text',
        description: 'Converting speech to text using AI',
        status: 'waiting',
      },
      {
        id: STAGES.TRANSLATING,
        title: 'Translation',
        description: `Translating from ${state.sourceLanguage?.name || 'source'} to ${state.targetLanguage?.name || 'target'}`,
        status: 'waiting',
      },
      {
        id: STAGES.GENERATING_AUDIO,
        title: 'Text to Speech',
        description: 'Converting translated text to speech',
        status: 'waiting',
      },
      {
        id: STAGES.PROCESSING_VIDEO,
        title: 'Video Processing',
        description: 'Synchronizing the translated audio with the video',
        status: 'waiting',
      },
    ];

    // Update status based on current stage
    return steps.map(step => {
      if (state.stage === step.id) {
        return { ...step, status: 'processing' };
      } else if (
        (state.stage === STAGES.TRANSLATING && step.id === STAGES.TRANSCRIBING) ||
        (state.stage === STAGES.GENERATING_AUDIO && (step.id === STAGES.TRANSCRIBING || step.id === STAGES.TRANSLATING)) ||
        (state.stage === STAGES.PROCESSING_VIDEO && (step.id === STAGES.TRANSCRIBING || step.id === STAGES.TRANSLATING || step.id === STAGES.GENERATING_AUDIO)) ||
        (state.stage === STAGES.COMPLETED)
      ) {
        return { ...step, status: 'completed' };
      }
      
      return step;
    });
  }, [state.stage, state.sourceLanguage, state.targetLanguage]);

  const canTranslate = useCallback(() => {
    return !!state.videoFile && 
           !!state.sourceLanguage && 
           !!state.targetLanguage && 
           state.sourceLanguage !== state.targetLanguage &&
           state.stage === STAGES.UPLOAD;
  }, [state.videoFile, state.sourceLanguage, state.targetLanguage, state.stage]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (state.translatedVideoUrl) {
        URL.revokeObjectURL(state.translatedVideoUrl);
      }
    };
  }, [state.translatedVideoUrl]);

  return {
    state,
    setSourceLanguage,
    setTargetLanguage,
    setVideoFile,
    translate: processVideo,
    reset,
    getProcessSteps,
    canTranslate,
  };
};

export default useTranslation;
