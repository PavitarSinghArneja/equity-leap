import React, { useState, useEffect } from 'react';
import { usePropertyNotesAnalysis, Property } from '@/hooks/usePropertyNotesAnalysis';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, TrendingUp, AlertCircle, Lightbulb, Target, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const PropertyNotesAIAnalysis: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);

  const {
    loading: analyzing,
    analysis,
    error,
    getProperties,
    analyzeProperty,
    clearAnalysis
  } = usePropertyNotesAnalysis();

  // Load properties on component mount
  useEffect(() => {
    const loadProperties = async () => {
      setIsLoadingProperties(true);
      try {
        const props = await getProperties();
        setProperties(props);
      } catch (err) {
        console.error('Failed to load properties:', err);
      } finally {
        setIsLoadingProperties(false);
      }
    };

    loadProperties();
  }, [getProperties]);

  const handleAnalyze = async () => {
    if (!selectedProperty) return;

    clearAnalysis();
    await analyzeProperty(selectedProperty.id, selectedProperty.name);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 border-green-200';
      case 'negative': return 'bg-red-100 text-red-800 border-red-200';
      case 'neutral': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'mixed': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      case 'neutral': return '😐';
      case 'mixed': return '🤔';
      default: return '❓';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50';
    if (score >= 6) return 'text-yellow-600 bg-yellow-50';
    if (score >= 4) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Property Notes Analysis
          </CardTitle>
          <CardDescription>
            Use Gemini AI to analyze user sentiment and extract insights from all notes for a specific property.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Property Selection */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Property</label>
              <Select
                value={selectedProperty?.id || ''}
                onValueChange={(value) => {
                  const property = properties.find(p => p.id === value);
                  setSelectedProperty(property || null);
                  clearAnalysis();
                }}
                disabled={isLoadingProperties}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoadingProperties ? "Loading properties..." : "Choose a property to analyze"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name} - {property.city}, {property.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={!selectedProperty || analyzing || isLoadingProperties}
              className="flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  Analyze Notes
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Analysis Overview</span>
                <Badge variant="outline" className="text-xs">
                  {analysis.total_notes} notes analyzed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Sentiment */}
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-2xl mb-2">
                    {getSentimentIcon(analysis.sentiment_analysis.overall_sentiment)}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(analysis.sentiment_analysis.overall_sentiment)}`}>
                    {analysis.sentiment_analysis.overall_sentiment.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Score: {analysis.sentiment_analysis.sentiment_score.toFixed(2)}
                  </div>
                </div>

                {/* Investment Appeal */}
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className={`px-3 py-1 rounded-lg text-lg font-bold ${getScoreColor(analysis.investment_appeal.score)}`}>
                    {analysis.investment_appeal.score}/10
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Investment Appeal</div>
                </div>

                {/* Confidence */}
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-lg font-bold text-blue-600">
                    {Math.round(analysis.sentiment_analysis.confidence * 100)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Confidence Level</div>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
                <p className="text-blue-800 text-sm">{analysis.summary}</p>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Key Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4" />
                  Key Themes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.key_themes.map((theme, index) => (
                    <Badge key={index} variant="secondary" className="mr-2 mb-2">
                      {theme}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Positive Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="text-green-600">✨</span>
                  Positive Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.positive_highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-1">•</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Common Concerns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  Common Concerns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.common_concerns.map((concern, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-orange-500 mt-1">•</span>
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Improvement Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Improvement Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.improvement_suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Business Intelligence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Marketing Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-4 h-4 text-purple-500" />
                  Marketing Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.marketing_recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-purple-500 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* User Behavior Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  User Behavior Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.user_behavior_insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Investment Appeal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4" />
                Investment Appeal Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-3">
                <div className={`px-4 py-2 rounded-lg ${getScoreColor(analysis.investment_appeal.score)}`}>
                  <span className="text-2xl font-bold">{analysis.investment_appeal.score}</span>
                  <span className="text-sm ml-1">/ 10</span>
                </div>
              </div>
              <p className="text-sm text-gray-700">{analysis.investment_appeal.reasoning}</p>
            </CardContent>
          </Card>

          {/* Analysis Metadata */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-gray-500 text-center">
                Analysis completed on {new Date(analysis.analyzed_at).toLocaleString()} using Gemini AI
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};