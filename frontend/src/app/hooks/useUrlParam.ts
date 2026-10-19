import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * What is open inside a page (a tab, a selected applicant, a pitch round...) kept in the URL (?key=value),
 * so the browser's back arrow and the page's own "Back" button both return to the exact previous view.
 *
 * - `setValue(v)`: opens a view (adds a history entry); `setValue(null)` closes it.
 * - `back()`: what the page's Back button does — returns to the view this one was opened from
 *   (undoing the history entry), or closes the view when it was opened from a link.
 * `resetOnMount`: for views that depend on data kept in memory (a form's step), a fresh visit starts closed.
 */
export function useUrlParam(key: string, { resetOnMount = false, children = [] as string[] } = {}):
    [string | null, (value: string | null) => void, () => void] {
    const navigate = useNavigate();
    const location = useLocation();
    const value = new URLSearchParams(location.search).get(key);
    const prevKey = `prev:${key}`;
    const state = location.state as Record<string, unknown> | null;
    // The value this history entry was opened from (undefined: not opened from this page)
    const openedFrom = state && state[prevKey] !== undefined ? (state[prevKey] as string | null) : undefined;

    const write = useCallback((next: string | null, replace: boolean) => {
        const search = new URLSearchParams(location.search);
        if (next === null) search.delete(key);
        else search.set(key, next);
        // The views opened inside this one (`children`) close with it
        if (next === null) children.forEach(child => search.delete(child));
        const query = search.toString();
        // Keep the page's own state, but only this entry's origin: another view's "opened from" belongs to its own entry
        const kept = Object.fromEntries(Object.entries((location.state as object) || {}).filter(([k]) => !k.startsWith('prev:') || (replace && k !== prevKey)));
        navigate({ pathname: location.pathname, search: query ? `?${query}` : '' },
            { replace, state: { ...kept, ...(replace ? {} : { [prevKey]: value }) } });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, prevKey, value, location, navigate, children.join(',')]);

    useEffect(() => {
        if (resetOnMount && value !== null) write(null, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setValue = useCallback((next: string | null) => {
        if (next === value) return;
        // Going back to where this entry came from: undo it in the history too
        if (openedFrom !== undefined && openedFrom === next) navigate(-1);
        else write(next, next === null);
    }, [value, openedFrom, navigate, write]);

    const back = useCallback(() => {
        if (openedFrom !== undefined) navigate(-1);
        else write(null, true);
    }, [openedFrom, navigate, write]);

    return [value, setValue, back];
}
