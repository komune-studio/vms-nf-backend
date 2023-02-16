import PrismaService from "../services/prisma.service"

const event = PrismaService.getVisionaire().event

export default class EventDAO {
    static async getCount(condition: any) {
        let result = event.aggregate({
            _count: {id: true},
            where: condition
        });

        return result;
    }

    static async getAll(condition: any) {
        let result = event.findMany({
            orderBy: {
                event_time: 'asc'
            },
            select: {event_time: true},
            where: condition
        });

        return result;
    }

    static async getCountGroupByStreamId(condition: any) {
        let result = event.groupBy({
            by: ['stream_id'],
            _count: {id: true},
            where: condition
        });

        return result;
    }
}
