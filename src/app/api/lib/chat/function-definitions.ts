export const sermonFunctionDefinitions = [
  {
    name: "getTopicOverview",
    description: "Get an overview of sermons about a specific topic",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The topic to analyze (e.g., 'forgiveness', 'grace', 'prayer')"
        }
      },
      required: ["topic"]
    }
  },
  {
    name: "analyzePreachingPatterns",
    description: "Analyze preaching patterns over time",
    parameters: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          enum: ["year", "month", "season"],
          description: "The timeframe to analyze patterns over"
        }
      },
      required: ["timeframe"]
    }
  },
  {
    name: "findRelatedSermons",
    description: "Find sermons related to a specific sermon",
    parameters: {
      type: "object",
      properties: {
        sermonId: {
          type: "string",
          description: "The UUID of the sermon to find related content for"
        },
        limit: {
          type: "integer",
          description: "Maximum number of related sermons to return",
          default: 5
        }
      },
      required: ["sermonId"]
    }
  },
  {
    name: "analyzeScriptureUsage",
    description: "Analyze how scriptures are used in sermons",
    parameters: {
      type: "object",
      properties: {
        book: {
          type: "string",
          description: "Optional Bible book to filter by (e.g., 'Romans', 'John')"
        }
      }
    }
  },
  {
    name: "analyzeThemeDevelopment",
    description: "Analyze how a theme has developed over time",
    parameters: {
      type: "object",
      properties: {
        theme: {
          type: "string",
          description: "The theme to analyze development of"
        }
      },
      required: ["theme"]
    }
  },
  {
    name: "analyzeIllustrations",
    description: "Analyze the use of illustrations in sermons",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Optional topic to filter illustrations by"
        }
      }
    }
  },
  {
    name: "analyzeSermonSeries",
    description: "Analyze sermon series data",
    parameters: {
      type: "object",
      properties: {
        seriesName: {
          type: "string",
          description: "Optional specific series name to analyze"
        }
      }
    }
  },
  {
    name: "analyzeSermonStyle",
    description: "Analyze preaching styles and patterns",
    parameters: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          enum: ["all", "year", "month"],
          description: "Timeframe to analyze sermon styles over",
          default: "all"
        }
      }
    }
  },
  {
    name: "analyzePersonalStories",
    description: "Analyze the use of personal stories in sermons",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Optional topic to filter personal stories by"
        }
      }
    }
  },
  {
    name: "analyzeSermonTone",
    description: "Analyze the emotional tone of sermons",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Optional topic to analyze tone for"
        }
      }
    }
  }
];