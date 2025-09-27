import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, StickyNote, User, Building2, Calendar } from 'lucide-react';

interface PropertyNote {
  id: string;
  user_id: string;
  property_id: string;
  notes: string;
  added_at: string;
  user_profiles: {
    full_name: string;
    email: string;
    tier: string;
  };
  properties: {
    title: string;
    city: string;
    country: string;
  };
}

const PropertyNotes = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<PropertyNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Check admin access
  useEffect(() => {
    if (profile && !profile.is_admin) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  // Fetch notes
  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select(`
          id,
          user_id,
          property_id,
          notes,
          added_at,
          user_profiles:user_id (
            full_name,
            email,
            tier
          ),
          properties:property_id (
            title,
            city,
            country
          )
        `)
        .not('notes', 'is', null)
        .neq('notes', '')
        .order('added_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.is_admin) {
      fetchNotes();
    }
  }, [profile]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!profile?.is_admin) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <div className="text-center">Loading property notes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin')}
          className="mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <StickyNote className="w-8 h-8 mr-3 text-blue-600" />
            Property Notes
          </h1>
          <p className="text-muted-foreground">View all user notes on properties</p>
        </div>
      </div>

      <div className="grid gap-4">
        {notes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <StickyNote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Notes Found</h3>
              <p className="text-muted-foreground">
                Users haven't added any notes to properties yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{note.user_profiles?.full_name || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">{note.user_profiles?.email}</p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {note.user_profiles?.tier || 'explorer'}
                    </Badge>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(note.added_at)}
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-3">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{note.properties?.title || 'Unknown Property'}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {note.properties?.city}, {note.properties?.country}
                  </span>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{note.notes}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PropertyNotes;