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

    static async getAll(filter:any, timestampDesc : boolean) {
        let where = {};

        if(filter) {
            const {start_date, end_date} = filter;

            where = {
                AND: [
                    {
                        timestamp: {gte: new Date(start_date)}
                    },
                    {
                        timestamp: {lte: new Date(end_date)}
                    }
                ]
            }
        }

        let result = logs.findMany({
            orderBy: {
                timestamp: timestampDesc ? 'desc' : 'asc'
            }, include: {
                employee: {
                    select: {
                        name: true
                    }
                }
            }, where
        })

        return result;
    }
}
