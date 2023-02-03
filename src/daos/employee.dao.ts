import PrismaService from "../services/prisma.service"

const employee = PrismaService.getInstance().employee

export default class EmployeeDAO {
    static async create(obj : any) {
        let result = employee.create({
            data: obj
        });

        return result;
    }
}