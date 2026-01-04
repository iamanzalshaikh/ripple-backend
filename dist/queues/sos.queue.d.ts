import { Queue, Worker } from 'bullmq';
/**
 * ✅ BullMQ Queue for SOS alert processing
 */
export declare const sosQueue: Queue<any, any, string, any, any, string>;
/**
 * ✅ Worker that processes SOS alert jobs
 * Sends email alerts to all emergency contacts
 */
export declare const sosWorker: Worker<any, any, string>;
export default sosQueue;
//# sourceMappingURL=sos.queue.d.ts.map