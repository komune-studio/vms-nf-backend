import { PrismaClient as Visionaire } from "../prisma/nfvisionaire"
import { PrismaClient as NFV4 } from "../prisma/nfv4"
import { PrismaClient as FaceClient } from "../prisma/face"  // tambah ini

export default class PrismaService {

    private static visionaireInstance: Visionaire;
    private static nfv4Instance: NFV4;
    private static faceInstance: FaceClient;  // tambah ini

    static initialize() {
        if (this.visionaireInstance === undefined) {
            console.log("Initializing new Prisma Client (NF Visionaire) instance.");
            this.visionaireInstance = new Visionaire();
            console.log("Prisma Client (NF Visionaire) instance initialized.");
        } else {
            console.log("Prisma Client (NF Visionaire) instance already initialized.");
        }

        if (this.nfv4Instance === undefined) {
            console.log("Initializing new Prisma Client (NFV4) instance.");
            this.nfv4Instance = new NFV4();
            console.log("Prisma Client (NFV4) instance initialized.");
        } else {
            console.log("Prisma Client (NFV4) instance already initialized.");
        }

        // tambah ini
        if (this.faceInstance === undefined) {
            console.log("Initializing new Prisma Client (Face) instance.");
            this.faceInstance = new FaceClient();
            console.log("Prisma Client (Face) instance initialized.");
        } else {
            console.log("Prisma Client (Face) instance already initialized.");
        }
    }

    static getVisionaire() {
        if (this.visionaireInstance === undefined) this.initialize();
        return this.visionaireInstance;
    }

    static getNFV4() {
        if (this.nfv4Instance === undefined) this.initialize();
        return this.nfv4Instance;
    }

    // tambah ini
    static getFace() {
        if (this.faceInstance === undefined) this.initialize();
        return this.faceInstance;
    }
}