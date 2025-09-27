import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { geminiAnalysisService, PropertyNote, PropertyInsights, AnalysisError } from '@/services/geminiAnalysis';

export interface Property {
  id: string;
  name: string;
  city: string;
  state: string;
}

export const usePropertyNotesAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<PropertyInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get all properties for selection dropdown
  const getProperties = useCallback(async (): Promise<Property[]> => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, city, state')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching properties:', err);
      return [];
    }
  }, []);

  // Get all notes for a specific property
  const getPropertyNotes = useCallback(async (propertyId: string): Promise<PropertyNote[]> => {
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select(`
          id,
          notes,
          created_at,
          user_id,
          profiles!inner(
            email,
            full_name
          )
        `)
        .eq('property_id', propertyId)
        .not('notes', 'is', null)
        .neq('notes', '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match PropertyNote interface
      const notes: PropertyNote[] = (data || []).map(item => ({
        id: item.id,
        notes: item.notes,
        created_at: item.created_at,
        user_id: item.user_id,
        user_email: item.profiles?.email,
        user_name: item.profiles?.full_name
      }));

      return notes;
    } catch (err) {
      console.error('Error fetching property notes:', err);
      throw err;
    }
  }, []);

  // Analyze notes for a property using Gemini AI
  const analyzeProperty = useCallback(async (propertyId: string, propertyName: string) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // Get all notes for the property
      const notes = await getPropertyNotes(propertyId);

      if (notes.length === 0) {
        setError('No notes found for this property. Users need to add notes before analysis can be performed.');
        return;
      }

      // Analyze notes with Gemini
      const result = await geminiAnalysisService.analyzePropertyNotes(propertyId, propertyName, notes);

      if ('error' in result) {
        setError(`Analysis failed: ${result.error}${result.details ? ` - ${result.details}` : ''}`);
      } else {
        setAnalysis(result);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during analysis');
    } finally {
      setLoading(false);
    }
  }, [getPropertyNotes]);

  // Test Gemini API connection
  const testGeminiConnection = useCallback(async (): Promise<boolean> => {
    try {
      return await geminiAnalysisService.testConnection();
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }, []);

  // Clear current analysis
  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    // State
    loading,
    analysis,
    error,

    // Functions
    getProperties,
    getPropertyNotes,
    analyzeProperty,
    testGeminiConnection,
    clearAnalysis
  };
};