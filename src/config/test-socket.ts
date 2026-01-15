// // import { io, Socket } from 'socket.io-client';

// // // User 1: Organizer (who started the event)
// // const USER_1 = {
// //   name: 'Tech Stackk',
// //   id: '6954f825c354031d5568929e',
// //   phone: '9082608032',
// //   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTU0ZjgyNWMzNTQwMzFkNTU2ODkyOWUiLCJpYXQiOjE3NjczNDUwNTAsImV4cCI6MTc2Nzk0OTg1MH0.Z-JqfD0KmE6KOxlNSd-42wVc4o7MoA9-RPRhOAtWJ3I'
// // };

// // // User 2: Participant (other user who joined)
// // const USER_2 = {
// //   name: 'Anzal Shaikh',
// //   id: '695389c1f4f14914d809e938',
// //   phone: '7045475587',
// //   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTUzODljMWY0ZjE0OTE0ZDgwOWU5MzgiLCJpYXQiOjE3NjcxNjI0NjIsImV4cCI6MTc2Nzc2NzI2Mn0.b3L0ytWaMS5ZmRJRD3Ha4WvgBVd0rEP8A1OzL1fCkzw'
// // };

// // const RIDE_EVENT_ID = '695b665e71bc1c9eb6aa19c9';
// // const API_URL = 'http://localhost:3001';

// // let socket1: Socket;
// // let socket2: Socket;

// // /**
// //  * Connect User 1 (Organizer)
// //  */
// // function connectUser1(): Promise<void> {
// //   return new Promise((resolve, reject) => {
// //     socket1 = io(API_URL, {
// //       auth: { token: USER_1.token },
// //       transports: ['websocket', 'polling'],
// //       reconnection: true,
// //       reconnectionDelay: 1000,
// //       reconnectionDelayMax: 5000,
// //       reconnectionAttempts: 5
// //     });

// //     const timeout = setTimeout(() => {
// //       reject(new Error('User 1 connection timeout'));
// //     }, 10000);

// //     socket1.on('connect', () => {
// //       clearTimeout(timeout);
// //       console.log(`\n✅ [USER 1: ${USER_1.name}] Connected`);
// //       console.log(`   Socket ID: ${socket1.id}`);
// //       resolve();
// //     });

// //     socket1.on('error', (error: string) => {
// //       console.error(`❌ [USER 1] Error: ${error}`);
// //     });

// //     socket1.on('disconnect', () => {
// //       console.log(`⚠️ [USER 1] Disconnected`);
// //     });

// //     socket1.on('connect_error', (error: any) => {
// //       console.error(`❌ [USER 1] Connection Error:`, error);
// //       console.error(`   Message:`, error.message);
// //       console.error(`   Data:`, error.data);
// //     });
// //   });
// // }

// // /**
// //  * Connect User 2 (Participant)
// //  */
// // function connectUser2(): Promise<void> {
// //   return new Promise((resolve, reject) => {
// //     socket2 = io(API_URL, {
// //       auth: { token: USER_2.token },
// //       transports: ['websocket', 'polling'],
// //       reconnection: true,
// //       reconnectionDelay: 1000,
// //       reconnectionDelayMax: 5000,
// //       reconnectionAttempts: 5
// //     });

// //     const timeout = setTimeout(() => {
// //       reject(new Error('User 2 connection timeout'));
// //     }, 10000);

// //     socket2.on('connect', () => {
// //       clearTimeout(timeout);
// //       console.log(`\n✅ [USER 2: ${USER_2.name}] Connected`);
// //       console.log(`   Socket ID: ${socket2.id}`);
// //       resolve();
// //     });

// //     socket2.on('error', (error: string) => {
// //       console.error(`❌ [USER 2] Error: ${error}`);
// //     });

// //     socket2.on('disconnect', () => {
// //       console.log(`⚠️ [USER 2] Disconnected`);
// //     });

// //     socket2.on('connect_error', (error: any) => {
// //       console.error(`❌ [USER 2] Connection Error:`, error);
// //       console.error(`   Message:`, error.message);
// //       console.error(`   Data:`, error.data);
// //     });
// //   });
// // }

// // /**
// //  * Test: Both users join the ride
// //  */
// // function testJoinRide(): void {
// //   console.log('\n\n═══════════════════════════════════════════════');
// //   console.log('TEST 1: Join Ride Event');
// //   console.log('═══════════════════════════════════════════════');

// //   // User 1 joins
// //   socket1.emit('join-ride', { rideEventId: RIDE_EVENT_ID });
// //   socket1.on('join-success', (data: any) => {
// //     console.log(`✅ [USER 1] Joined ride: ${data.message}`);
// //   });

// //   socket1.on('user-joined', (data: any) => {
// //     console.log(`👤 [USER 1] Someone joined: ${data.message}`);
// //   });

// //   // User 2 joins
// //   socket2.emit('join-ride', { rideEventId: RIDE_EVENT_ID });
// //   socket2.on('join-success', (data: any) => {
// //     console.log(`✅ [USER 2] Joined ride: ${data.message}`);
// //   });

// //   socket2.on('user-joined', (data: any) => {
// //     console.log(`👤 [USER 2] Someone joined: ${data.message}`);
// //   });
// // }

// // /**
// //  * Test: Real-time chat between two users
// //  */
// // function testChatMessages(): void {
// //   console.log('\n\n═══════════════════════════════════════════════');
// //   console.log('TEST 2: Real-time Chat Messages');
// //   console.log('═══════════════════════════════════════════════');

// //   let user1ReceivedCount = 0;
// //   let user2ReceivedCount = 0;

// //   // Setup listeners FIRST (before sending messages)
// //   socket1.on('new-message-ride', (msg: any) => {
// //     user1ReceivedCount++;
// //     console.log(`\n💬 [USER 1 receives message #${user1ReceivedCount}]`);
// //     console.log(`   From: ${msg.senderName}`);
// //     console.log(`   Message: "${msg.text}"`);
// //     console.log(`   Time: ${new Date(msg.timestamp).toLocaleTimeString()}`);
// //   });

// //   socket2.on('new-message-ride', (msg: any) => {
// //     user2ReceivedCount++;
// //     console.log(`\n💬 [USER 2 receives message #${user2ReceivedCount}]`);
// //     console.log(`   From: ${msg.senderName}`);
// //     console.log(`   Message: "${msg.text}"`);
// //     console.log(`   Time: ${new Date(msg.timestamp).toLocaleTimeString()}`);
// //   });

// //   // Now send messages with logging
// //   setTimeout(() => {
// //     console.log('\n📤 [USER 1] Sending: "Hey team! Ride started, let\'s go! 🚴‍♂️"');
// //     socket1.emit('send-message-ride', {
// //       rideEventId: RIDE_EVENT_ID,
// //       text: 'Hey team! Ride started, let\'s go! 🚴‍♂️'
// //     });
// //   }, 500);

// //   setTimeout(() => {
// //     console.log('\n📤 [USER 2] Sending: "I\'m right behind you! Keeping up! 💨"');
// //     socket2.emit('send-message-ride', {
// //       rideEventId: RIDE_EVENT_ID,
// //       text: 'I\'m right behind you! Keeping up! 💨'
// //     });
// //   }, 1500);

// //   setTimeout(() => {
// //     console.log('\n📤 [USER 1] Sending: "Great! Next stop is the beach! 🏖️"');
// //     socket1.emit('send-message-ride', {
// //       rideEventId: RIDE_EVENT_ID,
// //       text: 'Great! Next stop is the beach! 🏖️'
// //     });
// //   }, 2500);

// //   // Summary after all messages
// //   setTimeout(() => {
// //     console.log(`\n✅ Chat test summary:`);
// //     console.log(`   USER 1 received: ${user1ReceivedCount} messages`);
// //     console.log(`   USER 2 received: ${user2ReceivedCount} messages`);
// //   }, 3500);
// // }

// // /**
// //  * Test: Live location updates
// //  */
// // function testLocationUpdates(): void {
// //   console.log('\n\n═══════════════════════════════════════════════');
// //   console.log('TEST 3: Live Location Streaming');
// //   console.log('═══════════════════════════════════════════════');

// //   let user1Lat = 19.0760;
// //   let user1Lng = 72.8777;
// //   let user2Lat = 19.0750;
// //   let user2Lng = 72.8770;

// //   // Simulate User 1 moving
// //   const user1LocationInterval = setInterval(() => {
// //     user1Lat += (Math.random() - 0.5) * 0.001;
// //     user1Lng += (Math.random() - 0.5) * 0.001;

// //     socket1.emit('location-update', {
// //       rideEventId: RIDE_EVENT_ID,
// //       lat: user1Lat,
// //       lng: user1Lng,
// //       speed: Math.random() * 40 + 20 // 20-60 km/h
// //     });
// //   }, 3000);

// //   // Simulate User 2 moving
// //   const user2LocationInterval = setInterval(() => {
// //     user2Lat += (Math.random() - 0.5) * 0.001;
// //     user2Lng += (Math.random() - 0.5) * 0.001;

// //     socket2.emit('location-update', {
// //       rideEventId: RIDE_EVENT_ID,
// //       lat: user2Lat,
// //       lng: user2Lng,
// //       speed: Math.random() * 40 + 15 // 15-55 km/h
// //     });
// //   }, 3000);

// //   // User 1 receives locations
// //   socket1.on('user-location', (data: any) => {
// //     if (data.userId !== USER_1.id) {
// //       console.log(`📍 [USER 1 receives location from User 2]`);
// //       console.log(`   Lat: ${data.lat.toFixed(4)}, Lng: ${data.lng.toFixed(4)}`);
// //       console.log(`   Speed: ${data.speed.toFixed(1)} km/h`);
// //     }
// //   });

// //   // User 2 receives locations
// //   socket2.on('user-location', (data: any) => {
// //     if (data.userId !== USER_2.id) {
// //       console.log(`📍 [USER 2 receives location from User 1]`);
// //       console.log(`   Lat: ${data.lat.toFixed(4)}, Lng: ${data.lng.toFixed(4)}`);
// //       console.log(`   Speed: ${data.speed.toFixed(1)} km/h`);
// //     }
// //   });

// //   // Stop after 30 seconds
// //   setTimeout(() => {
// //     clearInterval(user1LocationInterval);
// //     clearInterval(user2LocationInterval);
// //     console.log('\n⏹️ Location updates stopped');
// //   }, 30000);
// // }

// // /**
// //  * Test: Typing indicators
// //  */
// // function testTypingIndicators(): void {
// //   console.log('\n\n═══════════════════════════════════════════════');
// //   console.log('TEST 4: Typing Indicators');
// //   console.log('═══════════════════════════════════════════════');

// //   // User 1 starts typing
// //   setTimeout(() => {
// //     socket1.emit('typing-ride', { rideEventId: RIDE_EVENT_ID });
// //     console.log(`✍️ [USER 1] Started typing...`);
// //   }, 2000);

// //   // User 2 starts typing
// //   setTimeout(() => {
// //     socket2.emit('typing-ride', { rideEventId: RIDE_EVENT_ID });
// //     console.log(`✍️ [USER 2] Started typing...`);
// //   }, 3000);

// //   // User 1 stops typing
// //   setTimeout(() => {
// //     socket1.emit('stop-typing-ride', { rideEventId: RIDE_EVENT_ID });
// //     console.log(`✋ [USER 1] Stopped typing`);
// //   }, 5000);

// //   // User 2 stops typing
// //   setTimeout(() => {
// //     socket2.emit('stop-typing-ride', { rideEventId: RIDE_EVENT_ID });
// //     console.log(`✋ [USER 2] Stopped typing`);
// //   }, 6000);

// //   socket1.on('user-typing', (data: any) => {
// //     console.log(`✍️ [USER 1 sees] User ${data.userId} is typing...`);
// //   });

// //   socket1.on('user-stop-typing', (data: any) => {
// //     console.log(`✋ [USER 1 sees] User ${data.userId} stopped typing`);
// //   });

// //   socket2.on('user-typing', (data: any) => {
// //     console.log(`✍️ [USER 2 sees] User ${data.userId} is typing...`);
// //   });

// //   socket2.on('user-stop-typing', (data: any) => {
// //     console.log(`✋ [USER 2 sees] User ${data.userId} stopped typing`);
// //   });
// // }

// // /**
// //  * Test: SOS Emergency
// //  */
// // function testSOS(): void {
// //   console.log('\n\n═══════════════════════════════════════════════');
// //   console.log('TEST 5: SOS Emergency Alert');
// //   console.log('═══════════════════════════════════════════════');

// //   // User 2 triggers SOS after 10 seconds
// //   setTimeout(() => {
// //     socket2.emit('sos-triggered', {
// //       rideEventId: RIDE_EVENT_ID,
// //       lat: 19.0900,
// //       lng: 72.8850
// //     });
// //     console.log(`\n🚨 [USER 2] TRIGGERED SOS!`);
// //   }, 10000);

// //   // Both users listen for SOS
// //   socket1.on('sos-alert', (alert: any) => {
// //     console.log(`\n🚨 [USER 1 RECEIVED SOS ALERT!]`);
// //     console.log(`   User: ${alert.userName}`);
// //     console.log(`   Location: Lat ${alert.lat.toFixed(4)}, Lng ${alert.lng.toFixed(4)}`);
// //     console.log(`   Message: ${alert.message}`);
// //   });

// //   socket2.on('sos-alert', (alert: any) => {
// //     console.log(`\n🚨 [USER 2 RECEIVED SOS ALERT!]`);
// //     console.log(`   User: ${alert.userName}`);
// //     console.log(`   Location: Lat ${alert.lat.toFixed(4)}, Lng ${alert.lng.toFixed(4)}`);
// //     console.log(`   Message: ${alert.message}`);
// //   });
// // }

// // /**
// //  * Main Test Runner
// //  */
// // async function runAllTests(): Promise<void> {
// //   console.log('\n\n');
// //   console.log('╔═══════════════════════════════════════════════════════════╗');
// //   console.log('║      SOCKET.IO LIVE RIDE TEST - TWO USERS                ║');
// //   console.log('║      Organizer vs Participant in Live Ride               ║');
// //   console.log('╚═══════════════════════════════════════════════════════════╝');

// //   console.log('\n📡 Connecting users...');
// //   await connectUser1();
// //   await connectUser2();

// //   // Run all tests
// //   testJoinRide();

// //   setTimeout(() => testChatMessages(), 1000);
// //   setTimeout(() => testLocationUpdates(), 1500);
// //   setTimeout(() => testTypingIndicators(), 2000);
// //   setTimeout(() => testSOS(), 2500);

// //   console.log('\n\n⏰ Tests running for 40 seconds... Check output below:\n');

// //   // Cleanup after tests
// //   setTimeout(() => {
// //     console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
// //     console.log('║                    TESTS COMPLETED                       ║');
// //     console.log('╚═══════════════════════════════════════════════════════════╝\n');
// //     socket1.disconnect();
// //     socket2.disconnect();
// //     process.exit(0);
// //   }, 40000);
// // }

// // // Run tests
// // runAllTests().catch(err => {
// //   console.error('❌ Test failed:', err);
// //   process.exit(1);
// // });

// // // Graceful shutdown
// // process.on('SIGINT', () => {
// //   console.log('\n\n👋 Closing sockets...');
// //   socket1?.disconnect();
// //   socket2?.disconnect();
// //   process.exit(0);
// // });

// import { io, Socket } from 'socket.io-client';

// // User 1: Organizer (who started the event)
// const USER_1 = {
//   name: 'Tech Stackk',
//   id: '6954f825c354031d5568929e',
//   phone: '9082608032',
//   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTU0ZjgyNWMzNTQwMzFkNTU2ODkyOWUiLCJpYXQiOjE3NjczNDUwNTAsImV4cCI6MTc2Nzk0OTg1MH0.Z-JqfD0KmE6KOxlNSd-42wVc4o7MoA9-RPRhOAtWJ3I'
// };

// // User 2: Participant (other user who joined)
// const USER_2 = {
//   name: 'Anzal Shaikh',
//   id: '695389c1f4f14914d809e938',
//   phone: '7045475587',
//   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTUzODljMWY0ZjE0OTE0ZDgwOWU5MzgiLCJpYXQiOjE3NjcxNjI0NjIsImV4cCI6MTc2Nzc2NzI2Mn0.b3L0ytWaMS5ZmRJRD3Ha4WvgBVd0rEP8A1OzL1fCkzw'
// };

// const RIDE_EVENT_ID = '695b665e71bc1c9eb6aa19c9';
// const API_URL = 'http://localhost:3001';

// let socket1: Socket;
// let socket2: Socket;

// /**
//  * Connect User 1 (Organizer)
//  */
// function connectUser1(): Promise<void> {
//   return new Promise((resolve, reject) => {
//     socket1 = io(API_URL, {
//       auth: { token: USER_1.token },
//       transports: ['websocket', 'polling'],
//       reconnection: true,
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 5000,
//       reconnectionAttempts: 5
//     });

//     const timeout = setTimeout(() => {
//       reject(new Error('User 1 connection timeout'));
//     }, 10000);

//     socket1.on('connect', () => {
//       clearTimeout(timeout);
//       console.log(`\n✅ [USER 1: ${USER_1.name}] Connected`);
//       console.log(`   Socket ID: ${socket1.id}`);
//       resolve();
//     });

//     socket1.on('error', (error: string) => {
//       console.error(`❌ [USER 1] Error: ${error}`);
//     });

//     socket1.on('disconnect', () => {
//       console.log(`⚠️ [USER 1] Disconnected`);
//     });

//     socket1.on('connect_error', (error: any) => {
//       console.error(`❌ [USER 1] Connection Error:`, error);
//     });
//   });
// }

// /**
//  * Connect User 2 (Participant)
//  */
// function connectUser2(): Promise<void> {
//   return new Promise((resolve, reject) => {
//     socket2 = io(API_URL, {
//       auth: { token: USER_2.token },
//       transports: ['websocket', 'polling'],
//       reconnection: true,
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 5000,
//       reconnectionAttempts: 5
//     });

//     const timeout = setTimeout(() => {
//       reject(new Error('User 2 connection timeout'));
//     }, 10000);

//     socket2.on('connect', () => {
//       clearTimeout(timeout);
//       console.log(`\n✅ [USER 2: ${USER_2.name}] Connected`);
//       console.log(`   Socket ID: ${socket2.id}`);
//       resolve();
//     });

//     socket2.on('error', (error: string) => {
//       console.error(`❌ [USER 2] Error: ${error}`);
//     });

//     socket2.on('disconnect', () => {
//       console.log(`⚠️ [USER 2] Disconnected`);
//     });

//     socket2.on('connect_error', (error: any) => {
//       console.error(`❌ [USER 2] Connection Error:`, error);
//     });
//   });
// }

// /**
//  * Test: Both users join the ride
//  */
// function testJoinRide(): void {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 1: Join Ride Event');
//   console.log('═══════════════════════════════════════════════');

//   // User 1 joins
//   socket1.emit('join-ride', { rideEventId: RIDE_EVENT_ID });
//   socket1.on('join-success', (data: any) => {
//     console.log(`✅ [USER 1] Joined ride: ${data.message}`);
//   });

//   socket1.on('user-joined', (data: any) => {
//     console.log(`👤 [USER 1] Someone joined: ${data.message}`);
//   });

//   // User 2 joins
//   socket2.emit('join-ride', { rideEventId: RIDE_EVENT_ID });
//   socket2.on('join-success', (data: any) => {
//     console.log(`✅ [USER 2] Joined ride: ${data.message}`);
//   });

//   socket2.on('user-joined', (data: any) => {
//     console.log(`👤 [USER 2] Someone joined: ${data.message}`);
//   });
// }

// /**
//  * TEST: HOST STARTS RIDE
//  * Simulates organizer clicking "Start Ride" button
//  */
// function testHostStartsRide(): void {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 2: HOST STARTED RIDE (Via REST API)');
//   console.log('═══════════════════════════════════════════════');

//   console.log(`📢 [HOST] Calling REST API: POST /ride-events/${RIDE_EVENT_ID}/start`);

//   // Listen for the socket broadcast
//   socket2.on('ride-started-notification', (data: any) => {
//     console.log(`\n🚴 [USER 2 RECEIVED NOTIFICATION]`);
//     console.log(`   Message: ${data.message}`);
//     console.log(`   Ride ID: ${data.rideEventId}`);
//     console.log(`   ⏰ Can now click "START MY RIDE" button`);
//   });

//   socket1.on('ride-started-notification', (data: any) => {
//     console.log(`\n🚴 [USER 1 RECEIVED NOTIFICATION]`);
//     console.log(`   Message: ${data.message}`);
//   });

//   console.log(`\n📌 Call this via REST API or Postman:`);
//   console.log(`   POST ${API_URL}/api/v1/ride-events/${RIDE_EVENT_ID}/start`);
//   console.log(`   Headers: { Authorization: Bearer ${USER_1.token.substring(0, 20)}... }`);
// }

// /**
//  * TEST: RIDER STARTS THEIR TRACKING
//  * Simulates rider clicking "Start My Ride" button
//  */
// function testRiderStartsRide(): void {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 3: RIDER STARTS TRACKING (Via REST API)');
//   console.log('═══════════════════════════════════════════════');

//   console.log(`🚴 [RIDER USER 2] Calling REST API: POST /ride-events/${RIDE_EVENT_ID}/rider-start`);

//   console.log(`\n📌 Call this via REST API or Postman:`);
//   console.log(`   POST ${API_URL}/api/v1/ride-events/${RIDE_EVENT_ID}/rider-start`);
//   console.log(`   Headers: { Authorization: Bearer ${USER_2.token.substring(0, 20)}... }`);
//   console.log(`   Body: {`);
//   console.log(`     "location": { "lat": 19.0760, "lng": 72.8777 },`);
//   console.log(`     "emergencyContacts": [`);
//   console.log(`       { "name": "Mom", "phone": "+91-9876543210" }`);
//   console.log(`     ]`);
//   console.log(`   }`);
//   console.log(`\n✅ After this, status becomes ACTIVE and tracking starts`);
// }

// /**
//  * Test: Real-time chat between two users
//  */
// function testChatMessages(): void {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 4: Real-time Chat Messages');
//   console.log('═══════════════════════════════════════════════');

//   let user1ReceivedCount = 0;
//   let user2ReceivedCount = 0;

//   // Setup listeners FIRST
//   socket1.on('new-message-ride', (msg: any) => {
//     user1ReceivedCount++;
//     console.log(`\n💬 [USER 1 receives message #${user1ReceivedCount}]`);
//     console.log(`   From: ${msg.senderName}`);
//     console.log(`   Message: "${msg.text}"`);
//   });

//   socket2.on('new-message-ride', (msg: any) => {
//     user2ReceivedCount++;
//     console.log(`\n💬 [USER 2 receives message #${user2ReceivedCount}]`);
//     console.log(`   From: ${msg.senderName}`);
//     console.log(`   Message: "${msg.text}"`);
//   });

//   // Send messages
//   setTimeout(() => {
//     console.log('\n📤 [USER 1] Sending: "Hey team! Let\'s ride! 🚴‍♂️"');
//     socket1.emit('send-message-ride', {
//       rideEventId: RIDE_EVENT_ID,
//       text: 'Hey team! Let\'s ride! 🚴‍♂️'
//     });
//   }, 500);

//   setTimeout(() => {
//     console.log('\n📤 [USER 2] Sending: "I\'m ready! Let\'s go! 💨"');
//     socket2.emit('send-message-ride', {
//       rideEventId: RIDE_EVENT_ID,
//       text: 'I\'m ready! Let\'s go! 💨'
//     });
//   }, 1500);
// }

// /**
//  * Test: Live location updates
//  */
// function testLocationUpdates(): void {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 5: Live Location Streaming');
//   console.log('═══════════════════════════════════════════════');

//   let user1Lat = 19.0760;
//   let user1Lng = 72.8777;
//   let user2Lat = 19.0750;
//   let user2Lng = 72.8770;
//   let locationCount = 0;

//   // Simulate User 1 moving
//   const user1LocationInterval = setInterval(() => {
//     user1Lat += (Math.random() - 0.5) * 0.001;
//     user1Lng += (Math.random() - 0.5) * 0.001;

//     socket1.emit('location-update', {
//       rideEventId: RIDE_EVENT_ID,
//       lat: user1Lat,
//       lng: user1Lng,
//       speed: Math.random() * 40 + 20
//     });
//   }, 3000);

//   // Simulate User 2 moving
//   const user2LocationInterval = setInterval(() => {
//     user2Lat += (Math.random() - 0.5) * 0.001;
//     user2Lng += (Math.random() - 0.5) * 0.001;

//     socket2.emit('location-update', {
//       rideEventId: RIDE_EVENT_ID,
//       lat: user2Lat,
//       lng: user2Lng,
//       speed: Math.random() * 40 + 15
//     });
//   }, 3000);

//   // User 1 receives locations
//   socket1.on('user-location', (data: any) => {
//     if (data.userId !== USER_1.id) {
//       locationCount++;
//       console.log(`📍 [USER 1 receives location #${locationCount} from User 2]`);
//       console.log(`   Lat: ${data.lat.toFixed(4)}, Lng: ${data.lng.toFixed(4)}`);
//       console.log(`   Speed: ${data.speed.toFixed(1)} km/h`);
//     }
//   });

//   // User 2 receives locations
//   socket2.on('user-location', (data: any) => {
//     if (data.userId !== USER_2.id) {
//       console.log(`📍 [USER 2 receives location from User 1]`);
//       console.log(`   Lat: ${data.lat.toFixed(4)}, Lng: ${data.lng.toFixed(4)}`);
//       console.log(`   Speed: ${data.speed.toFixed(1)} km/h`);
//     }
//   });

//   // Stop after 20 seconds
//   setTimeout(() => {
//     clearInterval(user1LocationInterval);
//     clearInterval(user2LocationInterval);
//     console.log('\n⏹️ Location updates stopped');
//   }, 20000);
// }

// /**
//  * Test: Typing indicators
//  */
// function testTypingIndicators(): void {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 6: Typing Indicators');
//   console.log('═══════════════════════════════════════════════');

//   // User 1 starts typing
//   setTimeout(() => {
//     socket1.emit('typing-ride', { rideEventId: RIDE_EVENT_ID });
//     console.log(`✍️ [USER 1] Started typing...`);
//   }, 2000);

//   // User 2 starts typing
//   setTimeout(() => {
//     socket2.emit('typing-ride', { rideEventId: RIDE_EVENT_ID });
//     console.log(`✍️ [USER 2] Started typing...`);
//   }, 3000);

//   // User 1 stops typing
//   setTimeout(() => {
//     socket1.emit('stop-typing-ride', { rideEventId: RIDE_EVENT_ID });
//     console.log(`✋ [USER 1] Stopped typing`);
//   }, 5000);

//   // User 2 stops typing
//   setTimeout(() => {
//     socket2.emit('stop-typing-ride', { rideEventId: RIDE_EVENT_ID });
//     console.log(`✋ [USER 2] Stopped typing`);
//   }, 6000);

//   socket1.on('user-typing', (data: any) => {
//     console.log(`✍️ [USER 1 sees] User ${data.userId.substring(0, 8)}... is typing...`);
//   });

//   socket1.on('user-stop-typing', () => {
//     console.log(`✋ [USER 1 sees] User stopped typing`);
//   });

//   socket2.on('user-typing', (data: any) => {
//     console.log(`✍️ [USER 2 sees] User ${data.userId.substring(0, 8)}... is typing...`);
//   });

//   socket2.on('user-stop-typing', () => {
//     console.log(`✋ [USER 2 sees] User stopped typing`);
//   });
// }

// /**
//  * Test: SOS Emergency
//  */
// function testSOS(): void {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 7: SOS Emergency Alert');
//   console.log('═══════════════════════════════════════════════');

//   // User 2 triggers SOS
//   setTimeout(() => {
//     socket2.emit('sos-triggered', {
//       rideEventId: RIDE_EVENT_ID,
//       lat: 19.0900,
//       lng: 72.8850
//     });
//     console.log(`\n🚨 [USER 2] TRIGGERED SOS!`);
//   }, 10000);

//   // Both users listen for SOS
//   socket1.on('sos-alert', (alert: any) => {
//     console.log(`\n🚨 [USER 1 RECEIVED SOS ALERT!]`);
//     console.log(`   User: ${alert.userName}`);
//     console.log(`   Location: Lat ${alert.lat.toFixed(4)}, Lng ${alert.lng.toFixed(4)}`);
//     console.log(`   Message: ${alert.message}`);
//   });

//   socket2.on('sos-alert', (alert: any) => {
//     console.log(`\n🚨 [USER 2 RECEIVED SOS ALERT!]`);
//     console.log(`   User: ${alert.userName}`);
//     console.log(`   Location: Lat ${alert.lat.toFixed(4)}, Lng ${alert.lng.toFixed(4)}`);
//     console.log(`   Message: ${alert.message}`);
//   });
// }

// /**
//  * TEST: RIDER ENDS RIDE
//  * Simulates rider clicking "End My Ride" button
//  */
// function testRiderEndsRide(): void {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 8: RIDER ENDS THEIR TRACKING (Via REST API)');
//   console.log('═══════════════════════════════════════════════');

//   console.log(`🏁 [RIDER] Calling REST API: POST /ride-events/${RIDE_EVENT_ID}/rider-end`);

//   console.log(`\n📌 Call this via REST API or Postman:`);
//   console.log(`   POST ${API_URL}/api/v1/ride-events/${RIDE_EVENT_ID}/rider-end`);
//   console.log(`   Headers: { Authorization: Bearer ${USER_2.token.substring(0, 20)}... }`);
//   console.log(`\n✅ Status changes to COMPLETED`);
//   console.log(`✅ Can now view ride summary`);
// }

// /**
//  * TEST: HOST ENDS RIDE
//  * Simulates host/organizer clicking "End Ride" button
//  */
// function testHostEndsRide(): void {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 9: HOST ENDS RIDE (Via REST API)');
//   console.log('═══════════════════════════════════════════════');

//   console.log(`🏁 [HOST] Calling REST API: POST /ride-events/${RIDE_EVENT_ID}/end`);

//   console.log(`\n📌 Call this via REST API or Postman:`);
//   console.log(`   POST ${API_URL}/api/v1/ride-events/${RIDE_EVENT_ID}/end`);
//   console.log(`   Headers: { Authorization: Bearer ${USER_1.token.substring(0, 20)}... }`);

//   // Listen for ride ended event
//   socket2.on('ride-ended', (data: any) => {
//     console.log(`\n🏁 [USER 2 RECEIVED: RIDE ENDED]`);
//     console.log(`   Message: ${data.message}`);
//     console.log(`   Ended At: ${new Date(data.endedAt).toLocaleTimeString()}`);
//   });

//   socket1.on('ride-ended', (data: any) => {
//     console.log(`\n🏁 [USER 1 RECEIVED: RIDE ENDED]`);
//     console.log(`   Message: ${data.message}`);
//   });

//   console.log(`\n✅ Ride status: COMPLETED`);
//   console.log(`✅ No-shows marked for users who never started`);
//   console.log(`✅ Ready for summary view`);
// }

// /**
//  * Main Test Runner
//  */
// async function runAllTests(): Promise<void> {
//   console.log('\n\n');
//   console.log('╔═══════════════════════════════════════════════════════════╗');
//   console.log('║      COMPLETE SOCKET.IO RIDE LIFECYCLE TEST              ║');
//   console.log('║      Testing All Events: Start, Stream, End, Chat        ║');
//   console.log('╚═══════════════════════════════════════════════════════════╝');

//   console.log('\n📡 Connecting users...');
//   await connectUser1();
//   await connectUser2();

//   // Run all tests in sequence
//   testJoinRide();
//   setTimeout(() => testHostStartsRide(), 1000);
//   setTimeout(() => testRiderStartsRide(), 2000);
//   setTimeout(() => testChatMessages(), 3000);
//   setTimeout(() => testLocationUpdates(), 4000);
//   setTimeout(() => testTypingIndicators(), 5000);
//   setTimeout(() => testSOS(), 6000);
//   setTimeout(() => testRiderEndsRide(), 7000);
//   setTimeout(() => testHostEndsRide(), 8000);

//   console.log('\n\n⏰ Tests set up for 30 seconds... Check output below:\n');

//   // Cleanup after tests
//   setTimeout(() => {
//     console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
//     console.log('║              ✅ ALL TESTS COMPLETED ✅                   ║');
//     console.log('║                                                         ║');
//     console.log('║  Review the output above to verify all socket events   ║');
//     console.log('║  are working correctly!                               ║');
//     console.log('╚═══════════════════════════════════════════════════════════╝\n');
//     socket1.disconnect();
//     socket2.disconnect();
//     process.exit(0);
//   }, 30000);
// }

// // Run tests
// runAllTests().catch(err => {
//   console.error('❌ Test failed:', err);
//   process.exit(1);
// });

// // Graceful shutdown
// process.on('SIGINT', () => {
//   console.log('\n\n👋 Closing sockets...');
//   socket1?.disconnect();
//   socket2?.disconnect();
//   process.exit(0);
// });
