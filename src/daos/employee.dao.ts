import PrismaService from "../services/prisma.service"

const employee = PrismaService.getInstance().employee

export default class EmployeeDAO {
    static async create(obj : any) {
        return employee.create({
            data: obj
        });
    }

    static async getAll() {
        return employee.findMany({
            select: {
                id: true,
                name: true,
                face_image: true,
                created_at: true,
                modified_at: true
            },
            where: {
                deleted_at: {
                    not: null
                }
            }
        });
    }

    static async getById(id : number) {
        return employee.findFirst({
            where: {
                id: id,
                modified_at: {
                    not: null
                }
            }
        });
    }

    static async update(id : number, obj : any) {
        return employee.update({
            data: {
                ...obj,
                modified_at: new Date()
            },
            where: {id}
        });
    }

    static async delete(id : number) {
        let now = new Date();

        return employee.update({
            data: {
                deleted_at: now,
                modified_at: now
            },
            where: {id}
        });
    }
}
