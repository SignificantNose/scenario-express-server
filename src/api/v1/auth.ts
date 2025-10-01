import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticateJWT, AuthRequest } from "api/middleware/auth";

const router = Router();

const users = [
  { id: 1, login: "1", passwordHash: bcrypt.hashSync("1", 10) },
];

router.post("/login", async (req: Request, res: Response) => {
  const { login, password } = req.body;
  const user = users.find((u) => u.login === login);

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, login: user.login },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "1h" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  res.json({ message: "Login successful" });
});

router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

router.get("/me", authenticateJWT, (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  res.json({
    id: req.user.id,
    login: req.user.login,
  });
});

router.post("/sign-up", async (req: Request, res: Response) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: "Login and password are required" });
  }

  const existingUser = users.find((u) => u.login === login);
  if (existingUser) {
    return res.status(409).json({ error: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: users.length + 1,
    login,
    passwordHash,
  };
  users.push(newUser);

  const token = jwt.sign({ id: newUser.id, login: newUser.login }, process.env.JWT_SECRET || "secret", {
    expiresIn: "1h",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  res.status(201).json({ message: "Sign up successful", user: { id: newUser.id, login: newUser.login } });
});


export default router;
