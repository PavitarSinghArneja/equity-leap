import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { isAdmin, getTierDisplayName } from '@/utils/permissions';
import {
  StickyNote,
  Search,
  Building2,
  User,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  MapPin
} from 'lucide-react';

interface UserNote {
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
    property_type: string;
    property_status: string;
  };
}

const AdminPropertyNotes: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterProperty, setFilterProperty] = useState('all');
  const [properties, setProperties] = useState<Array<{ id: string; title: string }>>([]);

  // Redirect non-admin users
  useEffect(() => {
    if (profile && !isAdmin(profile)) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select(`
          id,
          user_id,
          property_id,
          notes,
          added_at,
          user_profiles (
            full_name,
            email,
            tier
          ),
          properties (
            title,
            city,
            country,
            property_type,
            property_status
          )
        `)
        .not('notes', 'is', null)
        .not('notes', 'eq', '')
        .order('added_at', { ascending: false });

      if (error) throw error;

      setNotes(data as UserNote[]);

      // Extract unique properties for filter
      const uniqueProperties = Array.from(
        new Map(
          data.map((note: UserNote) => [
            note.property_id,
            { id: note.property_id, title: note.properties.title }
          ])
        ).values()
      );
      setProperties(uniqueProperties);

    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin(profile)) {
      fetchNotes();
    }
  }, [profile]);

  const filteredNotes = notes.filter(note => {
    const matchesSearch =
      note.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.properties.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.user_profiles.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.user_profiles.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTier = filterTier === 'all' || note.user_profiles.tier === filterTier;
    const matchesProperty = filterProperty === 'all' || note.property_id === filterProperty;

    return matchesSearch && matchesTier && matchesProperty;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportNotes = () => {
    const csvContent = [
      ['Property', 'User Name', 'User Email', 'User Tier', 'Notes', 'Date Added'],
      ...filteredNotes.map(note => [
        note.properties.title,
        note.user_profiles.full_name || 'N/A',
        note.user_profiles.email,
        getTierDisplayName(note.user_profiles.tier),
        `"${note.notes.replace(/"/g, '""')}"`, // Escape quotes in CSV
        formatDate(note.added_at)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `property-notes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (!isAdmin(profile)) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <StickyNote className="w-6 h-6 mr-2" />
            Property Notes Dashboard
          </CardTitle>
          <CardDescription>
            View and manage all user notes for properties. Total notes: {filteredNotes.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search notes, properties, or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by user tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="waitlist_player">Waitlist Player</SelectItem>
                <SelectItem value="small_investor">Small Investor</SelectItem>
                <SelectItem value="large_investor">Large Investor</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterProperty} onValueChange={setFilterProperty}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchNotes}
                disabled={loading}
                className="flex-1"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={exportNotes}
                disabled={filteredNotes.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Notes List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading notes...</p>
              </div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <StickyNote className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium">No notes found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm || filterTier !== 'all' || filterProperty !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No users have added notes to their watchlisted properties yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotes.map((note) => (
                <Card key={note.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* Property Info */}
                      <div className="lg:col-span-1">
                        <div className="flex items-start space-x-3">
                          <Building2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-sm truncate">
                              {note.properties.title}
                            </h4>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              {note.properties.city}, {note.properties.country}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {note.properties.property_type}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  note.properties.property_status === 'open'
                                    ? 'border-green-500 text-green-700'
                                    : note.properties.property_status === 'funded'
                                    ? 'border-purple-500 text-purple-700'
                                    : 'border-gray-500 text-gray-700'
                                }`}
                              >
                                {note.properties.property_status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="lg:col-span-1">
                        <div className="flex items-start space-x-3">
                          <User className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-sm">
                              {note.user_profiles.full_name || 'Anonymous'}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate">
                              {note.user_profiles.email}
                            </p>
                            <Badge className="mt-2 text-xs">
                              {getTierDisplayName(note.user_profiles.tier)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Notes Content */}
                      <div className="lg:col-span-2">
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {note.notes}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 mr-1" />
                            Added {formatDate(note.added_at)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {note.notes.length} characters
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPropertyNotes;