import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../services/api';
import { TabPanel, dedupeNotifications } from './shared';

interface NotificationsTabProps {
  notifications: any[];
  setNotifications: (notifications: any[]) => void;
}

export function NotificationsTab({ notifications, setNotifications }: NotificationsTabProps) {
  const navigate = useNavigate();
  return (
    <TabPanel>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl text-foreground">Notifications</h1>
        {notifications.length > 0 && (
          <button
            onClick={async () => {
              try {
                await api.markAllNotificationsRead();
                const updatedNotifications = await api.getNotifications();
                setNotifications(dedupeNotifications(updatedNotifications));
                toast.success('All notifications marked as read');
              } catch (error) {
                toast.error('Failed to mark all as read');
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Mark all as read
          </button>
        )}
      </div>
      <div className="bg-slate-400/20 dark:bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-6">
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No new notifications</p>
            </div>
          ) : (
            notifications.map((notif, index) => {
              // BUG 4 FIX: use the actual backend field names from the Notification entity
              const notifId = notif.notificationId ?? notif.id;
              const notifTitle = notif.notificationTitle ?? notif.title ?? 'Notification';
              const notifMessage = notif.notificationMessage ?? notif.message ?? '';
              const notifRead = notif.isReadStatus ?? notif.read ?? false;
              const notifDate = notif.notificationCreatedAt ?? notif.createdAt ?? notif.date;
              const notifType = notif.notificationType ?? notif.type ?? '';
              const callToActionUrl = notif.callToActionUrl ?? null;
              return (
                <motion.div
                  key={notifId ?? index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.07 }}
                  className={`bg-muted border border-border rounded-xl p-4 hover:border-border/80 transition-all flex items-start gap-4 text-foreground ${!notifRead ? 'border-primary/30 bg-primary/5' : ''}`}
                >
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: notifType === 'ALARM' ? '#FF4757' : '#00F5A0' }} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-sm font-medium">{notifTitle}</h3>
                      <span className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                        {notifDate ? new Date(notifDate).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{notifMessage}</p>
                    <div className="flex gap-2">
                      {!notifRead && (
                        <button
                          onClick={async () => {
                            try {
                              await api.markNotificationRead(notifId);
                              const updatedNotifications = await api.getNotifications();
                              setNotifications(dedupeNotifications(updatedNotifications));
                              toast.success('Marked as read');
                            } catch (error) {
                              toast.error('Failed to mark as read');
                            }
                          }}
                          className="px-3 py-1 bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors text-xs"
                        >
                          Mark as read
                        </button>
                      )}
                      {notifType === 'TEAM_INVITE' && (
                        <button
                          onClick={() => navigate('/invitations')}
                          className="px-3 py-1 bg-cyan-500/20 text-cyan-600 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors text-xs flex items-center gap-1"
                        >
                          <Rocket size={12} />
                          View Invite
                        </button>
                      )}
                      {callToActionUrl && (
                        <button
                          onClick={() => navigate(callToActionUrl)}
                          className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs hover:bg-primary/30 transition-colors"
                        >
                          View Event
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          try {
                            await api.deleteNotification(notifId);
                            const updatedNotifications = await api.getNotifications();
                            setNotifications(dedupeNotifications(updatedNotifications));
                            toast.success('Notification deleted');
                          } catch (error) {
                            toast.error('Failed to delete notification');
                          }
                        }}
                        className="px-3 py-1 bg-red-500/20 text-red-600 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </TabPanel>
  );
}
