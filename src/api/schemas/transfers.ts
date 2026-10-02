import z from 'zod';

export const transferByIdSchema = z.object({
  id: z.uuid(),
});
