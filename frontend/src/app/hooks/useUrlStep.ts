import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * The current step of a multi-step form, kept in the URL (?step=N) so the browser's
 * back button returns to the previous step instead of leaving the form.
 */
export function useUrlStep(firstStep: number): [number, (step: number) => void] {
    const navigate = useNavigate();
    const location = useLocation();
    const param = new URLSearchParams(location.search).get('step');
    const step = param !== null && !Number.isNaN(Number(param)) ? Number(param) : firstStep;

    // The answers live in memory: a fresh visit (reload, link) starts from the first step
    useEffect(() => {
        if (step !== firstStep) goTo(firstStep, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const goTo = useCallback((next: number, replace = false) => {
        const search = new URLSearchParams(location.search);
        search.set('step', String(next));
        navigate({ pathname: location.pathname, search: `?${search}` }, { replace, state: { ...(location.state as object), prevStep: step } });
    }, [location, navigate, step]);

    const setStep = useCallback((next: number) => {
        if (next === step) return;
        if (next > step) {
            goTo(next);
            return;
        }
        // Going back to the step this one was opened from: undo it in the history too
        if ((location.state as { prevStep?: number } | null)?.prevStep === next) navigate(-1);
        else goTo(next, true);
    }, [step, goTo, location.state, navigate]);

    return [step, setStep];
}
