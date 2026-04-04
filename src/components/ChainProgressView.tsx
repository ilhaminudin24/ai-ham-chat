import React from 'react';
import { Play, CheckCircle2, Workflow, ChevronRight } from 'lucide-react';
import { useChainStore } from '../store/chainStore';
import { useChatStore } from '../store/chatStore';
import styles from './ChainProgressView.module.css';

interface ChainProgressViewProps {
  conversationId: string;
}

export const ChainProgressView: React.FC<ChainProgressViewProps> = ({ conversationId }) => {
  const { chains, activeExecutions, advanceExecutionStep, cancelExecution, updateExecution } = useChainStore();
  const { setInputText, isStreaming } = useChatStore();
  
  const execution = activeExecutions.find(ex => ex.conversationId === conversationId);
  if (!execution) return null;
  
  const chain = chains.find(c => c.id === execution.chainId);
  if (!chain) return null;
  
  const currentStep = chain.steps[execution.currentStepIndex];
  const isCompleted = execution.status === 'completed';
  const progress = ((execution.currentStepIndex + (isCompleted ? 1 : 0)) / chain.steps.length) * 100;

  const handleRunStep = () => {
    if (isStreaming || isCompleted) return;
    
    let prompt = currentStep.promptTemplate;
    
    // Replace {{input}} if it's the first step and initial input was provided
    if (execution.currentStepIndex === 0 && execution.initialInput) {
      prompt = prompt.replace('{{input}}', execution.initialInput);
    }
    
    // 1. Update status to running
    updateExecution(conversationId, { status: 'running' });
    
    // 2. Load prompt into input
    setInputText(prompt);
    
    // Note: We stay in 'running' status while AI generates.
    // The user clicks 'Send' in the ChatInput manually (as requested 'Approve next step').
    // Once the AI response is done (isStreaming === false), 
    // this component will show the "Next Step" or "Finish" button.
  };

  const handleNextStep = () => {
    advanceExecutionStep(conversationId);
  };

  const currentMessages = useChatStore.getState().conversations.find(c => c.id === conversationId)?.messages || [];
  const lastMessageIsAssistant = currentMessages.length > 0 && currentMessages[currentMessages.length - 1].role === 'assistant';
  const showNextButton = execution.status === 'running' && !isStreaming && lastMessageIsAssistant;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Workflow size={16} />
          {chain.name}
        </div>
        <div className={styles.stepInfo}>
          {isCompleted ? 'Chain finished' : `Step ${execution.currentStepIndex + 1} of ${chain.steps.length}`}
        </div>
      </div>
      
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        {isCompleted && (
          <div className={styles.completedTick}>
            <CheckCircle2 size={16} />
            Completed
          </div>
        )}
      </div>
      
      <div className={styles.actions}>
        <div className={styles.currentStepName}>
          {isCompleted ? 'All steps done' : `Step ${execution.currentStepIndex + 1}: ${currentStep.name}`}
        </div>
        
        <div className={styles.actionButtons}>
          <button className={styles.cancelBtn} onClick={() => cancelExecution(conversationId)}>
            {isCompleted ? 'Close' : 'Cancel'}
          </button>
          
          {!isCompleted && (
            <>
              {execution.status === 'pending_run' ? (
                <button 
                  className={styles.runBtn} 
                  onClick={handleRunStep}
                  disabled={isStreaming}
                >
                  <Play size={14} fill="currentColor" />
                  Load Prompt
                </button>
              ) : showNextButton ? (
                <button 
                  className={styles.runBtn} 
                  style={{ backgroundColor: '#22c55e' }}
                  onClick={handleNextStep}
                >
                  Confirm & Next
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button 
                  className={styles.runBtn} 
                  disabled={true}
                  style={{ opacity: 0.7 }}
                >
                  {isStreaming ? 'AI is thinking...' : 'Waiting for your send'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
