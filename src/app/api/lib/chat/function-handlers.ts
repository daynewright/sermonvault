import { SupabaseClient } from '@supabase/supabase-js';

type FunctionHandlerParams = {
  supabase: SupabaseClient;
  userId: string;
  parameters: Record<string, any>;
};

export const functionHandlers = {
  getTopicOverview: async ({ supabase, userId, parameters }: FunctionHandlerParams) => {
    const { data, error } = await supabase.rpc('get_topic_overview', {
      p_topic: parameters.topic,
      p_user_id: userId
    });

    console.log('getTopicOverview data:', data);
    if (error) throw error;
    return data;
  },

  analyzePreachingPatterns: async ({ supabase, userId, parameters }: FunctionHandlerParams) => {
    const { data, error } = await supabase.rpc('analyze_preaching_patterns', {
      p_user_id: userId,
      p_timeframe: parameters.timeframe
    });

    if (error) throw error;
    return data;
  },

  findRelatedSermons: async ({ supabase, userId, parameters }: FunctionHandlerParams) => {
    const { data, error } = await supabase.rpc('find_related_sermons', {
      p_sermon_id: parameters.sermonId,
      p_user_id: userId,
      p_limit: parameters.limit || 5
    });

    if (error) throw error;
    return data;
  },

  analyzeScriptureUsage: async ({ supabase, userId, parameters }: FunctionHandlerParams) => {
    const { data, error } = await supabase.rpc('analyze_scripture_usage', {
      p_user_id: userId,
      p_book: parameters.book || null
    });

    if (error) throw error;
    return data;
  },

  analyzeThemeDevelopment: async ({ supabase, userId, parameters }: FunctionHandlerParams) => {
    const { data, error } = await supabase.rpc('analyze_theme_development', {
      p_user_id: userId,
      p_theme: parameters.theme
    });

    if (error) throw error;
    return data;
  },

  analyzeIllustrations: async ({ supabase, userId, parameters }: FunctionHandlerParams) => {
    const { data, error } = await supabase.rpc('analyze_illustrations', {
      p_user_id: userId,
      p_topic: parameters.topic || null
    });

    if (error) throw error;
    return data;
  },

  analyzeSermonSeries: async ({ supabase, userId, parameters }: FunctionHandlerParams) => {
    const { data, error } = await supabase.rpc('analyze_sermon_series', {
      p_user_id: userId,
      p_series_name: parameters.seriesName || null
    });

    if (error) throw error;
    return data;
  },

  analyzeSermonStyle: async ({ supabase, userId, parameters }: FunctionHandlerParams) => {
    const { data, error } = await supabase.rpc('analyze_sermon_style', {
      p_user_id: userId,
      p_timeframe: parameters.timeframe || 'all'
    });

    if (error) throw error;
    return data;
  },

  analyzePersonalStories: async ({ supabase, userId, parameters }: FunctionHandlerParams) => {
    const { data, error } = await supabase.rpc('analyze_personal_stories', {
      p_user_id: userId,
      p_topic: parameters.topic || null
    });

    if (error) throw error;
    return data;
  },

  analyzeSermonTone: async ({ supabase, userId, parameters }: FunctionHandlerParams) => {
    const { data, error } = await supabase.rpc('analyze_sermon_tone', {
      p_user_id: userId,
      p_topic: parameters.topic || null
    });

    if (error) throw error;
    return data;
  }
};

// Add type safety for function names
export type FunctionName = keyof typeof functionHandlers;

// Helper to validate if a function name exists
export function isFunctionName(name: string): name is FunctionName {
  return name in functionHandlers;
}

// Error class for function handling
export class FunctionHandlerError extends Error {
  constructor(
    message: string,
    public functionName: string,
    public parameters: Record<string, any>
  ) {
    super(message);
    this.name = 'FunctionHandlerError';
  }
} 