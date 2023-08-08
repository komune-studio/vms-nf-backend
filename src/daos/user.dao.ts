import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const user = prisma.users;

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

    static async getAll() {
        return user.findMany({
            where: {
                active: true
            }
        });
    }

    static async getById(id : string) {
        return user.findFirst({
            where: {id: parseInt(id), active: true}
        });
    }

    static async getByEmail(email : string) {
        return user.findFirst({
            where: {email: {equals: email, mode: 'insensitive'}, active: true}
        });
    }

    static async create(obj : any) {
        return user.create({
            data: obj
        });
    }

    static async update(id: string, data : any) {
        return user.update({
            where: {
                id: parseInt(id)
            }, data
        });
    }
}
