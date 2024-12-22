declare module 'bible-passage-reference-parser/js/en_bcv_parser.js' {
  class BCVParser {
    parse(text: string): BCVParser;
    osis(): string;
    osis_and_translations(): [string, string][];
    parsed_entities(): any[];
  }

  interface BCV {
    bcv_parser: new () => BCVParser;
  }

  const bcv_parser: BCV;
  export default bcv_parser;
} 