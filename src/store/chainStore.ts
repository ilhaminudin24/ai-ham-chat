import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PromptChain, ChainExecutionState } from '../types/chains';

export interface ChainStoreState {
  chains: PromptChain[];
  activeExecutions: ChainExecutionState[];
  
  // Actions
  addChain: (chain: PromptChain) => void;
  updateChain: (id: string, updates: Partial<PromptChain>) => void;
  deleteChain: (id: string) => void;
  
  startExecution: (conversationId: string, chainId: string, initialInput?: string) => void;
  updateExecution: (conversationId: string, updates: Partial<ChainExecutionState>) => void;
  advanceExecutionStep: (conversationId: string) => void;
  cancelExecution: (conversationId: string) => void;
  
  getActiveExecution: (conversationId: string) => ChainExecutionState | undefined;
}

const defaultChains: PromptChain[] = [
  {
    id: 'default-code-review',
    name: 'Code Review Workflow',
    description: 'Analyze code for bugs, suggest fixes, and write unit tests.',
    icon: '🔍',
    steps: [
      {
        id: 'step-1',
        name: 'Analyze Code',
        promptTemplate: 'Please review the following code for bugs, security issues, and performance bottlenecks:\n\n{{input}}\n\nProvide your analysis as a structured list.',
        outputMode: 'auto'
      },
      {
        id: 'step-2',
        name: 'Suggest Fixes',
        promptTemplate: 'Based on your analysis, please suggest corrected code snippets for each of the issues you found. Explain why the changes improve the code.',
        outputMode: 'code'
      },
      {
        id: 'step-3',
        name: 'Write Unit Tests',
        promptTemplate: 'Write comprehensive unit tests for the corrected code you just provided. Ensure proper coverage for both success and failure cases.',
        outputMode: 'code'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const useChainStore = create<ChainStoreState>()(
  persist(
    (set, get) => ({
      chains: defaultChains,
      activeExecutions: [],
      
      addChain: (chain) => set((state) => ({
        chains: [...state.chains, chain]
      })),
      
      updateChain: (id, updates) => set((state) => ({
        chains: state.chains.map((chain) => 
          chain.id === id ? { ...chain, ...updates, updatedAt: new Date().toISOString() } : chain
        )
      })),
      
      deleteChain: (id) => set((state) => ({
        chains: state.chains.filter((chain) => chain.id !== id)
      })),
      
      startExecution: (conversationId, chainId, initialInput) => set((state) => {
        // Remove any existing execution for this conversation to cleanly start over
        const cleanExecutions = state.activeExecutions.filter(ex => ex.conversationId !== conversationId);
        return {
          activeExecutions: [
            ...cleanExecutions,
            {
              conversationId,
              chainId,
              currentStepIndex: 0,
              status: 'pending_run',
              initialInput
            }
          ]
        };
      }),
      
      updateExecution: (conversationId, updates) => set((state) => ({
        activeExecutions: state.activeExecutions.map(ex => 
          ex.conversationId === conversationId ? { ...ex, ...updates } : ex
        )
      })),
      
      advanceExecutionStep: (conversationId) => set((state) => {
        return {
          activeExecutions: state.activeExecutions.map((ex) => {
            if (ex.conversationId === conversationId) {
              const chain = state.chains.find(c => c.id === ex.chainId);
              if (!chain) return ex;
              
              if (ex.currentStepIndex + 1 < chain.steps.length) {
                return {
                  ...ex,
                  currentStepIndex: ex.currentStepIndex + 1,
                  status: 'pending_run' 
                };
              } else {
                return {
                  ...ex,
                  status: 'completed'
                };
              }
            }
            return ex;
          })
        };
      }),
      
      cancelExecution: (conversationId) => set((state) => ({
        activeExecutions: state.activeExecutions.filter((ex) => ex.conversationId !== conversationId)
      })),
      
      getActiveExecution: (conversationId) => {
        return get().activeExecutions.find(ex => ex.conversationId === conversationId);
      }
    }),
    {
      name: 'aiham_chains_v1',
      partialize: (state) => ({
        chains: state.chains,
        // We only persist active executions so that closing the app doesn't lose the chain progress
        activeExecutions: state.activeExecutions.filter(e => e.status !== 'completed')
      })
    }
  )
);
