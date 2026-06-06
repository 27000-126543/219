import prisma from '../config/prisma';

export const checkTimeConflict = async (
  teacherId: string,
  startTime: Date,
  endTime: Date,
  excludeSessionId?: string
): Promise<boolean> => {
  const sessions = await prisma.liveSession.findMany({
    where: {
      teacherId,
      id: excludeSessionId ? { not: excludeSessionId } : undefined,
      status: { in: ['SCHEDULED', 'LIVE'] },
      OR: [
        {
          startTime: { lte: startTime },
          endTime: { gt: startTime },
        },
        {
          startTime: { lt: endTime },
          endTime: { gte: endTime },
        },
        {
          startTime: { gte: startTime },
          endTime: { lte: endTime },
        },
      ],
    },
  });

  return sessions.length > 0;
};

export const checkClassroomConflict = async (
  classroom: string,
  startTime: Date,
  endTime: Date,
  excludeSessionId?: string
): Promise<boolean> => {
  const sessions = await prisma.liveSession.findMany({
    where: {
      classroom,
      id: excludeSessionId ? { not: excludeSessionId } : undefined,
      status: { in: ['SCHEDULED', 'LIVE'] },
      OR: [
        {
          startTime: { lte: startTime },
          endTime: { gt: startTime },
        },
        {
          startTime: { lt: endTime },
          endTime: { gte: endTime },
        },
        {
          startTime: { gte: startTime },
          endTime: { lte: endTime },
        },
      ],
    },
  });

  return sessions.length > 0;
};
