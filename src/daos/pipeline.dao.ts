import PrismaService from "../services/prisma.service";

const pipelines = PrismaService.getNFV4().pipelines;

export default class PipelineDAO {
    static async getByStreamIds(streamIds: string[]) {
        return pipelines.findMany({
            where: {stream_id: {in: streamIds}},
            select: {
                stream_id: true,
                analytic_id: true,
                configs: true
            }
        })
    }

    static async getPipeline(id : string, code : string) {
        return pipelines.findFirst({
            where: {
                stream_id: id,
                analytic_id: code
            }
        })
    }

    static async getByAnalyticId(code : string) {
        return pipelines.findMany({
            where: {
                analytic_id: code
            },
            select: {
                streams: {
                    select: {
                        id: true,
                        name: true,
                        latitude: true,
                        longitude: true,
                        node_num: true
                    }
                }
            }
        })
    }
}
