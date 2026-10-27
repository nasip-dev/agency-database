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

// Запускается при каждом старте сервера, поэтому ничего не перезаписывает:
// руководитель создаётся, только если его ещё нет, а районы — только в пустую базу
// (иначе удалённые руководителем районы появлялись бы снова).
async function main() {
  const hasAdmin = await db.user.count({ where: { role: "ADMIN" } });
  if (!hasAdmin) {
    const login = process.env.ADMIN_LOGIN ?? "admin";
    const password = process.env.ADMIN_PASSWORD;
    if (!password) throw new Error("Укажите ADMIN_PASSWORD в .env");
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

  const hasDistricts = await db.district.count();
  if (!hasDistricts) {
    await db.district.createMany({
      data: BISHKEK_DISTRICTS.map((name) => ({ city: "Бишкек", name })),
    });
    console.log(`Добавлены районы Бишкека: ${BISHKEK_DISTRICTS.length}`);
  }
}

main().finally(() => db.$disconnect());
