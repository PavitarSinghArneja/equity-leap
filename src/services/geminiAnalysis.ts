import { GoogleGenerativeAI } from '@google/generative-ai';

export interface PropertyNote {
  id: string;
  notes: string;
  created_at: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
}

export interface SentimentAnalysis {
  overall_sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentiment_score: number; // -1 to 1 scale
  confidence: number; // 0 to 1 scale
}

export interface PropertyInsights {
  property_id: string;
  property_name: string;
  total_notes: number;
  sentiment_analysis: SentimentAnalysis;
  key_themes: string[];
  common_concerns: string[];
  positive_highlights: string[];
  improvement_suggestions: string[];
  user_behavior_insights: string[];
  marketing_recommendations: string[];
  investment_appeal: {
    score: number; // 1-10 scale
    reasoning: string;
  };
  summary: string;
  analyzed_at: string;
}

export interface AnalysisError {
  error: string;
  details?: string;
}

class GeminiAnalysisService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    this.initializeAPI();
  }

  private initializeAPI() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment.');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
    }
  }

  private formatNotesForAnalysis(notes: PropertyNote[]): string {
    if (notes.length === 0) {
      return "No notes available for analysis.";
    }

    return notes.map((note, index) => {
      const userInfo = note.user_email || note.user_name || `User ${note.user_id}`;
      const date = new Date(note.created_at).toLocaleDateString();
      return `Note ${index + 1} (${userInfo}, ${date}):\n${note.notes.trim()}`;
    }).join('\n\n---\n\n');
  }

  private createAnalysisPrompt(propertyName: string, formattedNotes: string): string {
    return `
You are a real estate market analyst specialized in sentiment analysis and user behavior insights.

Analyze the following user notes for property "${propertyName}" and provide a comprehensive analysis in the exact JSON format specified below.

USER NOTES:
${formattedNotes}

Provide your analysis in this exact JSON structure (do not include any text outside the JSON):

{
  "overall_sentiment": "positive|negative|neutral|mixed",
  "sentiment_score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "key_themes": [<array of 3-5 main themes mentioned across notes>],
  "common_concerns": [<array of concerns or negative aspects mentioned>],
  "positive_highlights": [<array of positive aspects and attractions mentioned>],
  "improvement_suggestions": [<array of specific improvement suggestions based on user feedback>],
  "user_behavior_insights": [<array of insights about user behavior and psychology>],
  "marketing_recommendations": [<array of marketing strategy recommendations based on the sentiment>],
  "investment_appeal": {
    "score": <number from 1-10 representing investment attractiveness>,
    "reasoning": "<explanation for the score>"
  },
  "summary": "<3-4 sentence summary of overall user sentiment and key insights>"
}

Guidelines:
- Be objective and data-driven in your analysis
- Focus on actionable insights for property management and sales
- Consider both explicit and implicit sentiment in the notes
- Provide practical, implementable recommendations
- If there are contradictory opinions, reflect this in the "mixed" sentiment
- Base investment_appeal score on user enthusiasm, concerns, and market indicators mentioned
`;
  }

  async analyzePropertyNotes(
    propertyId: string,
    propertyName: string,
    notes: PropertyNote[]
  ): Promise<PropertyInsights | AnalysisError> {
    if (!this.model) {
      return {
        error: 'Gemini API not initialized',
        details: 'Please check your API key configuration'
      };
    }

    if (notes.length === 0) {
      return {
        error: 'No notes available',
        details: 'This property has no user notes to analyze'
      };
    }

    try {
      const formattedNotes = this.formatNotesForAnalysis(notes);
      const prompt = this.createAnalysisPrompt(propertyName, formattedNotes);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          error: 'Invalid response format',
          details: 'Could not parse AI response as JSON'
        };
      }

      const analysisData = JSON.parse(jsonMatch[0]);

      // Construct full insights object
      const insights: PropertyInsights = {
        property_id: propertyId,
        property_name: propertyName,
        total_notes: notes.length,
        sentiment_analysis: {
          overall_sentiment: analysisData.overall_sentiment,
          sentiment_score: analysisData.sentiment_score,
          confidence: analysisData.confidence
        },
        key_themes: analysisData.key_themes || [],
        common_concerns: analysisData.common_concerns || [],
        positive_highlights: analysisData.positive_highlights || [],
        improvement_suggestions: analysisData.improvement_suggestions || [],
        user_behavior_insights: analysisData.user_behavior_insights || [],
        marketing_recommendations: analysisData.marketing_recommendations || [],
        investment_appeal: analysisData.investment_appeal || { score: 5, reasoning: 'No specific reasoning provided' },
        summary: analysisData.summary || 'Analysis completed successfully.',
        analyzed_at: new Date().toISOString()
      };

      return insights;

    } catch (error) {
      console.error('Gemini analysis error:', error);
      return {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.model) {
      return false;
    }

    try {
      const result = await this.model.generateContent("Test message. Respond with 'OK'.");
      const response = await result.response;
      return response.text().includes('OK');
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}

export const geminiAnalysisService = new GeminiAnalysisService();