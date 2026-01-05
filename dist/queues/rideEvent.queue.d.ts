import { Queue, Worker } from 'bullmq';
/**
 * BullMQ Queue for ride event jobs
 */
export declare const rideEventQueue: Queue<any, any, string, any, any, string>;
/**
 * Worker that processes ride event jobs
 */
export declare const rideEventWorker: Worker<any, any, string>;
export default rideEventQueue;
//# sourceMappingURL=rideEvent.queue.d.ts.map