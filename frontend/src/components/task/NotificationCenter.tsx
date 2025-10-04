import React, { useState, useEffect } from 'react';
import { Task, isTaskOverdue, isTaskDueSoon } from '../../types/task';
import { useTask } from '../../contexts/TaskContext';
import './NotificationCenter.css';

interface NotificationCenterProps {
  className?: string;
}

interface Notification {
  id: string;
  type: 'overdue' | 'dueSoon' | 'completed' | 'created';
  title: string;
  message: string;
  task?: Task;
  timestamp: Date;
  read: boolean;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const { tasks } = useTask();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (tasks.length > 0) {
      generateNotifications();
    }
  }, [tasks]);

  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const generateNotifications = () => {
    const newNotifications: Notification[] = [];

    tasks.forEach(task => {
      if (isTaskOverdue(task)) {
        newNotifications.push({
          id: `overdue-${task.id}`,
          type: 'overdue',
          title: 'Task Overdue',
          message: `"${task.title}" is overdue by ${getOverdueTime(task)}`,
          task,
          timestamp: new Date(),
          read: false
        });
      } else if (isTaskDueSoon(task, 24)) {
        newNotifications.push({
          id: `dueSoon-${task.id}`,
          type: 'dueSoon',
          title: 'Task Due Soon',
          message: `"${task.title}" is due ${getDueSoonTime(task)}`,
          task,
          timestamp: new Date(),
          read: false
        });
      }
    });

    // Sort by timestamp (newest first)
    newNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    setNotifications(newNotifications);
  };

  const getOverdueTime = (task: Task): string => {
    if (!task.dueDate) return '';
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;
    }
  };

  const getDueSoonTime = (task: Task): string => {
    if (!task.dueDate) return '';
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const diffInHours = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60));
      return `in ${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
    } else if (diffInHours < 24) {
      return `in ${diffInHours} hour${diffInHours !== 1 ? 's' : ''}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `in ${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(n => n.id !== notificationId)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return '⚠️';
      case 'dueSoon':
        return '⏰';
      case 'completed':
        return '✅';
      case 'created':
        return '📋';
      default:
        return '🔔';
    }
  };

  const getNotificationClass = (type: string) => {
    switch (type) {
      case 'overdue':
        return 'notification-overdue';
      case 'dueSoon':
        return 'notification-due-soon';
      case 'completed':
        return 'notification-completed';
      case 'created':
        return 'notification-created';
      default:
        return 'notification-default';
    }
  };

  return (
    <div className={`notification-center ${className}`}>
      <button
        className="notification-toggle"
        onClick={() => setShowNotifications(!showNotifications)}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {showNotifications && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-actions">
              {notifications.some(n => !n.read) && (
                <button 
                  onClick={markAllAsRead}
                  className="action-button mark-all-read"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button 
                  onClick={clearAllNotifications}
                  className="action-button clear-all"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-notifications">
                <div className="empty-icon">🔔</div>
                <p>No notifications</p>
                <span>You're all caught up!</span>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${getNotificationClass(notification.type)} ${notification.read ? 'read' : 'unread'}`}
                >
                  <div className="notification-content">
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-text">
                      <div className="notification-title">
                        {notification.title}
                      </div>
                      <div className="notification-message">
                        {notification.message}
                      </div>
                      <div className="notification-time">
                        {notification.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="notification-actions-item">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="action-button-small mark-read"
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={() => clearNotification(notification.id)}
                      className="action-button-small clear"
                      title="Clear notification"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="notification-footer">
            <button
              onClick={() => setShowNotifications(false)}
              className="close-button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
