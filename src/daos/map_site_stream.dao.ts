import PrismaService from "../services/prisma.service"

const prisma = PrismaService.getVisionaire();
const mapSiteStream = prisma.map_site_stream;

export default class MapSiteStreamDAO {
    static async getBySiteIds(siteIds: bigint[]) {
        let result = mapSiteStream.findMany({
            where: {site_id: {in: siteIds}}
        });

        return result;
    }

    static async getByStreamIds(streamIds: string[]) {
        let result = mapSiteStream.findMany({
            where: {stream_id: {in: streamIds}}
        });

        return result;
    }

    static async getByStreamId(streamId: string) {
        let result = mapSiteStream.findFirst({
            where: {stream_id: {equals: streamId}}
        });

        return result;
    }

    static async create(data: any) {
        let result = mapSiteStream.create({data});

        return result;
    }

    static async update(id : number, data: any) {
        const result = mapSiteStream.update({where: {id}, data})

        return result;
    }
}
