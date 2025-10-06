import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsService } from '@/services/AnalyticsService';

const TestAnalytics = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testDirectRPC = async () => {
    setLoading(true);
    setResult('Testing direct RPC call...');
    try {
      const { data, error } = await supabase.rpc('log_user_event', {
        p_event_name: 'test_event',
        p_property_id: null,
        p_props: { test: true }
      });

      if (error) {
        setResult(`❌ RPC Error: ${error.message}\nCode: ${error.code}\nDetails: ${JSON.stringify(error.details)}`);
      } else {
        setResult(`✅ RPC Success! Data: ${JSON.stringify(data)}`);
      }
    } catch (e: any) {
      setResult(`❌ Exception: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testAnalyticsService = async () => {
    setLoading(true);
    setResult('Testing AnalyticsService...');
    try {
      await AnalyticsService.login();
      setResult('✅ AnalyticsService.login() called (check console for details)');
    } catch (e: any) {
      setResult(`❌ Exception: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkUserEvents = async () => {
    setLoading(true);
    setResult('Fetching recent events...');
    try {
      const { data, error } = await supabase
        .from('user_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        setResult(`❌ Query Error: ${error.message}`);
      } else {
        setResult(`✅ Found ${data?.length || 0} events:\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (e: any) {
      setResult(`❌ Exception: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkLastActivity = async () => {
    setLoading(true);
    setResult('Checking last_activity_at...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setResult('❌ Not logged in');
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, email, last_activity_at')
        .eq('user_id', user.id)
        .single();

      if (error) {
        setResult(`❌ Query Error: ${error.message}`);
      } else {
        setResult(`✅ User Profile:\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (e: any) {
      setResult(`❌ Exception: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Analytics Testing Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={testDirectRPC} disabled={loading}>
              Test Direct RPC Call
            </Button>
            <Button onClick={testAnalyticsService} disabled={loading}>
              Test AnalyticsService
            </Button>
            <Button onClick={checkUserEvents} disabled={loading}>
              Check User Events
            </Button>
            <Button onClick={checkLastActivity} disabled={loading}>
              Check Last Activity
            </Button>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Environment Info:</h3>
            <pre className="text-xs text-blue-800">
              {JSON.stringify({
                VITE_FLAG_ANALYTICS: import.meta.env.VITE_FLAG_ANALYTICS,
                NODE_ENV: import.meta.env.NODE_ENV,
                MODE: import.meta.env.MODE
              }, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestAnalytics;
