import { z } from 'zod';

const subscribeSchema = z.object({
  endpoint: z.string({ required_error: 'Subscription endpoint is required' }).url('Invalid subscription endpoint'),
  keys: z.object({
    p256dh: z.string({ required_error: 'p256dh key is required' }).min(1, 'p256dh key is required'),
    auth: z.string({ required_error: 'auth key is required' }).min(1, 'auth key is required'),
  }),
});

export { subscribeSchema };
