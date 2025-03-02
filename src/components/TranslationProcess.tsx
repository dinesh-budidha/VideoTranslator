
import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';
import { ProcessStep } from '@/types';

interface TranslationProcessProps {
  steps: ProcessStep[];
  currentStep: string;
  progress: number;
  className?: string;
}

const TranslationProcess: React.FC<TranslationProcessProps> = ({
  steps,
  currentStep,
  progress,
  className,
}) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="relative mb-2 h-1 bg-secondary rounded-full overflow-hidden">
        <div 
          className="absolute h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="space-y-4 py-2">
        {steps.map((step) => {
          let icon;
          
          if (step.status === 'completed') {
            icon = <CheckCircle className="h-5 w-5 text-primary" />;
          } else if (step.status === 'processing') {
            icon = <Loader2 className="h-5 w-5 text-primary animate-spin" />;
          } else if (step.status === 'error') {
            icon = <div className="h-5 w-5 text-destructive">✕</div>;
          } else {
            icon = <Clock className="h-5 w-5 text-muted-foreground" />;
          }
          
          return (
            <div 
              key={step.id}
              className={cn(
                "flex items-start space-x-3 p-3 rounded-lg transition-all duration-200",
                step.status === 'processing' ? "bg-primary/5" : "",
                step.status === 'completed' ? "opacity-80" : "",
                step.status === 'waiting' ? "opacity-50" : ""
              )}
            >
              <div>{icon}</div>
              <div>
                <h3 className={cn(
                  "font-medium",
                  step.status === 'processing' && "text-primary"
                )}>
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TranslationProcess;
