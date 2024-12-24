import { getOpenAIClient } from '@/app/api/lib/clients/openai';

interface SermonValidation {
  isSermon: boolean;
  confidence: number;
  reason: string;
}

export async function validateSermonContent(text: string): Promise<SermonValidation> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a sermon content validator. Analyze the given text and determine if it's a sermon.
          You MUST respond with a JSON object in this exact format:
          {
            "isSermon": boolean,
            "confidence": number between 0 and 1,
            "reason": string explaining your decision
          }
          
          Consider:
          - Religious/spiritual content
          - Preaching style and tone
          - Biblical references
          - Sermon structure (introduction, body, conclusion)
          - Call to action or application
          - Theological concepts`
        },
        {
          role: "user",
          content: `Analyze this text and determine if it's a sermon: ${text.slice(0, 1000)}...`
        }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    console.log('Sermon validation result:', result);
    return result;
  } catch (error) {
    console.error('Sermon validation error:', error);
    throw new Error('Failed to validate sermon content');
  }
}
 