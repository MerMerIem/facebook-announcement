import db from "../config/db.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

export async function register(req, res) {
  const { email, username, password } = req.body;

  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      "INSERT INTO users (email, username, password, role) VALUES (?, ?, ?, ?)",
      [email, username, hashedPassword, "admin"]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  console.log(req.body);

  try {
    const [user] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (user.length === 0) {
      return res
        .status(401)
        .json({ message: "User with this email doesn't exist" });
    }

    const passwordMatch = await bcrypt.compare(password, user[0].password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Wrong password" });
    }

    const accessToken = jwt.sign(
      {
        userId: user[0].id,
        email: user[0].email,
        username: user[0].username,
        role: user[0].role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    const refreshToken = crypto.randomBytes(64).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?,?,?)",
      [user[0].id, refreshToken, expiresAt]
    );
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Login successful" });
  } catch (err) {
    console.error("error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function checkLogin(req, res) {
  console.log("checklogin");

  const accessToken = req.cookies?.accessToken;
  const refreshToken = req.cookies?.refreshToken;

  try {
    // ✅ Check and verify access token first
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

        return res.status(200).json({
          message: "Access token valid",
          user: {
            id: decoded.userId,
            email: decoded.email,
            username: decoded.username,
            role: decoded.role,
          },
        });
      } catch (err) {
        console.warn(
          "Access token expired or invalid, trying refresh token..."
        );
      }
    }

    // 🔍 Check if refresh token exists
    if (!refreshToken) {
      return res
        .status(401)
        .json({ message: "No authentication tokens provided" });
    }

    // 🔁 Use refresh token if access token invalid/missing
    const [rows] = await db.execute(
      `
      SELECT rt.*, u.email, u.username, u.role 
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token = ? AND rt.expires_at > NOW()
      `,
      [refreshToken]
    );

    if (rows.length === 0) {
      // Clear invalid cookies
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
      });
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
      });

      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }

    const refreshTokenRow = rows[0];

    // 🆕 Generate new access token
    const newAccessToken = jwt.sign(
      {
        userId: refreshTokenRow.user_id,
        email: refreshTokenRow.email,
        username: refreshTokenRow.username,
        role: refreshTokenRow.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      }
    );

    // 🍪 Set new access token cookie
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    return res.status(200).json({
      message: "Token refreshed successfully",
      user: {
        id: refreshTokenRow.user_id,
        email: refreshTokenRow.email,
        username: refreshTokenRow.username,
        role: refreshTokenRow.role,
      },
    });
  } catch (error) {
    console.error("error in checkLogin:", error);

    // Clear cookies on error
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    res.status(500).json({ message: "Internal server error" });
  }
}

export async function logout(req, res) {
  try {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Server error during logout" });
  }
}
