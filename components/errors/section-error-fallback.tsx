/**
 * Section Error Fallback Component
 * 
 * Displays a user-friendly error message for dashboard sections that fail to load.
 * Includes retry functionality and maintains consistent styling.
 */

'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SectionErrorFallbackProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
}

export function SectionErrorFallback({
    title = 'Unable to Load Section',
    message = 'We encountered an error while loading this section. Please try again.',
    onRetry,
}: SectionErrorFallbackProps) {
    const handleRetry = () => {
        if (onRetry) {
            onRetry();
        } else {
            // Default retry: reload the page
            window.location.reload();
        }
    };

    return (
        <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4 opacity-50" />
                    <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                        {message}
                    </p>
                    <Button
                        onClick={handleRetry}
                        variant="outline"
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Inline Error State Component
 * 
 * Smaller error display for inline use within components
 */
export function InlineErrorState({
    message = 'Failed to load data',
    onRetry,
}: {
    message?: string;
    onRetry?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">{message}</p>
            {onRetry && (
                <Button onClick={onRetry} variant="ghost" size="sm" className="gap-2">
                    <RefreshCw className="h-3 w-3" />
                    Retry
                </Button>
            )}
        </div>
    );
}
