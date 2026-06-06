import prisma from '../config/prisma';
import { NotificationType } from '@prisma/client';
import { Server } from 'socket.io';

let io: Server;

export const setSocketServer = (socketIo: Server) => {
  io = socketIo;
};

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  content: string,
  data?: any
) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      content,
      data,
    },
  });

  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }

  return notification;
};

export const createBulkNotifications = async (
  userIds: string[],
  type: NotificationType,
  title: string,
  content: string,
  data?: any
) => {
  const notifications = await Promise.all(
    userIds.map((userId) =>
      prisma.notification.create({
        data: {
          userId,
          type,
          title,
          content,
          data,
        },
      })
    )
  );

  if (io) {
    userIds.forEach((userId) => {
      io.to(`user:${userId}`).emit('notification', notifications.find(n => n.userId === userId));
    });
  }

  return notifications;
};
