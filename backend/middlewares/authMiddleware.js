import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export async function verfyToken(req, res, next) {
    try {
      const accessToken = req.cookies.accessToken;
  
      if (!accessToken) {
        return res.status(401).json({
          message: "Please log in to access this resource",
        });
      }
  
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
  
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        username: decoded.username,
      };

      next();
    } catch (error) {
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