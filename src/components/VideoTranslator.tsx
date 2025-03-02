import React, { useState, useRef } from 'react';
import { HfInference } from '@huggingface/inference';

interface VideoTranslatorProps {
  hfToken: string;
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// Add language configuration
const languageConfig = {
  spanish: {
    name: 'Spanish',
    translationModel: 'Helsinki-NLP/opus-mt-en-es',
    ttsModel: 'facebook/mms-tts-spa',
    languageCode: 'es'
  },
  french: {
    name: 'French',
    translationModel: 'Helsinki-NLP/opus-mt-en-fr',
    ttsModel: 'facebook/mms-tts-fra',
    languageCode: 'fr'
  },
  russian: {
    name: 'Russian',
    translationModel: 'Helsinki-NLP/opus-mt-en-ru',
    ttsModel: 'facebook/mms-tts-rus',
    languageCode: 'ru'
  },
  hindi: {
    name: 'Hindi',
    translationModel: 'ai4bharat/indictrans-v2-all-indic',
    ttsModel: 'ai4bharat/indic-tts-coqui-hi',
    languageCode: 'hi'
  },
  telugu: {
    name: 'Telugu',
    translationModel: 'ai4bharat/indictrans-v2-all-indic',
    ttsModel: 'ai4bharat/indic-tts-coqui-te',
    languageCode: 'te'
  }
};

const VideoTranslator: React.FC<VideoTranslatorProps> = ({ hfToken }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [translation, setTranslation] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<keyof typeof languageConfig>('spanish');
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const headers = {
    Authorization: `Bearer ${hfToken}`,
    'Content-Type': 'application/json',
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const videoUrl = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.src = videoUrl;
      }
      setError('');
      setStatus('Video uploaded successfully');
      console.log('Video file loaded:', file.name);
    }
  };

  const convertAudioToWav = async (audioBuffer: AudioBuffer): Promise<Blob> => {
    // Ensure we're using the correct parameters for Whisper
    const numberOfChannels = 1; // Mono audio
    const sampleRate = 16000; // 16kHz sample rate
    const bytesPerSample = 2; // 16-bit audio
    
    // Resample if needed
    let processedBuffer = audioBuffer;
    if (audioBuffer.sampleRate !== sampleRate) {
      const offlineCtx = new OfflineAudioContext(1, audioBuffer.length * sampleRate / audioBuffer.sampleRate, sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      processedBuffer = await offlineCtx.startRendering();
    }

    const length = processedBuffer.length;
    const buffer = new ArrayBuffer(44 + length * bytesPerSample);
    const view = new DataView(buffer);

    // Write WAV header
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF'); // ChunkID
    view.setUint32(4, 36 + length * bytesPerSample, true); // ChunkSize
    writeString(view, 8, 'WAVE'); // Format
    writeString(view, 12, 'fmt '); // Subchunk1ID
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, numberOfChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true); // ByteRate
    view.setUint16(32, numberOfChannels * bytesPerSample, true); // BlockAlign
    view.setUint16(34, 8 * bytesPerSample, true); // BitsPerSample
    writeString(view, 36, 'data'); // Subchunk2ID
    view.setUint32(40, length * bytesPerSample, true); // Subchunk2Size

    // Write audio data
    const samples = new Float32Array(length);
    processedBuffer.copyFromChannel(samples, 0);
    const offset = 44;
    
    // Convert samples to 16-bit PCM
    for (let i = 0; i < length; i++) {
      // Normalize and clamp between -1 and 1
      const sample = Math.max(-1, Math.min(1, samples[i]));
      // Convert to 16-bit integer
      view.setInt16(offset + i * bytesPerSample, sample * 32767, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const extractAudio = async (video: File) => {
    try {
      setStatus('Extracting audio from video...');
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await video.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV format with specific parameters for Whisper
      const wavBlob = await convertAudioToWav(audioBuffer);
      
      // Log audio details for debugging
      console.log('Original sample rate:', audioBuffer.sampleRate);
      console.log('Original duration:', audioBuffer.duration);
      console.log('WAV blob size:', wavBlob.size);
      console.log('WAV blob type:', wavBlob.type);

      return wavBlob; // Return the WAV blob directly
    } catch (error) {
      console.error('Audio extraction error:', error);
      setError('Failed to extract audio from video');
      throw error;
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setStatus('Transcribing audio to text...');
      console.log('Starting transcription with Whisper model...');
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64Content = base64data.split(',')[1];
          resolve(base64Content);
        };
      });
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await base64Promise;
      
      // Send the audio data as JSON
      const response = await fetch('https://api-inference.huggingface.co/models/openai/whisper-large-v3', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: base64Audio
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Transcription API error:', errorText);
        throw new Error(`Transcription failed with status: ${response.status}, Details: ${errorText}`);
      }

      const result = await response.json();
      console.log('Raw transcription result:', result);
      const text = result.text || '';
      console.log('Transcription result:', text);
      setStatus('Audio transcribed successfully');
      return text;
    } catch (error) {
      console.error('Transcription error:', error);
      setError(`Failed to transcribe audio: ${error.message}`);
      throw error;
    }
  };

  const translateText = async (text: string) => {
    try {
      const targetLanguage = languageConfig[selectedLanguage];
      setStatus(`Translating text to ${targetLanguage.name}...`);
      console.log('Starting translation...');
      
      // Special handling for Hindi and Telugu using AI4Bharat's model
      if (selectedLanguage === 'hindi' || selectedLanguage === 'telugu') {
        const response = await fetch(`https://api-inference.huggingface.co/models/${targetLanguage.translationModel}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            inputs: text,
            parameters: {
              source_language: "eng",
              target_language: selectedLanguage === 'hindi' ? 'hin' : 'tel',
              max_length: 400,
              num_beams: 5,
              length_penalty: 1.0,
              temperature: 0.6
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`Translation failed with status: ${response.status}`);
        }

        const result = await response.json();
        return Array.isArray(result) ? result[0].translation_text : result.translation_text;
      } 
      // Simple handling for European languages (Spanish, French, Russian)
      else {
        const response = await fetch(`https://api-inference.huggingface.co/models/${targetLanguage.translationModel}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ inputs: text }),
        });

        if (!response.ok) {
          throw new Error(`Translation failed with status: ${response.status}`);
        }

        const result = await response.json();
        return Array.isArray(result) ? result[0].translation_text : result.translation_text;
      }
    } catch (error) {
      console.error('Translation error:', error);
      setError('Failed to translate text: ' + error.message);
      throw error;
    }
  };

  const generateSpeech = async (text: string) => {
    try {
      const targetLanguage = languageConfig[selectedLanguage];
      setStatus(`Generating ${targetLanguage.name} speech...`);
      console.log('Starting speech generation with text:', text);
      
      // Special handling for Hindi and Telugu using AI4Bharat's TTS
      if (selectedLanguage === 'hindi' || selectedLanguage === 'telugu') {
        const response = await fetch(`https://api-inference.huggingface.co/models/${targetLanguage.ttsModel}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: text,
            parameters: {
              language: targetLanguage.languageCode,
              speaker_id: selectedLanguage === 'hindi' ? 'hi_female' : 'te_female',
              speed: 0.9,
              energy: 1.2,
              do_sample: false
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Speech generation error:', errorText);
          throw new Error(`Speech generation failed with status: ${response.status}, Details: ${errorText}`);
        }

        const audioArrayBuffer = await response.arrayBuffer();
        const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/wav' });
        
        setStatus('Speech generated successfully');
        return audioBlob;
      }
      // Simple handling for European languages (Spanish, French, Russian)
      else {
        const response = await fetch(`https://api-inference.huggingface.co/models/${targetLanguage.ttsModel}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: text
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Speech generation error:', errorText);
          throw new Error(`Speech generation failed with status: ${response.status}, Details: ${errorText}`);
        }

        const audioArrayBuffer = await response.arrayBuffer();
        const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' });
        
        setStatus('Speech generated successfully');
        return audioBlob;
      }
    } catch (error) {
      console.error('Text-to-speech error:', error);
      setError('Failed to generate speech: ' + error.message);
      throw error;
    }
  };

  const handleTranslate = async () => {
    if (!videoFile) return;

    setIsProcessing(true);
    setError('');
    setStatus('Starting translation process...');
    
    try {
      console.log('Starting video translation process...');
      
      // Extract audio from video
      const audioBlob = await extractAudio(videoFile);
      console.log('Audio extracted successfully');

      // Transcribe audio to text
      const transcribedText = await transcribeAudio(audioBlob);
      console.log('Transcribed text:', transcribedText);
      setTranscription(transcribedText);

      // Translate text
      const translatedText = await translateText(transcribedText);
      console.log('Translated text:', translatedText);
      setTranslation(translatedText);

      try {
        // Generate speech from translated text
        const audioBlob2 = await generateSpeech(translatedText);
        console.log('Speech generated, blob size:', audioBlob2.size);
        const audioUrl = URL.createObjectURL(audioBlob2);

        // Play the translated audio with the video
        if (videoRef.current) {
          const audioElement = new Audio(audioUrl);
          
          // Mute the original video audio
          videoRef.current.muted = true;
          
          // Wait for both video and audio to be ready
          await Promise.all([
            new Promise(resolve => {
              videoRef.current!.oncanplay = resolve;
              videoRef.current!.currentTime = 0;
            }),
            new Promise(resolve => {
              audioElement.oncanplay = resolve;
            })
          ]);

          // Play both in sync
          videoRef.current.play();
          audioElement.play();

          // Add event listener to unmute video when translated audio ends
          audioElement.onended = () => {
            if (videoRef.current) {
              videoRef.current.muted = false;
            }
          };

          setStatus('Translation completed! Playing video with translated audio.');
        }
      } catch (speechError) {
        console.error('Speech generation error:', speechError);
        setStatus('Translation and text completed. Speech generation failed.');
        setError('Note: Text translation succeeded but audio generation failed. You can still read the translation above.');
      }
    } catch (error) {
      console.error('Processing error:', error);
      setError(`Translation failed: ${error.message}`);
      setStatus('Process failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-4xl mx-auto backdrop-blur-lg bg-white/10 rounded-3xl shadow-2xl p-8 space-y-8 relative z-10 border border-white/20">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-100 mb-4">
            AI Video Translator
          </h1>
          <p className="text-blue-100 text-lg">Transform your videos from English to your chosen language with AI-powered translation</p>
        </div>

        <div className="space-y-8">
          <div className="group bg-white/5 backdrop-blur-lg border-2 border-dashed border-blue-300/30 rounded-2xl p-8 text-center transition-all duration-300 hover:bg-white/10 hover:border-blue-300/50">
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
              id="video-upload"
            />
            <label 
              htmlFor="video-upload" 
              className="cursor-pointer flex flex-col items-center justify-center space-y-4 group-hover:scale-105 transition-transform duration-300"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center p-5 shadow-lg group-hover:shadow-blue-500/50 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <span className="text-blue-100 text-lg group-hover:text-blue-200 transition-colors duration-300">
                Drop your video here or click to browse
              </span>
            </label>
          </div>

          <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-black/40 backdrop-blur-sm border border-white/10">
            <video
              ref={videoRef}
              controls
              className="w-full aspect-video"
            />
            <div className="absolute inset-0 border-4 border-transparent hover:border-blue-500/30 transition-all duration-300 pointer-events-none"></div>
          </div>

          <div className="flex justify-center items-center space-x-4">
            {/* Language Selection Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="px-6 py-4 bg-white/10 text-blue-100 rounded-2xl hover:bg-white/20 transition-all duration-300 flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span>{languageConfig[selectedLanguage].name}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${isLanguageMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Language Dropdown Menu */}
              {isLanguageMenuOpen && (
                <div className="absolute mt-2 w-full py-2 bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 z-50">
                  {Object.entries(languageConfig).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedLanguage(key as keyof typeof languageConfig);
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors duration-300 ${
                        selectedLanguage === key ? 'text-blue-300' : 'text-blue-100'
                      }`}
                    >
                      {value.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Translate Button */}
            <button
              onClick={handleTranslate}
              disabled={!videoFile || isProcessing}
              className="relative px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-lg font-medium rounded-2xl shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent group overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
              {isProcessing ? (
                <div className="flex items-center space-x-3">
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </div>
              ) : 'Translate Video'}
            </button>
          </div>

          {status && (
            <div className="bg-blue-900/30 backdrop-blur-sm border border-blue-300/30 rounded-2xl p-6 transform transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="text-blue-100 text-lg">{status}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 backdrop-blur-sm border border-red-300/30 rounded-2xl p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="h-6 w-6 text-red-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="text-red-100 text-lg">{error}</p>
              </div>
            </div>
          )}

          {(transcription || translation) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {transcription && (
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/20 transform transition-all duration-300 hover:bg-white/10">
                  <h2 className="text-xl font-semibold text-blue-100 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Original Text (English)
                  </h2>
                  <p className="text-blue-100 leading-relaxed">{transcription}</p>
                </div>
              )}
              
              {translation && (
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/20 transform transition-all duration-300 hover:bg-white/10">
                  <h2 className="text-xl font-semibold text-blue-100 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    {languageConfig[selectedLanguage].name} Translation
                  </h2>
                  <p className="text-blue-100 leading-relaxed">{translation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoTranslator; 