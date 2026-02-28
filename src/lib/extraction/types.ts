export interface FetchResult {
  html: string;
  cleanedHtml: string;
  url: string;
  httpStatus: number;
}

export interface ExtractionPromptData {
  cleanedHtml: string;
  url: string;
}
