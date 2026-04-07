export function auth(req, res, next) {
  const token = process.env.AUTH_TOKEN;
  if (!token) return next();
  const header = req.headers.authorization || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (provided !== token) return res.status(401).json({ error: "unauthorized" });
  next();
}
