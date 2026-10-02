import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { transfers, type SelectTransfer } from '../../db/schema.js';

export const getTransferById = async ({
  id,
}: {
  id: string;
}): Promise<SelectTransfer | undefined> => {
  return (await db.select().from(transfers).where(eq(transfers.id, id)))[0];
};
