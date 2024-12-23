import { findBibleReferences } from './bible-parser';
import { getOpenAIClient } from '@/app/api/lib/clients/openai';

type ToneIndicator = {
  words: string[];
  weight: number;
};

const toneIndicators: Record<string, ToneIndicator> = {
  encouraging: {
    words: ['hope', 'encourage', 'uplift', 'inspire', 'promise', 'comfort', 'strengthen', 'build up', 'overcome', 'victory', 'confidence', 'assurance'],
    weight: 1
  },
  challenging: {
    words: ['repent', 'warning', 'challenge', 'examine', 'consider', 'conviction', 'wake up', 'change', 'turn from', 'serious', 'danger', 'consequences'],
    weight: 1
  },
  instructive: {
    words: ['wisdom', 'truth', 'understand', 'insight', 'discover', 'reveal', 'clarify', 'grasp', 'realize', 'see clearly', 'enlighten', 'illuminate'],
    weight: 1
  },
  caring: {
    words: ['care', 'love', 'gentle', 'shepherd', 'tend', 'nurture', 'comfort', 'help', 'support', 'healing', 'peace', 'rest'],
    weight: 1
  },
  prophetic: {
    words: ['declare', 'proclaim', 'thus says', 'warning', 'future', 'prophecy', 'vision', 'revealed', 'speaks', 'coming'],
    weight: 1
  },
  urgent: {
    words: ['must', 'should', 'need to', 'important', 'crucial', 'essential', 'urgent', 'now', 'today', 'immediate', 'critical', 'vital'],
    weight: 1
  },
  joyful: {
    words: ['rejoice', 'celebrate', 'praise', 'joy', 'thankful', 'grateful', 'worship', 'delight', 'glad', 'happy', 'blessed', 'sing'],
    weight: 1
  },
  reflective: {
    words: ['meditate', 'consider', 'reflect', 'ponder', 'think', 'contemplate', 'quiet', 'deep', 'inner', 'heart', 'soul', 'mind'],
    weight: 1
  }
};

function detectTone(text: string): string {
  const wordCounts: Record<string, number> = {};
  
  // Initialize counts
  Object.keys(toneIndicators).forEach(tone => {
    wordCounts[tone] = 0;
  });

  // Count occurrences of tone-indicating words
  Object.entries(toneIndicators).forEach(([tone, indicator]) => {
    indicator.words.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = (text.match(regex) || []).length;
      wordCounts[tone] += matches * indicator.weight;
    });
  });

  const maxCount = Math.max(...Object.values(wordCounts));
  const dominantTones = Object.entries(wordCounts)
    .filter(([_, count]) => count === maxCount)
    .map(([tone]) => tone);

  return dominantTones.length > 1 
    ? `${dominantTones[0]} and ${dominantTones[1]}`
    : dominantTones[0];
}

const SERMON_TAGS = [
  'salvation',          // Core gospel message and salvation themes
  'discipleship',       // Following Christ, spiritual growth
  'faith',             // Trust in God, believing
  'prayer',            // Prayer, communication with God
  'relationships',     // Family, marriage, friendships
  'spiritual-warfare', // Spiritual battles, resistance
  'evangelism',        // Sharing faith, missions
  'healing',           // Physical, emotional, spiritual healing
  'worship',           // Praise, adoration, worship practices
  'stewardship',       // Money, time, resources management
  'identity',          // Who we are in Christ
  'community',         // Church life, fellowship
  'character',         // Fruit of the Spirit, personal growth
  'biblical-history',  // Historical context, Bible background
  'prophecy'           // End times, prophetic messages
] as const;

export async function extractSermonMetadata(text: string) {
  // Clean and normalize the text
  const cleanedText = text
    // Remove multiple consecutive spaces/newlines
    .replace(/\s+/g, ' ')
    // Remove special characters that don't add meaning
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Remove any HTML tags if present
    .replace(/<[^>]*>/g, ' ')
    // Normalize dashes
    .replace(/[��‑‒–—―]/g, '-')
    // Remove non-printable characters
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    // Replace common abbreviations
    .replace(/Rev\./gi, 'Reverend')
    .replace(/Dr\./gi, 'Doctor')
    .replace(/St\./gi, 'Saint')
    .replace(/vs\./gi, 'versus')
    .replace(/etc\./gi, 'etcetera')
    // Remove common filler words in parentheses
    .replace(/\([Ll]aughter\)/g, '')
    .replace(/\([Aa]men\)/g, '')
    .replace(/\([Pp]ause\)/g, '')
    .replace(/\([Aa]pplause\)/g, '')
    // Normalize common Biblical terms
    .replace(/Jesus Christ/gi, 'Jesus')
    .replace(/Lord God/gi, 'Lord')
    .replace(/Holy Spirit/gi, 'Spirit')
    // Remove repetitive phrases
    .replace(/([A-Za-z]+)(\s+\1)+/gi, '$1')
    // Remove timestamps if present
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '')
    // Common sermon transitions
    .replace(/(?:In conclusion|To conclude|Finally|Lastly|In summary)/gi, '')
    // Common sermon interjections
    .replace(/(?:You see|You know|Let me tell you|Listen to this)/gi, '')
    // Standardize Biblical book names
    .replace(/First/gi, '1')
    .replace(/Second/gi, '2')
    .replace(/Third/gi, '3')
    .trim();

  // Extract potential metadata patterns
  const patterns = {
    date: cleanedText.match(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/)?.[0],
    speaker: cleanedText.match(/(?:Pastor|Reverend|Doctor|Rev\.|Dr\.)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/)?.[1],
    series: cleanedText.match(/(?:Series|Part|Message)[\s:]+(.*?)(?:\.|$)/i)?.[1],
    location: cleanedText.match(/(?:at|in|from)\s+([A-Z][a-zA-Z\s]+Church)/)?.[1],
    partNumber: cleanedText.match(/Part\s+(\d+)/i)?.[1],
    themes: cleanedText.match(/theme[s]?[\s:]+(.*?)(?:\.|$)/i)?.[1],
    events: cleanedText.match(/(?:event|historical|history)[\s:]+(.*?)(?:\.|$)/i)?.[1],
    wordCount: cleanedText.split(/\s+/).length,
    // Add tone detection based on emotional words
    tone: detectTone(cleanedText), // Would need to implement this function
  };

  // Build metadata hints
  const hints = Object.entries(patterns)
    .filter(([_, value]) => value)
    .map(([key, value]) => `Potential ${key}: ${value}`)
    .join('\n');

  // Extract Bible references
  const foundReferences = findBibleReferences(cleanedText);

  // Look for common sermon types
  const sermonTypeHints = {
    expository: /verse[- ]by[- ]verse|chapter[- ]by[- ]chapter/i.test(cleanedText),
    topical: /topic|theme|subject/i.test(cleanedText),
    narrative: /story|narrative|account/i.test(cleanedText),
  };

  const sermonTypeHint = Object.entries(sermonTypeHints)
    .filter(([_, isPresent]) => isPresent)
    .map(([type]) => `Possible ${type} sermon`)
    .join('\n');

  const openai = getOpenAIClient();


  // Max cost per sermon: 1.27 cents total
  // - Input: 4.5K tokens = 0.45 cents ($0.0045)
  // - Output: 4K tokens = 0.82 cents ($0.0082)
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    messages: [
      {
        role: "system",
        content: `Extract sermon metadata. Bible references have been pre-processed: ${foundReferences.join(', ')}
        ${hints ? '\nPre-processed hints:\n' + hints : ''}
        ${sermonTypeHint ? '\nSermon type hints:\n' + sermonTypeHint : ''}
        - title: string
        - date: YYYY-MM-DD
        - preacher: string
        - primary_scripture: string (e.g., "Matthew 21:1-11")
        - scriptures: array of references ["Matthew 21:1-11", "Zechariah 9:9"]
        - topics: array [1-3 topics]
        - summary: string (100-200 words)
        - series: string
        - sermon_type: "expository"|"textual"|"topical"|"narrative"
        - tags: array [1-3 tags] (must be one of the following: ${SERMON_TAGS.join(', ')})
        - illustrations: array of strings (give details of the illustration)
        - key_points: array [1-3 key points]
        - location: string
        - themes: array [1-3 themes]
        - calls_to_action: array [1-3 calls to action]
        - personal_stories: array [1-3 personal stories]
        - tone: string
        - mentioned_people: array [1-3 people mentioned]
        - mentioned_events: array [1-3 events mentioned]
        - engagement_tags: array [1-3 audience engagement prompts]
        - word_count: integer
        - keywords: array [1-10 frequently used keywords]
        - confidence: object with score for each field (0-1)

        Return JSON with the fields above.
        If you cannot find a field, return null.`
      },
      {
        role: "user",
        content: cleanedText
      }
    ],
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 4096
  });

  console.log('OpenAI response:', response.choices[0].message.content);

  return JSON.parse(response.choices[0].message.content || '{}');
}