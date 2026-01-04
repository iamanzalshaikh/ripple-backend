import { Document, Model } from "mongoose";
import mongoose from "mongoose";
export interface IBike extends Omit<Document, 'model'> {
    userId: string;
    brand: string;
    model: string;
    year: number;
    cc?: number;
    color?: string;
    registrationNumber?: string;
    primary: boolean;
    mileage?: number;
    imageUrl?: string;
    notes?: string;
    status: "active" | "archived";
    createdAt: Date;
    updatedAt: Date;
    fullName: string;
}
declare const Bike: Model<IBike, {}, {}, {}, Document<unknown, {}, IBike, {}, {}> & IBike & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Bike;
//# sourceMappingURL=bike.model.d.ts.map