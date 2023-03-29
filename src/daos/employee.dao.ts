import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const employee = PrismaService.getVisionaire().employee;

export default class EmployeeDAO {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS employee (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            position VARCHAR(100),
            phone_number VARCHAR(100)            
        );`
    }
    static async getAll() {
        return employee.findMany();
    }

    static async getOne(id : number) {
        return employee.findUnique({
            where: {
                id: id
            }
        });
    }

    static async create(data : any) {
        return employee.create({
            data: data
        });
    }

    static async update(id : number, data : any) {
        return employee.update({
            where: {
                id: id
            },
            data: data
        });
    }

    static async delete(id : number) {
        return employee.delete({
            where: {
                id: id
            }
        });
    }
}
