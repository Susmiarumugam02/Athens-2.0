import { createContext, useContext } from 'react';

interface NotificationsContextType {
  sendNotification: (userId: number, payload: {
    title: string;
    message: string;
    type: string;
    data?: Record<string, any>;
  }) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType>({
  sendNotification: async () => {},
});

export const useNotificationsContext = () => useContext(NotificationsContext);
export default NotificationsContext;
