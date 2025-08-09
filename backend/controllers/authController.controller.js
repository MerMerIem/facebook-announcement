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
      path: "/auth",
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

        console.log("user", username);
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
  const refreshToken = req.cookies?.refreshToken;
  console.log("Logout called with refreshToken:", refreshToken);

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
      path: "/auth",
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Server error during logout" });
  }
}

export async function updateProfile(req, res) {
  const { username, newPassword } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let connection;
  try {
    // Get a connection from the pool
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Get current user data
    const [userRows] = await connection.execute(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    );

    if (userRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "User not found" });
    }

    const currentUser = userRows[0];

    // 2. Prepare update data
    const updateData = {};
    const updateFields = [];

    if (username && username !== currentUser.username) {
      const [usernameCheck] = await connection.execute(
        "SELECT id FROM users WHERE username = ? AND id != ?",
        [username, userId]
      );

      if (usernameCheck.length > 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ message: "Username already taken" });
      }

      updateData.username = username;
      updateFields.push("username = ?");
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        await connection.rollback();
        connection.release();
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedPassword;
      updateFields.push("password = ?");
    }

    // 3. Perform update if there are changes
    if (updateFields.length > 0) {
      const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
      const params = [...Object.values(updateData), userId];

      await connection.execute(query, params);

      if (newPassword) {
        await connection.execute(
          "DELETE FROM refresh_tokens WHERE user_id = ?",
          [userId]
        );
      }
    }

    await connection.commit();

    // 4. Get updated user data
    const [updatedUser] = await connection.execute(
      "SELECT id, email, username, role FROM users WHERE id = ?",
      [userId]
    );

    connection.release(); // Release the connection back to the pool

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser[0],
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
