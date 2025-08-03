import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

/**
 * Middleware to verify access tokens in incoming requests.
 *
 * If a valid JWT is found in the request cookies, it attaches the decoded user info to `req.user`.
 * If no token is found or it is invalid:
 * - If `allow_client` is `true`, the request proceeds with a `client` role.
 * - Otherwise, a 401 error is returned.
 *
 * @param {boolean} [allow_client=false] - Whether to allow non-authenticated users to proceed as clients.
 * @returns {import('express').RequestHandler} Express middleware function to verify JWT token.
 */

export function verfyToken(allow_client = false) {
  // console.log("called verifyToken")
  return async function (req, res, next) {
    try {
      const accessToken = req.cookies.accessToken;

      if (!accessToken) {
        if (allow_client) {
          // Allow non-logged-in users to proceed as clients
          req.user = {
            role: "client",
          };
          return next();
        }

        return res.status(401).json({
          message: "Please log in to access this resource",
        });
      }

      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

      req.user = {
        id: decoded.userId,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role === "admin" ? "admin" : "client",
      };

      // console.log("req user",req.user)
      next();
    } catch (error) {
      if (allow_client) {
        // If token is invalid but we allow clients, proceed as client
        req.user = {
          role: "client",
        };
        return next();
      }

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Access token expired. Please refresh your session.",
          code: "TOKEN_EXPIRED",
        });
      }

      return res.status(401).json({
        message: "Invalid access token",
      });
    }
  };
}

export function isAuthorized(req, res, next) {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ message: "No token, access denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    // Pass user data to next middleware or controller
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    return res.status(403).json({ message: "Invalid token" });
  }
}
