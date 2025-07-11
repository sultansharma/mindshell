// components/ChangeModel.tsx
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { loadConfig, modelOptions, saveConfig } from '../utils/config.js';
import { Config } from '../types/config.js';
import { loadHistory, saveHistory } from './history.js';


export const ChangeModel: React.FC<{ onComplete: any }> = ({ onComplete }) => {
	const [step, setStep] = useState<'select' | 'apikey' | 'done'>('select');
	const [selectedModel, setSelectedModel] = useState<any>(null);
	const [apiKeyInput, setApiKeyInput] = useState('');
	const [existingKey, setExistingKey] = useState<string | null>(null);

	const handleModelSelect = async (item: { value: number }) => {
		const model = modelOptions[item.value];
		setSelectedModel(model);
		const provider = model.model.split(':')[0];
		const cfg = loadConfig();
		if (cfg?.APIKeys?.[provider]) {
			setExistingKey(cfg.APIKeys[provider]);
			setApiKeyInput(cfg.APIKeys[provider]);
		}
		setStep('apikey');
	};

    const handleApiSubmit = () => {
        if (!selectedModel) return;
      
        const provider = selectedModel.model.split(':')[0];
      
        // Load existing config or start fresh
        let config: Config = loadConfig() || { model: '', APIKeys: {} };
      
        // Update config values
        config.model = selectedModel.model;
        config.APIKeys[provider] = apiKeyInput.trim();
      
        // Save back to disk
        saveConfig(config);
		onComplete('shell');
		const oldHistory = loadHistory() || [];

  // New history entrycha
  const newEntry = {
	prompt: 'change-model',
    command: 'change-model',
    output: `Model changed to ${selectedModel.model}`,
    timestamp: new Date(),
	type:'command'
  };

  // Append new entry
  const updatedHistory = [...oldHistory, newEntry].slice(-30); // keep last 30 entries

  // Save updated history
  saveHistory(updatedHistory);
        // Transition step (e.g., load the CLI shell)
        setStep('done');
      };
      
    

	if (step === 'select') {
		return (
			<Box flexDirection="column">
				<Text>Select a model to use:</Text>
				<Box marginTop={1}>
					<SelectInput
						items={modelOptions.map((opt, index) => ({
							label: `${index + 1}. ${opt.label}`,
							value: index
						}))}
						onSelect={handleModelSelect}
					/>
				</Box>
			</Box>
		);
	}

	if (step === 'apikey' && selectedModel) {
		const provider = selectedModel.model.split(':')[0];
		return (
			<Box flexDirection="column">
				<Text>
					🔑 Enter API key for <Text color="cyan">{provider}</Text>:
				</Text>
				{existingKey && (
					<Text color="gray">Found existing key. Press Enter to reuse or edit.</Text>
				)}
				<Box marginTop={1}>
					<TextInput
						value={apiKeyInput}
						onChange={setApiKeyInput}
						onSubmit={handleApiSubmit}
					/>
				</Box>
			</Box>
		);
	}

	if (step === 'done' && selectedModel) {
		return (
			<Box flexDirection="column">
				<Text color="green">✅ Model and API key updated successfully → {selectedModel.model}</Text>
				<Text color="blue">Returning to shell...</Text>
			</Box>
		);
	}

	return null;
};
