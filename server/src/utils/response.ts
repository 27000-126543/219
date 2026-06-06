import { Response } from 'express';
import { ApiResponse } from '../types';

export const successResponse = <T>(res: Response, data: T, message?: string, statusCode: number = 200): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

export const errorResponse = (res: Response, error: string, statusCode: number = 400): Response<ApiResponse> => {
  return res.status(statusCode).json({
    success: false,
    error,
  });
};
