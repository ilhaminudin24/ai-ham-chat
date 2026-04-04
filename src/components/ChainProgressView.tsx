import React, { useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, Workflow, ChevronRight, X, AlertCircle, RotateCcw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useChainStore } from '../store/chainStore';
import { useChatStore } from '../store/chatStore';
import { sendChatRequest } from '../utils/api';
import styles from './ChainProgressView.module.css';

interface ChainProgressViewProps {
  conversationId: string;
}

export const ChainProgressView: React.FC<ChainProgressViewProps> = ({ conversationId }) => {
  const { chains, activeExecutions, advanceExecutionStep, cancelExecution, updateExecution, failExecution } = useChainStore();
  const isStreaming = useChatStore(s => s.isStreaming);
  const selectedModel = useChatStore(s => s.selectedModel);
  const [collapsed, setCollapsed] = React.useState(false);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoSentRef = useRef<string>('');
  
  const execution = activeExecutions.find(ex => ex.conversationId === conversationId);
  const chain = execution ? chains.find(c => c.id === execution.chainId) : null;
  
  // Reactive message subscription — proper zustand selector
  const currentMessages = useChatStore(
    useCallback((s) => s.conversations.find(c => c.id === conversationId)?.messages || [], [conversationId])
  );
  const lastMessage = currentMessages[currentMessages.length - 1];
  const lastMessageIsAssistant = lastMessage?.role === 'assistant';

  // Resolve template variables in prompt
  const resolveTemplate = useCallback((template: string, exec: typeof execution) => {
    if (!exec) return template;
    let resolved = template;
    
    // Replace {{input}} with initial input
    if (exec.initialInput) {
      resolved = resolved.replaceAll('{{input}}', exec.initialInput);
    }
    
    // Replace {{previous_output}} with last step's result
    if (exec.stepResults.length > 0) {
      const prevOutput = exec.stepResults[exec.stepResults.length - 1] || '';
      resolved = resolved.replaceAll('{{previous_output}}', prevOutput);
    }
    
    // Replace {{step_N_output}} with specific step results
    exec.stepResults.forEach((result, idx) => {
      resolved = resolved.replaceAll(`{{step_${idx + 1}_output}}`, result || '');
    });
    
    // Replace {{all_outputs}} with concatenation
    if (exec.stepResults.length > 0) {
      resolved = resolved.replaceAll('{{all_outputs}}', exec.stepResults.filter(Boolean).join('\n\n---\n\n'));
    }
    
    return resolved;
  }, []);

  // Auto-send: programmatically send prompt when status is pending_run
  const executeStep = useCallback(async () => {
    if (!execution || !chain) return;
    if (isStreaming) return;
    if (execution.status !== 'pending_run') return;
    
    const step = chain.steps[execution.currentStepIndex];
    if (!step) {
      failExecution(conversationId, 'Step not found');
      return;
    }

    const prompt = resolveTemplate(step.promptTemplate, execution);
    
    // Mark as running
    updateExecution(conversationId, { status: 'running' });
    
    // Add user message and send
    const store = useChatStore.getState();
    store.addMessage(conversationId, { role: 'user', content: prompt });

    try {
      const conv = useChatStore.getState().conversations.find(c => c.id === conversationId);
      if (conv) {
        await sendChatRequest(conversationId, conv.messages, selectedModel);
      }
    } catch {
      failExecution(conversationId, 'Failed to send request. Please retry.');
    }
  }, [execution, chain, isStreaming, conversationId, selectedModel, resolveTemplate, updateExecution, failExecution]);

  // Auto-advance: when AI finishes streaming and chain has autoAdvance, go to next step
  useEffect(() => {
    if (!execution || !chain) return;
    if (execution.status !== 'running') return;
    if (isStreaming) return;
    if (!lastMessageIsAssistant) return;
    
    const lastContent = lastMessage?.content || '';
    
    if (chain.autoAdvance) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        advanceExecutionStep(conversationId, lastContent);
      }, 1500);
      
      return () => {
        if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execution?.status, isStreaming, lastMessageIsAssistant, chain?.autoAdvance]);

  // Auto-execute next step when status becomes pending_run (for auto-advance chains)
  useEffect(() => {
    if (!execution || !chain) return;
    if (execution.status !== 'pending_run') return;
    if (isStreaming) return;
    
    // Unique key to avoid double-send
    const stepKey = `${execution.chainId}-${execution.currentStepIndex}`;
    if (hasAutoSentRef.current === stepKey) return;
    hasAutoSentRef.current = stepKey;
    
    // Small delay to let React settle
    const timer = setTimeout(() => {
      executeStep();
    }, 300);
    
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execution?.status, execution?.currentStepIndex, isStreaming]);

  // Reset auto-send ref when execution changes
  useEffect(() => {
    if (!execution) {
      hasAutoSentRef.current = '';
    }
  }, [execution]);

  if (!execution || !chain) return null;
  
  const currentStep = chain.steps[execution.currentStepIndex];
  const isCompleted = execution.status === 'completed';
  const isFailed = execution.status === 'failed';
  const progress = ((execution.currentStepIndex + (isCompleted ? 1 : 0)) / chain.steps.length) * 100;

  const handleNextStep = () => {
    const lastContent = lastMessage?.content || '';
    advanceExecutionStep(conversationId, lastContent);
  };

  const handleRetry = () => {
    hasAutoSentRef.current = '';
    updateExecution(conversationId, { status: 'pending_run', error: undefined });
  };

  const showNextButton = execution.status === 'running' && !isStreaming && lastMessageIsAssistant && !chain.autoAdvance;

  if (collapsed) {
    return (
      <div className={styles.collapsedContainer} onClick={() => setCollapsed(false)}>
        <Workflow size={14} />
        <span className={styles.collapsedTitle}>{chain.name}</span>
        <span className={styles.collapsedStep}>
          {isCompleted ? '✓ Done' : isFailed ? '✕ Failed' : `${execution.currentStepIndex + 1}/${chain.steps.length}`}
        </span>
        <div className={styles.collapsedProgress}>
          <div className={styles.collapsedProgressFill} style={{ width: `${progress}%` }} />
        </div>
        <ChevronDown size={14} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Workflow size={16} className={styles.headerIcon} />
          <span className={styles.chainName}>{chain.icon} {chain.name}</span>
          {chain.autoAdvance && <span className={styles.autoTag}>Auto</span>}
        </div>
        <div className={styles.headerRight}>
          <button className={styles.collapseBtn} onClick={() => setCollapsed(true)} title="Minimize">
            <ChevronUp size={14} />
          </button>
          <button className={styles.closeBtn} onClick={() => cancelExecution(conversationId)} title="Cancel chain">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Stepper Timeline */}
      <div className={styles.stepper}>
        {chain.steps.map((step, idx) => {
          const isDone = idx < execution.currentStepIndex || isCompleted;
          const isActive = idx === execution.currentStepIndex && !isCompleted && !isFailed;
          const isPending = idx > execution.currentStepIndex;
          const isFailedStep = isActive && isFailed;

          return (
            <div key={step.id} className={`${styles.step} ${isDone ? styles.stepDone : ''} ${isActive ? styles.stepActive : ''} ${isPending ? styles.stepPending : ''} ${isFailedStep ? styles.stepFailed : ''}`}>
              <div className={styles.stepIndicator}>
                <div className={styles.stepDot}>
                  {isDone && <CheckCircle2 size={14} />}
                  {isActive && !isFailed && !isStreaming && <span className={styles.stepNumber}>{idx + 1}</span>}
                  {isActive && !isFailed && isStreaming && <Loader2 size={14} className={styles.spinning} />}
                  {isFailedStep && <AlertCircle size={14} />}
                  {isPending && <span className={styles.stepNumber}>{idx + 1}</span>}
                </div>
                {idx < chain.steps.length - 1 && <div className={styles.stepLine} />}
              </div>
              <div className={styles.stepContent}>
                <div className={styles.stepName}>{step.name}</div>
                {isActive && (
                  <div className={styles.stepPromptPreview}>
                    {step.promptTemplate.length > 80
                      ? step.promptTemplate.slice(0, 80) + '...'
                      : step.promptTemplate}
                  </div>
                )}
                {isDone && execution.stepResults[idx] && (
                  <div className={styles.stepResultPreview}>
                    ✓ {execution.stepResults[idx].slice(0, 60)}...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div className={`${styles.progressFill} ${isCompleted ? styles.progressComplete : ''} ${isFailed ? styles.progressFailed : ''}`} style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.progressLabel}>
          {isCompleted ? 'Completed' : isFailed ? 'Failed' : `${execution.currentStepIndex + 1} of ${chain.steps.length}`}
        </span>
      </div>

      {/* Action Area */}
      <div className={styles.actions}>
        {isFailed && (
          <div className={styles.errorBanner}>
            <AlertCircle size={14} />
            <span>{execution.error || 'An error occurred'}</span>
            <button className={styles.retryBtn} onClick={handleRetry}>
              <RotateCcw size={14} />
              Retry
            </button>
          </div>
        )}
        
        {isCompleted && (
          <div className={styles.completedBanner}>
            <CheckCircle2 size={16} />
            <span>All {chain.steps.length} steps completed successfully!</span>
            <button className={styles.closeChainBtn} onClick={() => cancelExecution(conversationId)}>
              Done
            </button>
          </div>
        )}

        {execution.status === 'running' && isStreaming && (
          <div className={styles.streamingIndicator}>
            <Loader2 size={14} className={styles.spinning} />
            <span>AI is generating response for: {currentStep?.name}...</span>
          </div>
        )}

        {showNextButton && (
          <button className={styles.nextBtn} onClick={handleNextStep}>
            Next Step
            <ChevronRight size={14} />
          </button>
        )}

        {chain.autoAdvance && execution.status === 'running' && !isStreaming && lastMessageIsAssistant && (
          <div className={styles.autoAdvanceIndicator}>
            <Loader2 size={14} className={styles.spinning} />
            <span>Auto-advancing to next step...</span>
          </div>
        )}
      </div>
    </div>
  );
};
