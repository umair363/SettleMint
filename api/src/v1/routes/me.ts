import { eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { updateMeBody, type Me } from "@settlemint/shared";
import { requireUser } from "../app";
import { user } from "../db/schema";

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  const load = async (id: string): Promise<Me> => {
    const [u] = await app.db.select().from(user).where(eq(user.id, id));
    return {
      id: u.id,
      name: u.name,
      email: u.isAnonymous ? null : u.email,
      image: u.image,
      isGuest: Boolean(u.isAnonymous),
      defaultCurrency: u.defaultCurrency,
      locale: u.locale,
    };
  };

  app.get("/me", async (req) => load(requireUser(req).id));

  app.patch("/me", { schema: { body: updateMeBody } }, async (req) => {
    const me = requireUser(req);
    const { name, defaultCurrency, locale } = req.body;
    await app.db
      .update(user)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(defaultCurrency !== undefined ? { defaultCurrency } : {}),
        ...(locale !== undefined ? { locale } : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.id, me.id));
    return load(me.id);
  });
};
