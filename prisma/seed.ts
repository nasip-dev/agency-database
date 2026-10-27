import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

const BISHKEK_DISTRICTS = [
  "Центр", "Золотой квадрат", "Филармония", "Моссовет", "Политех", "Асанбай",
  "Джал", "Верхний Джал", "Нижний Джал", "Восток-5", "Аламедин-1", "Тунгуч",
  "Учкун", "Кок-Жар", "Магистраль", "Юг-2", "Пишпек", "Ак-Ордо", "Арча-Бешик",
  "Кара-Жыгач", "Ала-Арча", "Бишкек-Парк", "Кызыл-Аскер", "Старый аэропорт",
  "мкр. 3", "мкр. 4", "мкр. 5", "мкр. 6", "мкр. 7", "мкр. 8", "мкр. 9",
  "мкр. 10", "мкр. 11", "мкр. 12",
];

async function main() {
  const login = process.env.ADMIN_LOGIN ?? "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Укажите ADMIN_PASSWORD в .env");

  const existing = await db.user.findUnique({ where: { login } });
  if (!existing) {
    await db.user.create({
      data: {
        login,
        name: process.env.ADMIN_NAME ?? "Руководитель",
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
    console.log(`Создан руководитель: ${login}`);
  }

  for (const name of BISHKEK_DISTRICTS) {
    await db.district.upsert({
      where: { city_name: { city: "Бишкек", name } },
      update: {},
      create: { city: "Бишкек", name },
    });
  }
  console.log(`Районы Бишкека: ${BISHKEK_DISTRICTS.length}`);
}

main().finally(() => db.$disconnect());
