import { type SessionData, Store } from "express-session";
import { deleteSession, getSessionById, setSession } from "../db/queries";

export class DrizzleStore extends Store {
  async get(sid: string, callback: (err: any, session?: SessionData | null) => void): Promise<void> {
    try {
      const session = await getSessionById(sid);
      callback(null, session?.data ?? null);
    } catch (error) {
      callback(error);
    }
  }

  async set(sid: string, session: SessionData, callback?: (err?: any) => void): Promise<void> {
    try {
      await setSession(sid, session);
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  async destroy(sid: string, callback?: (err?: any) => void): Promise<void> {
    try {
      await deleteSession(sid);
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }
}
