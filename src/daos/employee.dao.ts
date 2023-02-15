import PrismaService from "../services/prisma.service"

const employee = PrismaService.getVisionaire().employee

export default class EmployeeDAO {
    static async create(obj : any) {
        return employee.create({
            data: obj
        });
    }
// where: {
//     OR: [
//       {
//         title: {
//           contains: 'Prisma',
//         },
//       },
//       {
//         title: {
//           contains: 'databases',
//         },
//       },
//     ],
//     AND: {
//       published: false,
//     },
//   }
    static async getAllCount() {
        return employee.aggregate({
            _count: {
                id: true
            },
            where: {
                AND: [
                    {
                        deleted_at: {equals: null}
                    }
                ]
            }
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
                deleted_at: null
            }
        });
    }

    static async getById(id : number) {
        return employee.findFirst({
            where: {
                id: id,
                deleted_at: null
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
