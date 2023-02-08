import PrismaService from "../services/prisma.service"

const logs = PrismaService.getInstance().logs

export default class LogsDao {
    static async create(obj: any) {
        let result = logs.create({
            data: obj
        });

        return result;
    }

    static async getLatestByEmployeeId(employee_id: number) {
        let result = logs.findFirst({
            where: {
                employee_id
            },
            orderBy: {
                timestamp: 'desc'
            }
        })

        return result;
    }

    static async getAll(timestampDesc : boolean) {
        let result = logs.findMany({
            orderBy: {
                timestamp: timestampDesc ? 'desc' : 'asc'
            }, include: {
                employee: {
                    select: {
                        name: true
                    }
                }
            },
        })

        return result;
    }
}
