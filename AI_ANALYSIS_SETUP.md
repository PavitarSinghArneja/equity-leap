# AI Property Notes Analysis Setup Guide

## Overview
The AI Property Notes Analysis feature uses Google's Gemini AI to analyze user sentiment and extract insights from property notes. This helps admins understand user psychology and make data-driven decisions.

## Features
- **Sentiment Analysis**: Determines overall user sentiment (positive, negative, neutral, mixed)
- **Key Themes Extraction**: Identifies main topics and themes in user notes
- **Investment Appeal Scoring**: Rates properties on a 1-10 investment attractiveness scale
- **Marketing Recommendations**: Provides actionable marketing strategies
- **User Behavior Insights**: Understands user psychology and decision factors
- **Improvement Suggestions**: Identifies areas for property enhancement

## Setup Instructions

### 1. Get Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the generated API key

### 2. Configure Environment Variables
1. Copy `.env.example` to `.env` if you haven't already:
   ```bash
   cp .env.example .env
   ```

2. Add your Gemini API key to the `.env` file:
   ```env
   VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

### 3. Install Dependencies
The Google Generative AI package has been automatically installed. If you need to reinstall:
```bash
npm install @google/generative-ai
```

## How to Use

### Accessing the Feature
1. Login as an admin user
2. Navigate to `/admin`
3. Click on the "Property Notes" tab
4. The AI Analysis section will be at the top of the page

### Analyzing Property Notes
1. **Select a Property**: Use the dropdown to choose which property to analyze
2. **Click "Analyze Notes"**: This will process all user notes for that property
3. **View Results**: The analysis includes:
   - Overall sentiment with confidence score
   - Investment appeal rating (1-10)
   - Key themes and positive highlights
   - Common concerns and improvement suggestions
   - Marketing recommendations and user behavior insights

### Understanding the Results

#### Sentiment Analysis
- **Score Range**: -1 (very negative) to +1 (very positive)
- **Confidence**: How certain the AI is about its assessment
- **Categories**: Positive, Negative, Neutral, or Mixed

#### Investment Appeal Score
- **1-3**: Low appeal, significant concerns
- **4-6**: Moderate appeal, mixed feedback
- **7-8**: High appeal, mostly positive sentiment
- **9-10**: Exceptional appeal, strong user enthusiasm

#### Key Insights Sections
- **Key Themes**: Main topics users discuss about the property
- **Positive Highlights**: What users love about the property
- **Common Concerns**: Issues or hesitations users have
- **Improvement Suggestions**: Specific areas to enhance
- **Marketing Recommendations**: How to better market the property
- **User Behavior Insights**: Psychology behind user decisions

## Data Requirements
- The analysis requires at least one user note for the selected property
- More notes provide better and more accurate analysis
- Only notes from watchlist entries are analyzed (users who have saved the property)

## Error Handling
The system handles various error scenarios:
- **No API Key**: Clear error message with setup instructions
- **No Notes**: Notification that users need to add notes first
- **API Failures**: Graceful error handling with retry suggestions
- **Network Issues**: Automatic timeout and error recovery

## Privacy and Security
- Notes are sent to Google's Gemini AI for analysis
- No personal user data (emails, names) is included in the analysis
- Only the note content and basic property information is processed
- API calls are made client-side with your own API key

## Cost Considerations
- Gemini AI has a generous free tier
- Each analysis costs approximately $0.001-0.01 depending on note length
- Monitor your API usage in [Google AI Studio](https://aistudio.google.com/app/apikey)

## Troubleshooting

### "API Not Initialized" Error
1. Check that `VITE_GEMINI_API_KEY` is set in your `.env` file
2. Restart your development server after adding the API key
3. Verify the API key is valid and active

### "No Notes Available" Error
1. Ensure users have added notes to their watchlist for the selected property
2. Check that the property has been saved to users' watchlists
3. Verify the database connection is working

### "Analysis Failed" Error
1. Check your internet connection
2. Verify the API key hasn't exceeded its quota
3. Try analyzing a property with fewer notes first

## Support
If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify all environment variables are properly set
3. Ensure the Gemini API key is valid and has quota remaining
4. Test with properties that have existing user notes

## Future Enhancements
- **Batch Analysis**: Analyze multiple properties at once
- **Historical Tracking**: Track sentiment changes over time
- **Automated Alerts**: Notifications when sentiment drops significantly
- **Export Reports**: Download analysis results as PDF or CSV
- **Custom Prompts**: Customize the AI analysis prompts for specific needs