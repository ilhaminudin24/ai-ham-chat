import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronUp, ChevronDown, Workflow, Info, Zap } from 'lucide-react';
import { useChainStore } from '../store/chainStore';
import type { PromptChain, PromptChainStep } from '../types/chains';
import type { OutputMode } from '../store/chatStore';
import styles from './ChainEditor.module.css';

interface ChainEditorProps {
  isOpen: boolean;
  chain: PromptChain | null;
  onClose: () => void;
}

export const ChainEditor: React.FC<ChainEditorProps> = ({ isOpen, chain, onClose }) => {
  const { addChain, updateChain } = useChainStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🔗');
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [steps, setSteps] = useState<PromptChainStep[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (chain) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form state from props
      setName(chain.name);
      setDescription(chain.description);
      setIcon(chain.icon || '🔗');
      setAutoAdvance(chain.autoAdvance || false);
      setSteps(chain.steps);
    } else {
      setName('');
      setDescription('');
      setIcon('🔗');
      setAutoAdvance(false);
      setSteps([{ id: Date.now().toString(), name: 'Initial Step', promptTemplate: '' }]);
    }
    setValidationErrors([]);
  }, [chain, isOpen]);

  if (!isOpen) return null;

  const handleAddStep = () => {
    const newStep: PromptChainStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `Step ${steps.length + 1}`,
      promptTemplate: '',
      outputMode: 'auto',
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) return;
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    setSteps(newSteps);
  };

  const handleUpdateStep = (index: number, updates: Partial<PromptChainStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === steps.length - 1)) return;
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const handleSave = () => {
    const errors: string[] = [];
    if (!name.trim()) errors.push('Chain name is required.');
    steps.forEach((s, i) => {
      if (!s.name.trim()) errors.push(`Step ${i + 1} needs a name.`);
      if (!s.promptTemplate.trim()) errors.push(`Step ${i + 1} needs a prompt template.`);
    });
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    const chainData: Partial<PromptChain> = {
      name: name.trim(),
      description: description.trim(),
      icon,
      autoAdvance,
      steps,
      updatedAt: new Date().toISOString(),
    };

    if (chain) {
      updateChain(chain.id, chainData);
    } else {
      addChain({
        ...chainData,
        id: `chain-${Date.now()}`,
        createdAt: new Date().toISOString(),
      } as PromptChain);
    }
    onClose();
  };

  const outputModeOptions: { value: OutputMode; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'code', label: 'Code' },
    { value: 'json', label: 'JSON' },
    { value: 'table', label: 'Table' },
  ];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <Workflow size={24} className={styles.workflowIcon} />
            {chain ? 'Edit Prompt Chain' : 'Create New Prompt Chain'}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalContent}>
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className={styles.validationBanner}>
              {validationErrors.map((err, i) => (
                <div key={i} className={styles.validationError}>• {err}</div>
              ))}
            </div>
          )}

          <div className={styles.section}>
            <span className={styles.label}>Chain Name *</span>
            <input 
              className={`${styles.inputField} ${validationErrors.some(e => e.includes('name')) ? styles.inputError : ''}`}
              placeholder="e.g., Code Reviewer, Article Summarizer..."
              value={name}
              onChange={(e) => { setName(e.target.value); setValidationErrors([]); }}
              autoFocus
            />
          </div>

          <div className={styles.section}>
            <span className={styles.label}>Icon & Description</span>
            <div className={styles.iconInputGroup}>
              <div className={styles.iconPreview}>{icon}</div>
              <input 
                className={styles.inputField}
                placeholder="Emoji"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                style={{ width: '70px', textAlign: 'center' }}
              />
              <input 
                className={styles.inputField}
                placeholder="What does this chain do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Auto-advance toggle */}
          <div className={styles.section}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <Zap size={16} className={styles.toggleIcon} />
                <div>
                  <span className={styles.toggleLabel}>Auto-advance</span>
                  <span className={styles.toggleDesc}>Automatically run next step after AI responds</span>
                </div>
              </div>
              <button
                className={`${styles.toggle} ${autoAdvance ? styles.toggleOn : ''}`}
                onClick={() => setAutoAdvance(!autoAdvance)}
                type="button"
              >
                <div className={styles.toggleKnob} />
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.stepsHeader}>
              <span className={styles.label}>Workflow Steps *</span>
              <div className={styles.variablesHint}>
                <Info size={14} />
                Available: <span className={styles.variableTag}>{'{{input}}'}</span>
                <span className={styles.variableTag}>{'{{previous_output}}'}</span>
              </div>
            </div>
            
            <div className={styles.stepsContainer}>
              {steps.map((step, index) => (
                <div key={step.id} className={styles.stepCard}>
                  <div className={styles.stepHeader}>
                    <div className={styles.stepHeaderLeft}>
                      <div className={styles.stepNumber}>{index + 1}</div>
                      <input 
                        className={styles.stepNameInput}
                        value={step.name}
                        onChange={(e) => handleUpdateStep(index, { name: e.target.value })}
                        placeholder="Step Name"
                      />
                      <select
                        className={styles.outputModeSelect}
                        value={step.outputMode || 'auto'}
                        onChange={(e) => handleUpdateStep(index, { outputMode: e.target.value as OutputMode })}
                        title="Output mode"
                      >
                        {outputModeOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.stepActions}>
                      <button className={styles.stepActionBtn} onClick={() => handleMoveStep(index, 'up')} disabled={index === 0} title="Move up">
                        <ChevronUp size={16} />
                      </button>
                      <button className={styles.stepActionBtn} onClick={() => handleMoveStep(index, 'down')} disabled={index === steps.length - 1} title="Move down">
                        <ChevronDown size={16} />
                      </button>
                      <button 
                        className={`${styles.stepActionBtn} ${styles.deleteStepBtn}`} 
                        onClick={() => handleRemoveStep(index)}
                        disabled={steps.length <= 1}
                        title="Remove step"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.stepBody}>
                    <textarea 
                      className={styles.promptTextarea}
                      placeholder={
                        index === 0
                          ? "Enter prompt. Use {{input}} where you want the user's initial input.\nExample: Analyze the following code:\n\n{{input}}"
                          : "Enter prompt for this step.\nUse {{previous_output}} to reference the last step's result."
                      }
                      value={step.promptTemplate}
                      onChange={(e) => handleUpdateStep(index, { promptTemplate: e.target.value })}
                    />
                    {index > 0 && (
                      <div className={styles.templateHint}>
                        <Info size={11} />
                        Context from previous steps is automatically available. Use <code>{'{{previous_output}}'}</code> or <code>{'{{step_N_output}}'}</code> for specific step results.
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <button className={styles.addStepBtn} onClick={handleAddStep}>
                <Plus size={18} />
                Add Step
              </button>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
          <button className={styles.primaryBtn} onClick={handleSave}>Save Chain</button>
        </div>
      </div>
    </div>
  );
};
