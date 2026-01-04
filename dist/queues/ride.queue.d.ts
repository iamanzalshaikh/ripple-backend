import { Queue, Worker } from 'bullmq';
/**
 * ✅ BullMQ Queue for ride processing
 */
export declare const rideQueue: Queue<any, any, string, any, any, string>;
/**
 * ✅ Worker that processes ride background jobs
 */
export declare const rideWorker: Worker<any, any, string>;
export default rideQueue;
//# sourceMappingURL=ride.queue.d.ts.map