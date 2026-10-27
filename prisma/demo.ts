/**
 * Демо-данные для проверки: агент «Улугбек» и несколько объектов.
 * Запуск: npm run db:demo (после npm run db:seed)
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildSearchText } from "../src/lib/search";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

type Demo = {
  type: string; rooms: number | null; district: string; street: string; house?: string;
  apartment?: string; landmark?: string; area: number; floor?: number; totalFloors?: number;
  listPrice: number; ownerPrice: number; currency?: string; ownerName: string; ownerPhone: string;
  notes?: string; status?: string; bargain?: boolean; docsReady?: boolean; urgent?: boolean;
  furnished?: boolean; renovated?: boolean;
};

const DEMO: Demo[] = [
  { type: "APARTMENT", rooms: 3, district: "Асанбай", street: "ул. Ахунбаева", house: "12", apartment: "45", area: 75, floor: 5, totalFloors: 9, listPrice: 85000, ownerPrice: 82000, ownerName: "Бакыт", ownerPhone: "996555123456", notes: "Торг, документы готовы, срочная продажа", bargain: true, docsReady: true, urgent: true },
  { type: "APARTMENT", rooms: 1, district: "Джал", street: "ул. Токомбаева", house: "5", apartment: "12", area: 38, floor: 2, totalFloors: 5, listPrice: 42000, ownerPrice: 40000, ownerName: "Айгуль", ownerPhone: "996700223344", furnished: true },
  { type: "APARTMENT", rooms: 2, district: "Восток-5", street: "мкр. Восток-5", house: "8", apartment: "31", area: 52, floor: 4, totalFloors: 5, listPrice: 58000, ownerPrice: 56000, ownerName: "Нурлан", ownerPhone: "996777889900", renovated: true, status: "DEPOSIT" },
  { type: "HOUSE", rooms: 5, district: "Кок-Жар", street: "ул. Садовая", house: "21", landmark: "рядом со школой №67", area: 180, listPrice: 210000, ownerPrice: 200000, ownerName: "Эркин", ownerPhone: "996555667788", notes: "Участок 6 соток, гараж", docsReady: true },
  { type: "LAND", rooms: null, district: "Арча-Бешик", street: "ул. 3-я линия", area: 6, listPrice: 35000, ownerPrice: 33000, ownerName: "Гульнара", ownerPhone: "996550112233", notes: "Красная книга, свет и вода рядом", bargain: true },
  { type: "COMMERCIAL", rooms: 2, district: "Центр", street: "пр. Чуй", house: "150", area: 90, floor: 1, totalFloors: 9, listPrice: 190000, ownerPrice: 180000, ownerName: "Азамат", ownerPhone: "996705445566", notes: "Отдельный вход, фасад" },
  { type: "APARTMENT", rooms: 4, district: "Золотой квадрат", street: "ул. Киевская", house: "77", apartment: "18", area: 120, floor: 7, totalFloors: 12, listPrice: 165000, ownerPrice: 158000, ownerName: "Чолпон", ownerPhone: "996555998877", furnished: true, renovated: true },
  { type: "APARTMENT", rooms: 2, district: "Тунгуч", street: "мкр. Тунгуч", house: "41", apartment: "9", area: 48, floor: 3, totalFloors: 4, listPrice: 4300000, ownerPrice: 4100000, currency: "KGS", ownerName: "Талант", ownerPhone: "996709001122", status: "SOLD" },
];

async function main() {
  const password = process.env.DEMO_AGENT_PASSWORD;
  if (!password) throw new Error("Укажите DEMO_AGENT_PASSWORD в .env");

  const agent = await db.user.upsert({
    where: { login: "ulugbek" },
    update: {},
    create: { login: "ulugbek", name: "Улугбек", passwordHash: await bcrypt.hash(password, 10) },
  });

  if ((await db.property.count()) > 0) {
    console.log("Объекты уже есть, демо-объекты не добавлены");
    return;
  }

  for (const { district: districtName, ...d } of DEMO) {
    const district = await db.district.findUniqueOrThrow({
      where: { city_name: { city: "Бишкек", name: districtName } },
    });
    await db.property.create({
      data: {
        ...d,
        districtId: district.id,
        agentId: agent.id,
        searchText: buildSearchText({ ...d, city: district.city, districtName }),
      },
    });
  }
  console.log(`Добавлено демо-объектов: ${DEMO.length}`);
}

main().finally(() => db.$disconnect());
