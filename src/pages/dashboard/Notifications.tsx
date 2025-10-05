import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserAlerts } from '@/hooks/useUserAlerts';

const NotificationsPage: React.FC = () => {
  const { alerts, loading, markRead, markAllRead, unreadCount } = useUserAlerts();

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {alerts.length > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              Mark all read ({unreadCount})
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading notifications...</div>
            ) : alerts.length === 0 ? (
              <div className="text-sm text-muted-foreground">You have no notifications.</div>
            ) : (
              <div className="divide-y">
                {alerts.map((a) => (
                  <div key={a.id} className={`py-3 flex items-start justify-between ${a.is_read ? 'opacity-70' : ''}`}>
                    <div>
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{a.message}</div>
                    </div>
                    {!a.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => markRead(a.id)}>Mark read</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationsPage;

