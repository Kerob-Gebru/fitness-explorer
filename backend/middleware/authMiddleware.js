import { extractBearerToken, verifyAccessToken } from "../utils/authHelpers.js";

export function createAuthMiddleware(store) {
  return async function requireAuth(req, res, next) {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const claims = verifyAccessToken(token);
      if (!claims) {
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please sign in again.",
        });
      }

      const [user, session] = await Promise.all([
        store.findUserById(claims.userId),
        store.findSessionById(claims.sessionId),
      ]);

      if (
        !user ||
        !user.is_active ||
        !session ||
        Number(session.user_id) !== Number(user.id) ||
        session.revoked_at ||
        new Date(session.expires_at).getTime() <= Date.now()
      ) {
        return res.status(401).json({
          success: false,
          message: "Your session has expired or been revoked. Please sign in again.",
        });
      }

      req.auth = {
        userId: Number(user.id),
        sessionId: String(session.id),
        user,
        session,
      };
      return next();
    } catch (error) {
      console.error("Auth verification failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to verify session.",
      });
    }
  };
}
