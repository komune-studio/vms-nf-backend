import { PrismaClient as Visionaire } from "../prisma/nfvisionaire"
import { PrismaClient as NFV4 } from "../prisma/nfv4"

/**
 * Query analitik pada tabel `event` mengirim rentang waktu sebagai bind
 * parameter. Setelah 5 eksekusi, Postgres mengunci prepared statement ke
 * generic plan: tanpa tahu nilai rentang waktunya ia mengestimasi hasil ~3
 * baris (aktualnya ratusan ribu), lalu memilih Bitmap Heap Scan non-paralel
 * yang diukur ~3.5x lebih lambat daripada Parallel Seq Scan yang dipilih
 * custom plan (839 ms vs 239 ms untuk rentang 1 hari).
 *
 * `plan_cache_mode=force_custom_plan` memaksa planner merencanakan ulang
 * memakai nilai parameter sebenarnya. Ongkos perencanaannya ~1-2 ms, jauh
 * lebih murah daripada selisih ratusan milidetik tadi.
 *
 * Dipasang di sini, bukan di `.env`, karena `.env` di-generate ulang oleh
 * generate-env.js pada tiap deploy.
 */
const PLAN_CACHE_OPTION = 'options=-c%20plan_cache_mode%3Dforce_custom_plan';

const withCustomPlan = (url: string | undefined) => {
    if (!url || url.includes('options=')) return url;

    return `${url}${url.includes('?') ? '&' : '?'}${PLAN_CACHE_OPTION}`;
};

const datasourceUrl = (variable: string) => {
    const url = withCustomPlan(process.env[variable]);

    return url ? { datasources: { db: { url } } } : undefined;
};

export default class PrismaService {

    private static visionaireInstance : Visionaire;
    private static nfv4Instance : NFV4;

    static initialize() {
        if (this.visionaireInstance === undefined) {
            console.log("Initializing new Prisma Client (NF Visionaire) instance.");
            this.visionaireInstance = new Visionaire(datasourceUrl('DATABASE_URL_NFVISIONAIRE_WITH_SCHEMA'));
            console.log("Prisma Client (NF Visionaire) instance initialized.");
        }
        else {
            console.log("Prisma Client (NF Visionaire) instance already initialized.");
        }

        if (this.nfv4Instance === undefined) {
            console.log("Initializing new Prisma Client (NFV4) instance.");
            this.nfv4Instance = new NFV4(datasourceUrl('DATABASE_URL_NFV4_WITH_SCHEMA'));
            console.log("Prisma Client (NFV4) instance initialized.");
        }
        else {
            console.log("Prisma Client (NFV4) instance already initialized.");
        }
    }

    static getVisionaire() {
        if (this.visionaireInstance === undefined) {
            this.initialize()
        }
        return this.visionaireInstance;
    }
    
    static getNFV4() {
        if (this.nfv4Instance === undefined) {
            this.initialize()
        }
        return this.nfv4Instance;
    }

}