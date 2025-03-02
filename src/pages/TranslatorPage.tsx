import React from 'react';
import VideoTranslator from '../components/VideoTranslator';

const TranslatorPage: React.FC = () => {
  const HF_TOKEN = "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";

  return (
    <div className="container mx-auto py-8">
      <VideoTranslator hfToken={HF_TOKEN} />
    </div>
  );
};

export default TranslatorPage; 