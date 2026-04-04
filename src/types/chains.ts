import { OutputMode } from '../store/chatStore';

export interface PromptChainStep {
  id: string;
  name: string;
  promptTemplate: string;
  outputMode?: OutputMode;
}

export interface PromptChain {
  id: string;
  name: string;
  description: string;
  icon?: string;
  steps: PromptChainStep[];
  createdAt: string;
  updatedAt: string;
}

export interface ChainExecutionState {
  conversationId: string;
  chainId: string;
  currentStepIndex: number;
  status: 'pending_run' | 'running' | 'completed';
  initialInput?: string; 
}
