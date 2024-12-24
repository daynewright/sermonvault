import { findBibleReferences } from './bible-parser';
import { getOpenAIClient } from '@/app/api/lib/clients/openai';
import { SERMON_TYPES, SERMON_TAGS } from '@/types/sermonData';
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
    .filter(([, count]) => count === maxCount)
    .map(([tone]) => tone);

  return dominantTones.length > 1 
    ? `${dominantTones[0]} and ${dominantTones[1]}`
    : dominantTones[0];
}

export async function extractSermonMetadata(text: string) {
  // Keep regex pre-processing for hints
  const hints = {
    date: text.match(/(?:\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i)?.[0]?.replace(/\s+/g, ' '),
    preacher: text.match(/(?:(?:Pastor|Reverend|Doctor|Rev\.|Dr\.|Minister|Elder|Bishop|Father|Apostle)\s+)([A-Z][a-z]+(?:\s+(?:van |de |von )?[A-Z][a-z]+){1,2})/)?.[1]?.replace(/\s+/g, ' '),
    location: text.match(/(?:(?:at|in|from)\s+)?(?:(?:the\s+)?([A-Z][a-zA-Z\s']+(?:Church|Temple|Cathedral|Chapel|Sanctuary|Fellowship|Ministries|Assembly|Tabernacle)))/)?.[1]?.replace(/\s+/g, ' '),
    word_count: text.split(/\s+/).length,
    tone: detectTone(text),
    key_points: [
      ...text.matchAll(/(?:point (?:number )?[#\d]+|first(?:ly)?|second(?:ly)?|third(?:ly)?|finally|main point|key point|principle|lesson)[:\s]+([^.!?]{10,200}[.!?])/gi),
      ...text.matchAll(/(?:^\s*[\d#]+[\.)]\s*|^\s*[A-Z]\.\s+|•\s+)([^.!?]{10,200}[.!?])/gim),
      ...text.matchAll(/(?:takeaway|remember this|important truth)[:\s]+([^.!?]{10,200}[.!?])/gi)
    ].map(match => match[1]?.replace(/\s+/g, ' ').trim()),
    illustrations: [
      ...text.matchAll(/(?:let me illustrate|here's an illustration|for example|imagine|picture this|consider this|think about|story of|parable|analogy|like|just as)[:\s]+([^.!?]+(?:[.!?]+[^.!?]+){0,3})/gi)
    ].map(match => match[1]?.replace(/\s+/g, ' ').trim()),
  };

  const foundReferences = findBibleReferences(text);

  const openai = getOpenAIClient();

  // Single comprehensive analysis
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    messages: [
      {
        role: "system",
        content: `Analyze this sermon comprehensively. Pre-processed data:
        - Bible references: ${foundReferences.join(', ')}
        ${hints ? '\nPre-processed hints:\n' + JSON.stringify(hints, null, 2) : ''}

        Return JSON with ALL required fields and confidence scores:
        {
          // Core Content
          "primary_scripture": string | null,
          "scriptures": string[] | null,
          "summary": string | null,
          "sermon_type": MUST be EXACTLY one of: ${SERMON_TYPES.join(', ')} | null,
          "key_points": string[] | null,
          "illustrations": string[] | null,
          "themes": string[] | null,
          "calls_to_action": string[] | null,
          "word_count": number | null,
          
          // Narrative Elements
          "personal_stories": string[] | null,
          "mentioned_people": string[] | null,
          "mentioned_events": string[] | null,
          "tone": string | null,
          
          // Metadata
          "title": string | null,
          "date": string | null,
          "preacher": string | null,
          "topics": string[] | null,
          "tags": MUST be array of EXACTLY these values (max 3): ${SERMON_TAGS.join(', ')} | null,
          "series": string | null,
          "location": string | null,
          "keywords": string[] | null,
          
          // ALL confidence scores required (0-1)
          "confidence": {
            "primary_scripture": number,
            "scriptures": number,
            "summary": number,
            "sermon_type": number,
            "key_points": number,
            "illustrations": number,
            "themes": number,
            "calls_to_action": number,
            "word_count": number,
            "personal_stories": number,
            "mentioned_people": number,
            "mentioned_events": number,
            "engagement_tags": number,
            "tone": number,
            "title": number,
            "date": number,
            "preacher": number,
            "topics": number,
            "tags": number,
            "series": number,
            "location": number,
            "keywords": number
          }
        }

        CRITICAL REQUIREMENTS:
        1. Include ALL confidence scores (0-1) even if field is null
        2. sermon_type must be exactly one of the listed values
        3. tags must be from provided list (max 3)
        4. Use null for any field you cannot confidently determine
        5. Analyze thoroughly before providing any field`
      },
      {
        role: "user",
        content: text
      }
    ],
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 4000
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  // Validate sermon_type
  if (result.sermon_type) {
    const cleanedType = result.sermon_type.toLowerCase().replace(/\s+sermon$/, '');
    result.sermon_type = SERMON_TYPES.includes(cleanedType as any) ? cleanedType : null;
    if (!result.sermon_type) {
      result.confidence.sermon_type = 0;
    }
  }

  // Validate tags
  if (result.tags) {
    result.tags = result.tags
      .filter((tag: string) => SERMON_TAGS.includes(tag as any))
      .slice(0, 3);
    
    if (result.tags.length === 0) {
      result.tags = null;
      result.confidence.tags = 0;
    }
  }

  return {
    ...result,
    confidence_scores: result.confidence
  };
}