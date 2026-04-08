import "dotenv/config";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { prisma } from "../src/db.js";

async function ask(rl, q, { silent = false } = {}) {
  if (!silent) return (await rl.question(q)).trim();
  process.stdout.write(q);
  return new Promise((resolve) => {
    const onData = (char) => {
      const s = char.toString("utf8");
      if (s === "\n" || s === "\r" || s === "\r\n") {
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(buf);
      } else {
        buf += s;
      }
    };
    let buf = "";
    process.stdin.on("data", onData);
  });
}

async function main() {
  const rl = readline.createInterface({ input, output });
  const email = (await rl.question("Email: ")).trim().toLowerCase();
  const name = (await rl.question("Nome: ")).trim();
  const password = (await rl.question("Senha: ")).trim();
  rl.close();
  if (!email || !name || !password) {
    console.error("email, nome e senha são obrigatórios");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("senha precisa ter pelo menos 8 caracteres");
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash, role: "admin" },
  });
  console.log(`✔ usuário ${user.email} criado/atualizado (id=${user.id})`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
