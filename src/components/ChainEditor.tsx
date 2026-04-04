import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronUp, ChevronDown, Workflow, Info } from 'lucide-react';
import { useChainStore } from '../store/chainStore';
import type { PromptChain, PromptChainStep } from '../types/chains';
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
  const [steps, setSteps] = useState<PromptChainStep[]>([]);

  useEffect(() => {
    if (chain) {
      setName(chain.name);
      setDescription(chain.description);
      setIcon(chain.icon || '🔗');
      setSteps(chain.steps);
    } else {
      setName('');
      setDescription('');
      setIcon('🔗');
      setSteps([{ id: Date.now().toString(), name: 'Initial Step', promptTemplate: '' }]);
    }
  }, [chain, isOpen]);

  if (!isOpen) return null;

  const handleAddStep = () => {
    const newStep: PromptChainStep = {
      id: Date.now().toString(),
      name: `Step ${steps.length + 1}`,
      promptTemplate: '',
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
    if (!name.trim() || steps.some(s => !s.name.trim() || !s.promptTemplate.trim())) {
      alert('Please fill in all required fields.');
      return;
    }

    const chainData = {
      name: name.trim(),
      description: description.trim(),
      icon,
      steps,
      updatedAt: new Date().toISOString(),
    };

    if (chain) {
      updateChain(chain.id, chainData);
    } else {
      addChain({
        ...chainData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      });
    }
    onClose();
  };

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
          <div className={styles.section}>
            <span className={styles.label}>Chain Name *</span>
            <input 
              className={styles.inputField}
              placeholder="e.g., Code Reviewer, Article Summarizer..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.section}>
            <span className={styles.label}>Icon & Description</span>
            <div className={styles.iconInputGroup}>
              <div className={styles.iconPreview}>{icon}</div>
              <input 
                className={styles.inputField}
                placeholder="Emoji icon (e.g., 🔍, ✍️, 📝)"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                style={{ width: '80px', textAlign: 'center' }}
              />
              <input 
                className={styles.inputField}
                placeholder="What does this chain do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className={styles.label}>Workflow Steps *</span>
              <div className={styles.variablesHint}>
                <Info size={14} />
                Use <span className={styles.variableTag}>'{"{{input}}"}'</span> in the first step for initial input.
              </div>
            </div>
            
            <div className={styles.stepsContainer}>
              {steps.map((step, index) => (
                <div key={step.id} className={styles.stepCard}>
                  <div className={styles.stepHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div className={styles.stepNumber}>{index + 1}</div>
                      <input 
                        className={styles.inputField}
                        value={step.name}
                        onChange={(e) => handleUpdateStep(index, { name: e.target.value })}
                        placeholder="Step Name (e.g., Analyze Code)"
                        style={{ border: 'none', background: 'transparent', fontWeight: 600, padding: '4px' }}
                      />
                    </div>
                    <div className={styles.stepActions}>
                      <button className={styles.stepActionBtn} onClick={() => handleMoveStep(index, 'up')} disabled={index === 0}>
                        <ChevronUp size={18} />
                      </button>
                      <button className={styles.stepActionBtn} onClick={() => handleMoveStep(index, 'down')} disabled={index === steps.length - 1}>
                        <ChevronDown size={18} />
                      </button>
                      <button 
                        className={`${styles.stepActionBtn} ${styles.deleteStepBtn}`} 
                        onClick={() => handleRemoveStep(index)}
                        disabled={steps.length <= 1}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.stepBody}>
                    <textarea 
                      className={styles.promptTextarea}
                      placeholder={index === 0 ? "Enter prompt. Use '{{input}}' where you want the user's initial input to go." : "Enter prompt for this step."}
                      value={step.promptTemplate}
                      onChange={(e) => handleUpdateStep(index, { promptTemplate: e.target.value })}
                    />
                    {index > 0 && (
                      <div className={styles.variablesHint} style={{ marginTop: 0 }}>
                        <Info size={12} />
                        Contex from previous steps is automatically available.
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
