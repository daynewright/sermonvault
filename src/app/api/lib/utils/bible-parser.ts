import bcv_parser from 'bible-passage-reference-parser/js/en_bcv_parser.js';

export function findBibleReferences(text: string): string[] {
  try {
    const bcv = new bcv_parser.bcv_parser();
    const parsed = bcv.parse(text);
    
    // Get OSIS references (standardized format)
    const references = parsed.osis_and_translations();
    
    // Extract just the OSIS references without translations
    const standardized = references.map(ref => ref[0]);
    
    // Remove duplicates
    return [...new Set(standardized)];
  } catch (error) {
    console.error('Error parsing Bible references:', error);
    return [];
  }
}