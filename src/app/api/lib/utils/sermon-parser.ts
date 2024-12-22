import { findBibleReferences } from './bible-parser';
import { getOpenAIClient } from '@/app/api/lib/clients/openai';

export async function extractSermonMetadata(text: string) {
  const foundReferences = findBibleReferences(text);
  const openai = getOpenAIClient();

  console.log('Text:', text);
  console.log('Found Bible references:', foundReferences);

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `Extract sermon metadata. Bible references have been pre-processed: ${foundReferences.join(', ')}        - title: string
        - date: YYYY-MM-DD
        - preacher: string
        - primary_scripture: string (e.g., "Matthew 21:1-11")
        - scriptures: array of references ["Matthew 21:1-11", "Zechariah 9:9"]
        - topics: array [1-3 topics]
        - summary: string (100-200 words)
        - series: string
        - sermon_type: "expository"|"textual"|"topical"|"narrative"
        - tags: array [1-3 tags]
        - illustrations: array of strings
        - key_points: array [1-3 key points]
        - location: string
        - confidence: object with score for each field

        Return JSON with the fields above.
        If you cannot find a field, return null.`
      },
      {
        role: "user",
        content: `Please analyze this sermon and extract the metadata:\n\n${text.length > 6000 
          ? text.substring(0, 3000) + '\n...\n' + text.substring(text.length - 3000)
          : text
        }`
      }
    ],
    temperature: 0,
    response_format: { type: "json_object" }
  });

  console.log('OpenAI response:', response.choices[0].message.content);

  return JSON.parse(response.choices[0].message.content || '{}');
}