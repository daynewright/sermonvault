import { OpenAI } from 'openai';
import { sermonFunctionDefinitions } from './function-definitions';
import { FunctionName, isFunctionName } from './function-handlers';

export type SermonQuery = {
  function: FunctionName;
  parameters: Record<string, any>;
  originalQuestion: string;
};

export async function classifySermonQuery(
  question: string,
  openai: OpenAI
): Promise<SermonQuery> {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are a sermon database assistant. Your job is to:
          1. Understand the user's question about their sermon history
          2. Classify it into the appropriate database function
          3. Extract relevant parameters
          
          Be precise in parameter extraction and function selection.
          
          Example mappings:
          - "What have I preached about grace?" → getTopicOverview with topic: "grace"
          - "Show me sermons like my message on John 3:16" → findRelatedSermons
          - "How has my teaching on prayer evolved?" → analyzeThemeDevelopment with theme: "prayer"
          - "What illustrations do I use when teaching about faith?" → analyzeIllustrations with topic: "faith"`
      },
      { role: "user", content: question }
    ],
    tools: sermonFunctionDefinitions.map(fn => ({
      type: 'function',
      function: fn
    })),
    tool_choice: "auto"
  });

  const choice = response.choices[0];
  
  if (!choice?.message?.tool_calls?.[0]?.function) {
    throw new Error("Failed to classify question");
  }

  const { name, arguments: args } = choice.message.tool_calls[0].function;

  if (!isFunctionName(name)) {
    throw new Error(`Invalid function classification: ${name}`);
  }

  return {
    function: name,
    parameters: JSON.parse(args || '{}'),
    originalQuestion: question
  };
} 