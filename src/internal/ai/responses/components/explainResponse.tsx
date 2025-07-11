
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import LoadingDot from '../../../../components/Loading.js';
import { PrimaryColor } from '../../../../utils/constant.js';
import { handleCommand } from '../../../commands/commandHandler.js';
import { InteractionResponse, RetryChain } from '../../../../types/ai.js';


export const ExplanationResponse: React.FC<{ response: InteractionResponse; onDone: () => void;  onNext?: (r: InteractionResponse) => void; prompt: string | undefined }> = ({
  response,
  onDone,
  onNext,
  prompt
}) => {


  // —— UI ——————————————————————————————
  return (
    <Box flexDirection="column" padding={1} borderStyle="single" borderColor="gray">
     
        <Text color="yellow">
          <Text color="gray">Explanation:</Text> {response.content}
        </Text>
    </Box>
  );
};
