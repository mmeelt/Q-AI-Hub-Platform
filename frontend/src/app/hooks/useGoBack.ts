import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * "Back" goes to the page the user was on just before, like the browser button.
 * When the page was opened directly (new tab, link in an email), it goes to `fallback`.
 */
export function useGoBack(fallback: string) {
    const navigate = useNavigate();
    return useCallback(() => {
        // React Router stores the position in the history stack in `idx`
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
        if (idx > 0) navigate(-1);
        else navigate(fallback, { replace: true });
    }, [navigate, fallback]);
}
