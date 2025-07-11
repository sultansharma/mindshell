import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

interface SelectModelProps {
  modelOptions: { label: string; model: string }[];
  onSelect: (index: number) => void;
}

export const SelectModel: React.FC<SelectModelProps> = ({ modelOptions, onSelect }) => {
  const items = modelOptions.map((opt, index) => ({
    label: `${index + 1}. ${opt.label}`,
    value: index,
  }));

  return (
    <Box flexDirection="column">
      <Text>Select a model to use:</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
    </Box>
  );
};
