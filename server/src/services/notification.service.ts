import prisma from '../config/prisma';

let io: any;

export const setSocketServer = (socketIo: any) => {
  io = socketIo;
};

export const sendNotification = async (
  userId: string,
  type: string,
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
      data: data ? JSON.stringify(data) : undefined,
    },
  });

  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }

  return notification;
};

export const createNotification = sendNotification;

export const createBulkNotifications = async (
  userIds: string[],
  type: string,
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
          data: data ? JSON.stringify(data) : undefined,
        },
      })
    )
  );

  if (io) {
    userIds.forEach((userId) => {
      io.to(`user:${userId}`).emit('notification', notifications.find((n) => n.userId === userId));
    });
  }

  return notifications;
};
