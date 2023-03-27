import PrismaService from "../services/prisma.service";

const employee = PrismaService.getVisionaire().employee;

export default class EmployeeDAO {
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