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

    static async getStreams() {
        return streams.findMany();
    }
}