import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import {
  analyticsService,
  trackEvent,
  trackPageView,
  trackPropertyView,
  trackWatchlistAdd,
  trackWatchlistRemove,
  trackInvestmentStart,
  trackInvestmentComplete,
  trackSearch,
  trackFilterApply,
  trackKYCProgress,
  EVENT_TYPES,
  EVENT_CATEGORIES,
  TrackingEvent
} from '@/services/AnalyticsService';
import { useLocation } from 'react-router-dom';

interface AnalyticsContextType {
  // Direct tracking methods
  track: (event: TrackingEvent) => void;
  trackPageView: () => void;
  trackPropertyView: (propertyId: string, title: string, timeSpent?: number) => void;
  trackWatchlistAdd: (propertyId: string, title: string, hasNotes: boolean) => void;
  trackWatchlistRemove: (propertyId: string, title: string) => void;
  trackInvestmentStart: (propertyId: string, title: string, amount: number) => void;
  trackInvestmentComplete: (propertyId: string, title: string, amount: number, paymentMethod: string) => void;
  trackSearch: (query: string, results: number, filters?: Record<string, any>) => void;
  trackFilterApply: (filters: Record<string, any>, results: number) => void;
  trackKYCProgress: (stage: string, documentType?: string) => void;

  // Convenience methods for common patterns
  trackButtonClick: (buttonName: string, context?: string) => void;
  trackFormSubmission: (formName: string, success: boolean, errors?: string[]) => void;
  trackModalOpen: (modalName: string) => void;
  trackModalClose: (modalName: string, action?: string) => void;
  trackFeatureUsage: (featureName: string, action: string, metadata?: Record<string, any>) => void;
  trackTimeSpent: (section: string, duration: number) => void;
  trackDocumentDownload: (documentName: string, propertyId?: string) => void;
  trackSupportInteraction: (type: 'chat' | 'ticket' | 'call', topic?: string) => void;

  // Event types and categories for reference
  EVENT_TYPES: typeof EVENT_TYPES;
  EVENT_CATEGORIES: typeof EVENT_CATEGORIES;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Initialize analytics when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      analyticsService.initialize(user);
    }
  }, [isAuthenticated, user]);

  // Track page views on route changes
  useEffect(() => {
    if (isAuthenticated) {
      trackPageView();
    }
  }, [location.pathname, isAuthenticated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      analyticsService.cleanup();
    };
  }, []);

  // Convenience tracking methods
  const trackButtonClick = (buttonName: string, context?: string) => {
    trackEvent({
      eventType: 'button_click',
      eventCategory: EVENT_CATEGORIES.ENGAGEMENT,
      eventAction: 'clicked',
      eventLabel: buttonName,
      metadata: {
        buttonName,
        context,
        page: location.pathname
      }
    });
  };

  const trackFormSubmission = (formName: string, success: boolean, errors?: string[]) => {
    trackEvent({
      eventType: 'form_submission',
      eventCategory: EVENT_CATEGORIES.ENGAGEMENT,
      eventAction: success ? 'submitted' : 'failed',
      eventLabel: formName,
      metadata: {
        formName,
        success,
        errors,
        page: location.pathname
      }
    });
  };

  const trackModalOpen = (modalName: string) => {
    trackEvent({
      eventType: 'modal_open',
      eventCategory: EVENT_CATEGORIES.ENGAGEMENT,
      eventAction: 'opened',
      eventLabel: modalName,
      metadata: {
        modalName,
        page: location.pathname
      }
    });
  };

  const trackModalClose = (modalName: string, action?: string) => {
    trackEvent({
      eventType: 'modal_close',
      eventCategory: EVENT_CATEGORIES.ENGAGEMENT,
      eventAction: 'closed',
      eventLabel: modalName,
      metadata: {
        modalName,
        action: action || 'close',
        page: location.pathname
      }
    });
  };

  const trackFeatureUsage = (featureName: string, action: string, metadata?: Record<string, any>) => {
    trackEvent({
      eventType: 'feature_usage',
      eventCategory: EVENT_CATEGORIES.ENGAGEMENT,
      eventAction: action,
      eventLabel: featureName,
      metadata: {
        featureName,
        ...metadata,
        page: location.pathname
      }
    });
  };

  const trackTimeSpent = (section: string, duration: number) => {
    trackEvent({
      eventType: EVENT_TYPES.TIME_ON_PAGE,
      eventCategory: EVENT_CATEGORIES.NAVIGATION,
      eventAction: 'time_spent',
      eventLabel: section,
      metadata: {
        section,
        duration,
        page: location.pathname
      }
    });
  };

  const trackDocumentDownload = (documentName: string, propertyId?: string) => {
    trackEvent({
      eventType: EVENT_TYPES.PROPERTY_DOCUMENT_DOWNLOAD,
      eventCategory: EVENT_CATEGORIES.PROPERTY,
      eventAction: 'downloaded',
      eventLabel: documentName,
      propertyId,
      metadata: {
        documentName,
        page: location.pathname
      }
    });
  };

  const trackSupportInteraction = (type: 'chat' | 'ticket' | 'call', topic?: string) => {
    const eventType = type === 'chat' ? EVENT_TYPES.SUPPORT_CHAT_START : EVENT_TYPES.SUPPORT_TICKET_CREATE;

    trackEvent({
      eventType,
      eventCategory: EVENT_CATEGORIES.ENGAGEMENT,
      eventAction: 'started',
      eventLabel: type,
      metadata: {
        type,
        topic,
        page: location.pathname
      }
    });
  };

  const contextValue: AnalyticsContextType = {
    // Direct tracking methods
    track: trackEvent,
    trackPageView,
    trackPropertyView,
    trackWatchlistAdd,
    trackWatchlistRemove,
    trackInvestmentStart,
    trackInvestmentComplete,
    trackSearch,
    trackFilterApply,
    trackKYCProgress,

    // Convenience methods
    trackButtonClick,
    trackFormSubmission,
    trackModalOpen,
    trackModalClose,
    trackFeatureUsage,
    trackTimeSpent,
    trackDocumentDownload,
    trackSupportInteraction,

    // Constants
    EVENT_TYPES,
    EVENT_CATEGORIES
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

// Higher-order component for automatic page tracking
export const withAnalytics = <P extends object>(
  Component: React.ComponentType<P>,
  trackingOptions?: {
    trackPageView?: boolean;
    trackTimeSpent?: boolean;
    customEvents?: Record<string, any>;
  }
) => {
  const WrappedComponent: React.FC<P> = (props) => {
    const analytics = useAnalytics();
    const [startTime] = React.useState(Date.now());

    React.useEffect(() => {
      if (trackingOptions?.trackPageView) {
        analytics.trackPageView();
      }

      if (trackingOptions?.customEvents) {
        Object.entries(trackingOptions.customEvents).forEach(([eventType, metadata]) => {
          analytics.track({
            eventType,
            eventCategory: EVENT_CATEGORIES.ENGAGEMENT,
            eventAction: 'component_mounted',
            metadata
          });
        });
      }

      return () => {
        if (trackingOptions?.trackTimeSpent) {
          const timeSpent = Math.floor((Date.now() - startTime) / 1000);
          analytics.trackTimeSpent(Component.displayName || Component.name || 'Unknown', timeSpent);
        }
      };
    }, [analytics, startTime]);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withAnalytics(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for tracking component lifecycle
export const useComponentTracking = (
  componentName: string,
  trackingOptions?: {
    trackMount?: boolean;
    trackTimeSpent?: boolean;
    customEvents?: Record<string, any>;
  }
) => {
  const analytics = useAnalytics();
  const [startTime] = React.useState(Date.now());

  React.useEffect(() => {
    if (trackingOptions?.trackMount) {
      analytics.trackFeatureUsage(componentName, 'mounted');
    }

    if (trackingOptions?.customEvents) {
      Object.entries(trackingOptions.customEvents).forEach(([eventType, metadata]) => {
        analytics.track({
          eventType,
          eventCategory: EVENT_CATEGORIES.ENGAGEMENT,
          eventAction: 'component_event',
          eventLabel: componentName,
          metadata
        });
      });
    }

    return () => {
      if (trackingOptions?.trackTimeSpent) {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        analytics.trackTimeSpent(componentName, timeSpent);
      }
    };
  }, [analytics, componentName, startTime, trackingOptions]);

  return analytics;
};

// Hook for tracking user interactions within a component
export const useInteractionTracking = (componentName: string) => {
  const analytics = useAnalytics();

  const trackInteraction = React.useCallback((
    action: string,
    element?: string,
    metadata?: Record<string, any>
  ) => {
    analytics.track({
      eventType: 'user_interaction',
      eventCategory: EVENT_CATEGORIES.ENGAGEMENT,
      eventAction: action,
      eventLabel: element ? `${componentName}:${element}` : componentName,
      metadata: {
        component: componentName,
        element,
        ...metadata
      }
    });
  }, [analytics, componentName]);

  return {
    trackInteraction,
    trackClick: (element: string, metadata?: Record<string, any>) =>
      trackInteraction('click', element, metadata),
    trackHover: (element: string, metadata?: Record<string, any>) =>
      trackInteraction('hover', element, metadata),
    trackFocus: (element: string, metadata?: Record<string, any>) =>
      trackInteraction('focus', element, metadata),
    trackScroll: (position: number, metadata?: Record<string, any>) =>
      trackInteraction('scroll', undefined, { position, ...metadata })
  };
};

export default useAnalytics;