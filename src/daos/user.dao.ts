import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();

export default class UserDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  photo bytea,
  name varchar(255) NOT NULL,
  email varchar(100) NOT NULL,
  password varchar(100) NOT NULL,
  salt varchar(100) NOT NULL,
  active boolean NOT NULL,
  created_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
);`
    }
}
