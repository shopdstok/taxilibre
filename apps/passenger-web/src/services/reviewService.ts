import api from './api';

export const reviewService = {
  createReview: async (rideId: string, rating: number, comment?: string, isPublic?: boolean, tip?: number) => {
    const response = await api.post(`/v1/reviews`, {
      rideId,
      rating,
      comment,
      isPublic: isPublic ?? false,
      tip: tip ?? 0
    });
    return response.data;
  }
};
