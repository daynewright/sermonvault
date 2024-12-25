export type SermonField = {
  value: string | string[] | number | null;
  confidence: number;
};

export type SermonData = {
  id: SermonField;
  // Core Content
  primary_scripture: SermonField;
  scriptures: SermonField;
  summary: SermonField;
  sermon_type: SermonField;
  key_points: SermonField;
  illustrations: SermonField;
  themes: SermonField;
  calls_to_action: SermonField;
  word_count: SermonField;
  
  // Narrative Elements
  personal_stories: SermonField;
  mentioned_people: SermonField;
  mentioned_events: SermonField;
  engagement_tags: SermonField;
  tone: SermonField;
  
  // Metadata
  title: SermonField;
  date: SermonField;
  preacher: SermonField;
  topics: SermonField;
  tags: SermonField;
  series: SermonField;
  location: SermonField;
  keywords: SermonField;
}; 


export const SERMON_TYPES = ['expository', 'textual', 'topical', 'narrative'] as const;
export const SERMON_TAGS = [
  'salvation', 'discipleship', 'faith', 'prayer', 'relationships',
  'spiritual-warfare', 'evangelism', 'healing', 'worship', 'stewardship',
  'identity', 'community', 'character', 'biblical-history', 'prophecy'
] as const;