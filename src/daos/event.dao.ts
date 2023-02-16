import PrismaService from "../services/prisma.service"

const prisma = PrismaService.getVisionaire();
const event = prisma.event;

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

    static async getTopVisitors(amount : number) {
        return prisma.$queryRaw<any>`SELECT count(*) AS num_visits, name FROM event LEFT JOIN enrolled_face on detection -> 'pipeline_data' ->> 'face_id' = cast(enrolled_face.face_id as text) WHERE event.status = 'KNOWN' GROUP BY detection -> 'pipeline_data' ->> 'face_id', name ORDER BY num_visits DESC LIMIT ${amount};`
    }
}
