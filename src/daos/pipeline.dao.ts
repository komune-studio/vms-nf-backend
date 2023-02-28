import PrismaService from "../services/prisma.service";

const pipelines = PrismaService.getNFV4().pipelines;

export default class PipelineDAO {
    static async getPipeline(id : string, code : string) {
        return pipelines.findFirst({
            where: {
                stream_id: id,
                analytic_id: code
            }
        })
    }
}