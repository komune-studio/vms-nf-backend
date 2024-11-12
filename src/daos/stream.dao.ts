import PrismaService from "../services/prisma.service";

const streams = PrismaService.getNFV4().streams;

export default class StreamDAO {
    static async getStreamsById(ids : Array<string>) {
        return streams.findMany({
            where: {
                id: {
                    in: ids
                }
            }
        });
    }

    static async getAll() {
        return streams.findMany({
            orderBy: {name: 'asc'}
        });
    }

    static async getAllMp4() {
        return streams.findMany({
            where: {
                address: {
                    contains: '/workspaces/visionaire4/.data/',
                    mode: 'insensitive'
                }
            }
        });
    }
}
