import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function auth(req, res, next) {
  if (!JWT_SECRET) {
    return res.status(500).json({ error: "JWT_SECRET not configured" });
  }
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
}
