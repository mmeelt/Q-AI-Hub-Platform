import { useNavigate } from 'react-router-dom';
import { Check, Clock, Rocket, Send, Star, Trophy } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { statusColors, type PhaseData } from './shared';

interface ApplicationCardProps extends PhaseData {
  app: any;
  focusedEventId: string | null;
  applicationPitchResults: Record<string, any[]>;
}

/** One application (or simple-event registration) with its progress through the phases and pitch rounds. */
export function ApplicationCard({ app, focusedEventId, phaseSubmissions, eventPhases, applicationPitchResults }: ApplicationCardProps) {
  const navigate = useNavigate();
  const isFocusedEvent = focusedEventId && String(app.targetEventId ?? '') === String(focusedEventId);
  const isAccepted = app.applicationStatus?.toLowerCase() === 'accepted' || app.status?.toLowerCase() === 'accepted';
  const appSubs: any[] = (isAccepted && phaseSubmissions[app.applicationId]) || [];

  const appStatus = String(app.applicationStatus || app.status || '').toUpperCase();
  const isPendingApp = !app.isRegistration && appStatus === 'PENDING';
  const isRejectedApp = !app.isRegistration && appStatus === 'REJECTED';

  // Find phase submissions by order
  const eventPhasesForApp = eventPhases[app.targetEventId] || [];
  const phase1Config = eventPhasesForApp.find((p: any) => p.phaseOrder === 1);
  const phase1Sub = appSubs.find((s: any) => s.phaseOrder === 1);
  const phase1Submitted = !!phase1Sub && phase1Sub.status !== 'DRAFT';
  const phase1Decision = phase1Sub?.decisionStatus || 'PENDING';
  const phase1Accepted = phase1Submitted && phase1Decision === 'ACCEPTED';
  const isActivePhase1 = phase1Config && phase1Config.phaseActive === true;
  const isLockedPhase1 = phase1Config && phase1Config.phaseLocked === true;
  const openPhase1 = () => navigate(`/apply/event/${app.targetEventId}/questions`, {
    state: {
      applicationId: app.applicationId,
      phaseId: phase1Config.phaseId || phase1Config.id,
      phaseOrder: 1,
    }
  });

  // Phase 2 is unlocked only by an explicit admin acceptance of Phase 1
  const phase2Unlocked = isAccepted && (phase1Accepted || !phase1Config);
  const phase2Sub = appSubs.find((s: any) => s.phaseOrder === 2);
  const phase2Config = eventPhasesForApp.find((p: any) => p.phaseOrder === 2);
  
  // Phase 2 banner: active if config exists and is active, and user hasn't graded yet
  const isActivePhase2 = phase2Config && phase2Config.phaseActive === true;
  const isLockedPhase2 = phase2Config && phase2Config.phaseLocked === true;
  // A result is shown only once the admin has decided (a grade alone is an internal step)
  const phase2Graded = !!phase2Sub && (phase2Sub.decisionStatus === 'ACCEPTED' || phase2Sub.decisionStatus === 'REJECTED');
  const phase2Passed = !!phase2Sub && phase2Sub.decisionStatus === 'ACCEPTED';
  const hasSubmittedPhase2 = phase2Sub && phase2Sub.status === 'SUBMITTED';
  // Phase 3 (Pitch): averaged results, visible once the admin has sent them
  const roundResults = applicationPitchResults[app.applicationId] || [];

  return (
    <div
      id={`app-card-${app.targetEventId}`}
      className={`bg-muted border rounded-xl p-6 transition-all text-foreground ${
        isFocusedEvent
          ? 'border-primary ring-2 ring-primary/20 shadow-lg'
          : 'border-border hover:border-border/80'
      }`}
    >
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-xl mb-1 break-words">{app.startupName || app.projectName}</h3>
          <p className="text-sm text-muted-foreground">{app.eventTitle || app.eventName}</p>
        </div>
        <span className={`shrink-0 px-3 py-1 rounded-full text-xs ${statusColors[app.status] || 'bg-foreground/10 text-muted-foreground'}`}>
          {app.status}
        </span>
      </div>

      {/* Application pending / rejected */}
      {isPendingApp && (
        <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <Clock size={18} className="text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-400">Your application is pending</p>
            <p className="text-xs text-muted-foreground">Please wait for the administrator's decision.</p>
          </div>
        </div>
      )}
      {isRejectedApp && (
        <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
          <p className="text-sm font-semibold text-destructive">Your application was not accepted</p>
          {app.rejectionReason && (
            <p className="text-xs text-muted-foreground mt-1">{app.rejectionReason}</p>
          )}
        </div>
      )}

      {/* Phase 1 — not submitted yet */}
      {isAccepted && phase1Config && !phase1Submitted && (
        isActivePhase1 ? (
          <div className="mb-4 flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-3">
              <Rocket size={20} className="text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-400">Phase 1 is now open</p>
                <p className="text-xs text-muted-foreground">You can submit your answers. Once submitted, they can no longer be modified.</p>
              </div>
            </div>
            <Button onClick={openPhase1} className="text-xs gap-2 flex-shrink-0">
              <Send size={14} />
              Submit Answers
            </Button>
          </div>
        ) : isLockedPhase1 ? (
          <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <Clock size={18} className="text-red-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-400">Phase 1 is closed — no answers were submitted</p>
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <Check size={18} className="text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">Your application has been accepted</p>
              <p className="text-xs text-muted-foreground">Phase 1 has not opened yet. You'll be notified when you can submit.</p>
            </div>
          </div>
        )
      )}

      {/* Phase 1 — submitted, awaiting the admin's review */}
      {isAccepted && phase1Submitted && phase1Decision === 'PENDING' && (
        <div className="mb-4 flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-400">Your Phase 1 submission is awaiting review</p>
              <p className="text-xs text-muted-foreground">You'll be notified once the administrator has reviewed it.</p>
            </div>
          </div>
        </div>
      )}

      {/* Phase 1 — decided */}
      {isAccepted && phase1Submitted && phase1Decision === 'REJECTED' && (
        <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
          <p className="text-sm font-semibold text-destructive">Phase 1 not passed</p>
          {phase1Sub.evaluatorFeedback && (
            <p className="text-xs text-muted-foreground mt-1">{phase1Sub.evaluatorFeedback}</p>
          )}
        </div>
      )}
      {phase1Accepted && (
        <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <Check size={16} className="text-emerald-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-emerald-400">Phase 1 passed</p>
        </div>
      )}

      {/* Phase 2 — submitted, answers are final */}
      {phase2Unlocked && phase2Config && hasSubmittedPhase2 && !phase2Graded && (
        <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <Clock size={18} className="text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-400">Your Phase 2 submission is awaiting review</p>
            <p className="text-xs text-muted-foreground">Your answers have been submitted and can no longer be modified.</p>
          </div>
        </div>
      )}

      {/* Phase 2 Active Banner */}
      {phase2Unlocked && phase2Config && isActivePhase2 && !phase2Graded && !hasSubmittedPhase2 && (
        <div className="mb-4 flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-3">
            <Rocket size={20} className="text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">Phase 2 is now open</p>
              <p className="text-xs text-muted-foreground">Submit your answers before the deadline. Once submitted, they can no longer be modified.</p>
            </div>
          </div>
          <Button
            onClick={() => navigate(`/apply/event/${app.targetEventId}/questions`, {
              state: {
                applicationId: app.applicationId,
                phaseId: phase2Config.phaseId || phase2Config.id,
                phaseOrder: 2,
              }
            })}
            className="text-xs gap-2 flex-shrink-0"
          >
            <Send size={14} />
            Submit Answers
          </Button>
        </div>
      )}

      {/* Phase 2 enrolled but not yet active — waiting banner */}
      {phase2Unlocked && phase2Config && !isActivePhase2 && !isLockedPhase2 && !phase2Graded && (
        <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <Clock size={18} className="text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-400">You've been accepted to Phase 2</p>
            <p className="text-xs text-muted-foreground">Phase 2 will open soon. You'll be notified when you can submit.</p>
          </div>
        </div>
      )}

      {/* Phase 2 locked banner */}
      {phase2Unlocked && isLockedPhase2 && !phase2Graded && (
        <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <Clock size={18} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-400">Phase 2 is closed and locked</p>
            <p className="text-xs text-muted-foreground">You can no longer update or submit answers for this phase.</p>
          </div>
        </div>
      )}

      {/* Phase 2 Graded Result */}
      {phase2Graded && (
        <div className={`mb-4 p-4 rounded-xl border ${phase2Passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Star size={16} className={phase2Passed ? 'text-emerald-400' : 'text-destructive'} />
            <p className={`text-sm font-semibold ${phase2Passed ? 'text-emerald-400' : 'text-destructive'}`}>
              {phase2Passed ? 'Phase 2 passed' : 'Phase 2: not selected'}
            </p>
            {phase2Sub.evaluationScore != null && (
              <span className="ml-auto text-sm font-bold text-foreground">
                {phase2Sub.evaluationScore}/100
              </span>
            )}
          </div>
          {phase2Sub.evaluatorFeedback && (
            <p className="text-xs text-muted-foreground leading-relaxed pl-6">
              {phase2Sub.evaluatorFeedback}
            </p>
          )}
        </div>
      )}

      {/* Phase 3 Pitch Round Results */}
      {roundResults.length > 0 && (
        <div className="mb-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Trophy size={12} className="text-amber-400" />
            Pitch Round Results
          </p>
          {roundResults.map((res: any, idx: number) => (
            <div key={idx} className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/15">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-violet-400">{res.roundName || 'Round Result'}</p>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${res.decision === 'PASSED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {res.decision}
                  </span>
                  <span className="text-xs font-bold text-foreground">{res.totalScore}{res.maxScore ? ` / ${res.maxScore}` : ''} pts</span>
                </div>
              </div>
              {res.feedback && (
                <p className="text-xs text-muted-foreground mb-2 pl-2 border-l-2 border-border/50 whitespace-pre-line">
                  {res.feedback}
                </p>
              )}
              {res.aiFeedback && (
                <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/10">
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-1">Insights & Remarks</p>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">"{res.aiFeedback}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Sector</p>
          <p>{app.businessSector || app.sector || '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Submitted</p>
          <p>{new Date(app.submittedDate).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tracking Code</p>
          <p className="font-mono text-xs text-primary">{app.trackingCode}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Application ID</p>
          <p className="font-mono text-xs text-foreground/70">{app.applicationId}</p>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-border/50 flex justify-end">
        <button
          onClick={() => {
            if (isAccepted) {
              navigate(`/startup/${app.applicationId}`);
            } else {
              navigate(`/track?code=${app.trackingCode}`);
            }
          }}
          className="text-sm font-medium transition-all text-primary hover:text-accent"
        >
          {isAccepted ? 'Manage Startup →' : 'Track Application →'}
        </button>
      </div>
    </div>
  );
}
