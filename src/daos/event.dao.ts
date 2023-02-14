import PrismaService from "../services/prisma.service"

const event = PrismaService.getInstance().event

export default class EventDAO {
    static async getCount(condition: any) {
        let result = event.aggregate({
            _count: {id: true},
            where: condition
        });

        return result;
    }
}
