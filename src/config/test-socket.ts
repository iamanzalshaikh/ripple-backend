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
//   return new Promise((resolve) => {
//     socket1 = io(API_URL, {
//       auth: { token: USER_1.token },
//       transports: ['websocket', 'polling']
//     });

//     socket1.on('connect', () => {
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
//   });
// }

// /**
//  * Connect User 2 (Participant)
//  */
// function connectUser2(): Promise<void> {
//   return new Promise((resolve) => {
//     socket2 = io(API_URL, {
//       auth: { token: USER_2.token },
//       transports: ['websocket', 'polling']
//     });

//     socket2.on('connect', () => {
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
//  * Test: Real-time chat between two users
//  */
// function testChatMessages(): void {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 2: Real-time Chat Messages');
//   console.log('═══════════════════════════════════════════════');

//   // User 1 sends message
//   setTimeout(() => {
//     socket1.emit('send-message-ride', {
//       rideEventId: RIDE_EVENT_ID,
//       text: 'Hey team! Ride started, let\'s go! 🚴‍♂️'
//     });
//   }, 1000);

//   // User 2 sends message
//   setTimeout(() => {
//     socket2.emit('send-message-ride', {
//       rideEventId: RIDE_EVENT_ID,
//       text: 'I\'m right behind you! Keeping up! 💨'
//     });
//   }, 2000);

//   // User 1 sends another message
//   setTimeout(() => {
//     socket1.emit('send-message-ride', {
//       rideEventId: RIDE_EVENT_ID,
//       text: 'Great! Next stop is the beach! 🏖️'
//     });
//   }, 3000);

//   // Listen for messages on both sockets
//   socket1.on('new-message-ride', (msg: any) => {
//     console.log(`\n💬 [USER 1 receives]`);
//     console.log(`   From: ${msg.senderName}`);
//     console.log(`   Message: ${msg.text}`);
//     console.log(`   Time: ${new Date(msg.timestamp).toLocaleTimeString()}`);
//   });

//   socket2.on('new-message-ride', (msg: any) => {
//     console.log(`\n💬 [USER 2 receives]`);
//     console.log(`   From: ${msg.senderName}`);
//     console.log(`   Message: ${msg.text}`);
//     console.log(`   Time: ${new Date(msg.timestamp).toLocaleTimeString()}`);
//   });
// }

// /**
//  * Test: Live location updates
//  */
// function testLocationUpdates(): void {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 3: Live Location Streaming');
//   console.log('═══════════════════════════════════════════════');

//   let user1Lat = 19.0760;
//   let user1Lng = 72.8777;
//   let user2Lat = 19.0750;
//   let user2Lng = 72.8770;

//   // Simulate User 1 moving
//   const user1LocationInterval = setInterval(() => {
//     user1Lat += (Math.random() - 0.5) * 0.001;
//     user1Lng += (Math.random() - 0.5) * 0.001;

//     socket1.emit('location-update', {
//       rideEventId: RIDE_EVENT_ID,
//       lat: user1Lat,
//       lng: user1Lng,
//       speed: Math.random() * 40 + 20 // 20-60 km/h
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
//       speed: Math.random() * 40 + 15 // 15-55 km/h
//     });
//   }, 3000);

//   // User 1 receives locations
//   socket1.on('user-location', (data: any) => {
//     if (data.userId !== USER_1.id) {
//       console.log(`📍 [USER 1 receives location from User 2]`);
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

//   // Stop after 30 seconds
//   setTimeout(() => {
//     clearInterval(user1LocationInterval);
//     clearInterval(user2LocationInterval);
//     console.log('\n⏹️ Location updates stopped');
//   }, 30000);
// }

// /**
//  * Test: Typing indicators
//  */
// function testTypingIndicators(): void {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 4: Typing Indicators');
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
//     console.log(`✍️ [USER 1 sees] User ${data.userId} is typing...`);
//   });

//   socket1.on('user-stop-typing', (data: any) => {
//     console.log(`✋ [USER 1 sees] User ${data.userId} stopped typing`);
//   });

//   socket2.on('user-typing', (data: any) => {
//     console.log(`✍️ [USER 2 sees] User ${data.userId} is typing...`);
//   });

//   socket2.on('user-stop-typing', (data: any) => {
//     console.log(`✋ [USER 2 sees] User ${data.userId} stopped typing`);
//   });
// }

// /**
//  * Test: SOS Emergency
//  */
// function testSOS(): void {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 5: SOS Emergency Alert');
//   console.log('═══════════════════════════════════════════════');

//   // User 2 triggers SOS after 10 seconds
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
//  * Main Test Runner
//  */
// async function runAllTests(): Promise<void> {
//   console.log('\n\n');
//   console.log('╔═══════════════════════════════════════════════════════════╗');
//   console.log('║      SOCKET.IO LIVE RIDE TEST - TWO USERS                ║');
//   console.log('║      Organizer vs Participant in Live Ride               ║');
//   console.log('╚═══════════════════════════════════════════════════════════╝');

//   console.log('\n📡 Connecting users...');
//   await connectUser1();
//   await connectUser2();

//   // Run all tests
//   testJoinRide();
  
//   setTimeout(() => testChatMessages(), 1000);
//   setTimeout(() => testLocationUpdates(), 1500);
//   setTimeout(() => testTypingIndicators(), 2000);
//   setTimeout(() => testSOS(), 2500);

//   console.log('\n\n⏰ Tests running for 40 seconds... Check output below:\n');

//   // Cleanup after tests
//   setTimeout(() => {
//     console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
//     console.log('║                    TESTS COMPLETED                       ║');
//     console.log('╚═══════════════════════════════════════════════════════════╝\n');
//     socket1.disconnect();
//     socket2.disconnect();
//     process.exit(0);
//   }, 40000);
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


import { io, Socket } from 'socket.io-client';

// User 1: Organizer (who started the event)
const USER_1 = {
  name: 'Tech Stackk',
  id: '6954f825c354031d5568929e',
  phone: '9082608032',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTU0ZjgyNWMzNTQwMzFkNTU2ODkyOWUiLCJpYXQiOjE3NjczNDUwNTAsImV4cCI6MTc2Nzk0OTg1MH0.Z-JqfD0KmE6KOxlNSd-42wVc4o7MoA9-RPRhOAtWJ3I'
};

// User 2: Participant (other user who joined)
const USER_2 = {
  name: 'Anzal Shaikh',
  id: '695389c1f4f14914d809e938',
  phone: '7045475587',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTUzODljMWY0ZjE0OTE0ZDgwOWU5MzgiLCJpYXQiOjE3NjcxNjI0NjIsImV4cCI6MTc2Nzc2NzI2Mn0.b3L0ytWaMS5ZmRJRD3Ha4WvgBVd0rEP8A1OzL1fCkzw'
};

const RIDE_EVENT_ID = '695b665e71bc1c9eb6aa19c9';
const API_URL = 'http://localhost:3001';

let socket1: Socket;
let socket2: Socket;

/**
 * Connect User 1 (Organizer)
 */
function connectUser1(): Promise<void> {
  return new Promise((resolve, reject) => {
    socket1 = io(API_URL, {
      auth: { token: USER_1.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    const timeout = setTimeout(() => {
      reject(new Error('User 1 connection timeout'));
    }, 10000);

    socket1.on('connect', () => {
      clearTimeout(timeout);
      console.log(`\n✅ [USER 1: ${USER_1.name}] Connected`);
      console.log(`   Socket ID: ${socket1.id}`);
      resolve();
    });

    socket1.on('error', (error: string) => {
      console.error(`❌ [USER 1] Error: ${error}`);
    });

    socket1.on('disconnect', () => {
      console.log(`⚠️ [USER 1] Disconnected`);
    });

    socket1.on('connect_error', (error: any) => {
      console.error(`❌ [USER 1] Connection Error:`, error);
      console.error(`   Message:`, error.message);
      console.error(`   Data:`, error.data);
    });
  });
}

/**
 * Connect User 2 (Participant)
 */
function connectUser2(): Promise<void> {
  return new Promise((resolve, reject) => {
    socket2 = io(API_URL, {
      auth: { token: USER_2.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    const timeout = setTimeout(() => {
      reject(new Error('User 2 connection timeout'));
    }, 10000);

    socket2.on('connect', () => {
      clearTimeout(timeout);
      console.log(`\n✅ [USER 2: ${USER_2.name}] Connected`);
      console.log(`   Socket ID: ${socket2.id}`);
      resolve();
    });

    socket2.on('error', (error: string) => {
      console.error(`❌ [USER 2] Error: ${error}`);
    });

    socket2.on('disconnect', () => {
      console.log(`⚠️ [USER 2] Disconnected`);
    });

    socket2.on('connect_error', (error: any) => {
      console.error(`❌ [USER 2] Connection Error:`, error);
      console.error(`   Message:`, error.message);
      console.error(`   Data:`, error.data);
    });
  });
}

/**
 * Test: Both users join the ride
 */
function testJoinRide(): void {
  console.log('\n\n═══════════════════════════════════════════════');
  console.log('TEST 1: Join Ride Event');
  console.log('═══════════════════════════════════════════════');

  // User 1 joins
  socket1.emit('join-ride', { rideEventId: RIDE_EVENT_ID });
  socket1.on('join-success', (data: any) => {
    console.log(`✅ [USER 1] Joined ride: ${data.message}`);
  });

  socket1.on('user-joined', (data: any) => {
    console.log(`👤 [USER 1] Someone joined: ${data.message}`);
  });

  // User 2 joins
  socket2.emit('join-ride', { rideEventId: RIDE_EVENT_ID });
  socket2.on('join-success', (data: any) => {
    console.log(`✅ [USER 2] Joined ride: ${data.message}`);
  });

  socket2.on('user-joined', (data: any) => {
    console.log(`👤 [USER 2] Someone joined: ${data.message}`);
  });
}

/**
 * Test: Real-time chat between two users
 */
function testChatMessages(): void {
  console.log('\n\n═══════════════════════════════════════════════');
  console.log('TEST 2: Real-time Chat Messages');
  console.log('═══════════════════════════════════════════════');

  let user1ReceivedCount = 0;
  let user2ReceivedCount = 0;

  // Setup listeners FIRST (before sending messages)
  socket1.on('new-message-ride', (msg: any) => {
    user1ReceivedCount++;
    console.log(`\n💬 [USER 1 receives message #${user1ReceivedCount}]`);
    console.log(`   From: ${msg.senderName}`);
    console.log(`   Message: "${msg.text}"`);
    console.log(`   Time: ${new Date(msg.timestamp).toLocaleTimeString()}`);
  });

  socket2.on('new-message-ride', (msg: any) => {
    user2ReceivedCount++;
    console.log(`\n💬 [USER 2 receives message #${user2ReceivedCount}]`);
    console.log(`   From: ${msg.senderName}`);
    console.log(`   Message: "${msg.text}"`);
    console.log(`   Time: ${new Date(msg.timestamp).toLocaleTimeString()}`);
  });

  // Now send messages with logging
  setTimeout(() => {
    console.log('\n📤 [USER 1] Sending: "Hey team! Ride started, let\'s go! 🚴‍♂️"');
    socket1.emit('send-message-ride', {
      rideEventId: RIDE_EVENT_ID,
      text: 'Hey team! Ride started, let\'s go! 🚴‍♂️'
    });
  }, 500);

  setTimeout(() => {
    console.log('\n📤 [USER 2] Sending: "I\'m right behind you! Keeping up! 💨"');
    socket2.emit('send-message-ride', {
      rideEventId: RIDE_EVENT_ID,
      text: 'I\'m right behind you! Keeping up! 💨'
    });
  }, 1500);

  setTimeout(() => {
    console.log('\n📤 [USER 1] Sending: "Great! Next stop is the beach! 🏖️"');
    socket1.emit('send-message-ride', {
      rideEventId: RIDE_EVENT_ID,
      text: 'Great! Next stop is the beach! 🏖️'
    });
  }, 2500);

  // Summary after all messages
  setTimeout(() => {
    console.log(`\n✅ Chat test summary:`);
    console.log(`   USER 1 received: ${user1ReceivedCount} messages`);
    console.log(`   USER 2 received: ${user2ReceivedCount} messages`);
  }, 3500);
}

/**
 * Test: Live location updates
 */
function testLocationUpdates(): void {
  console.log('\n\n═══════════════════════════════════════════════');
  console.log('TEST 3: Live Location Streaming');
  console.log('═══════════════════════════════════════════════');

  let user1Lat = 19.0760;
  let user1Lng = 72.8777;
  let user2Lat = 19.0750;
  let user2Lng = 72.8770;

  // Simulate User 1 moving
  const user1LocationInterval = setInterval(() => {
    user1Lat += (Math.random() - 0.5) * 0.001;
    user1Lng += (Math.random() - 0.5) * 0.001;

    socket1.emit('location-update', {
      rideEventId: RIDE_EVENT_ID,
      lat: user1Lat,
      lng: user1Lng,
      speed: Math.random() * 40 + 20 // 20-60 km/h
    });
  }, 3000);

  // Simulate User 2 moving
  const user2LocationInterval = setInterval(() => {
    user2Lat += (Math.random() - 0.5) * 0.001;
    user2Lng += (Math.random() - 0.5) * 0.001;

    socket2.emit('location-update', {
      rideEventId: RIDE_EVENT_ID,
      lat: user2Lat,
      lng: user2Lng,
      speed: Math.random() * 40 + 15 // 15-55 km/h
    });
  }, 3000);

  // User 1 receives locations
  socket1.on('user-location', (data: any) => {
    if (data.userId !== USER_1.id) {
      console.log(`📍 [USER 1 receives location from User 2]`);
      console.log(`   Lat: ${data.lat.toFixed(4)}, Lng: ${data.lng.toFixed(4)}`);
      console.log(`   Speed: ${data.speed.toFixed(1)} km/h`);
    }
  });

  // User 2 receives locations
  socket2.on('user-location', (data: any) => {
    if (data.userId !== USER_2.id) {
      console.log(`📍 [USER 2 receives location from User 1]`);
      console.log(`   Lat: ${data.lat.toFixed(4)}, Lng: ${data.lng.toFixed(4)}`);
      console.log(`   Speed: ${data.speed.toFixed(1)} km/h`);
    }
  });

  // Stop after 30 seconds
  setTimeout(() => {
    clearInterval(user1LocationInterval);
    clearInterval(user2LocationInterval);
    console.log('\n⏹️ Location updates stopped');
  }, 30000);
}

/**
 * Test: Typing indicators
 */
function testTypingIndicators(): void {
  console.log('\n\n═══════════════════════════════════════════════');
  console.log('TEST 4: Typing Indicators');
  console.log('═══════════════════════════════════════════════');

  // User 1 starts typing
  setTimeout(() => {
    socket1.emit('typing-ride', { rideEventId: RIDE_EVENT_ID });
    console.log(`✍️ [USER 1] Started typing...`);
  }, 2000);

  // User 2 starts typing
  setTimeout(() => {
    socket2.emit('typing-ride', { rideEventId: RIDE_EVENT_ID });
    console.log(`✍️ [USER 2] Started typing...`);
  }, 3000);

  // User 1 stops typing
  setTimeout(() => {
    socket1.emit('stop-typing-ride', { rideEventId: RIDE_EVENT_ID });
    console.log(`✋ [USER 1] Stopped typing`);
  }, 5000);

  // User 2 stops typing
  setTimeout(() => {
    socket2.emit('stop-typing-ride', { rideEventId: RIDE_EVENT_ID });
    console.log(`✋ [USER 2] Stopped typing`);
  }, 6000);

  socket1.on('user-typing', (data: any) => {
    console.log(`✍️ [USER 1 sees] User ${data.userId} is typing...`);
  });

  socket1.on('user-stop-typing', (data: any) => {
    console.log(`✋ [USER 1 sees] User ${data.userId} stopped typing`);
  });

  socket2.on('user-typing', (data: any) => {
    console.log(`✍️ [USER 2 sees] User ${data.userId} is typing...`);
  });

  socket2.on('user-stop-typing', (data: any) => {
    console.log(`✋ [USER 2 sees] User ${data.userId} stopped typing`);
  });
}

/**
 * Test: SOS Emergency
 */
function testSOS(): void {
  console.log('\n\n═══════════════════════════════════════════════');
  console.log('TEST 5: SOS Emergency Alert');
  console.log('═══════════════════════════════════════════════');

  // User 2 triggers SOS after 10 seconds
  setTimeout(() => {
    socket2.emit('sos-triggered', {
      rideEventId: RIDE_EVENT_ID,
      lat: 19.0900,
      lng: 72.8850
    });
    console.log(`\n🚨 [USER 2] TRIGGERED SOS!`);
  }, 10000);

  // Both users listen for SOS
  socket1.on('sos-alert', (alert: any) => {
    console.log(`\n🚨 [USER 1 RECEIVED SOS ALERT!]`);
    console.log(`   User: ${alert.userName}`);
    console.log(`   Location: Lat ${alert.lat.toFixed(4)}, Lng ${alert.lng.toFixed(4)}`);
    console.log(`   Message: ${alert.message}`);
  });

  socket2.on('sos-alert', (alert: any) => {
    console.log(`\n🚨 [USER 2 RECEIVED SOS ALERT!]`);
    console.log(`   User: ${alert.userName}`);
    console.log(`   Location: Lat ${alert.lat.toFixed(4)}, Lng ${alert.lng.toFixed(4)}`);
    console.log(`   Message: ${alert.message}`);
  });
}

/**
 * Main Test Runner
 */
async function runAllTests(): Promise<void> {
  console.log('\n\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║      SOCKET.IO LIVE RIDE TEST - TWO USERS                ║');
  console.log('║      Organizer vs Participant in Live Ride               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  console.log('\n📡 Connecting users...');
  await connectUser1();
  await connectUser2();

  // Run all tests
  testJoinRide();
  
  setTimeout(() => testChatMessages(), 1000);
  setTimeout(() => testLocationUpdates(), 1500);
  setTimeout(() => testTypingIndicators(), 2000);
  setTimeout(() => testSOS(), 2500);

  console.log('\n\n⏰ Tests running for 40 seconds... Check output below:\n');

  // Cleanup after tests
  setTimeout(() => {
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    TESTS COMPLETED                       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    socket1.disconnect();
    socket2.disconnect();
    process.exit(0);
  }, 40000);
}

// Run tests
runAllTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Closing sockets...');
  socket1?.disconnect();
  socket2?.disconnect();
  process.exit(0);
});






/**
 * File: src/config/socket.ts
 * Complete Socket.io server with:
 * - Authentication
 * - Notifications
 * - Ride Events (chat, GPS, SOS)
 * - Groups (chat, typing)
 * - Private Chat (1:1 messaging)
 */



// import { Server as HTTPServer } from "http";
// import { Server as SocketIOServer, Socket } from "socket.io";
// import logger from "./logger";
// import { verifyUserAccessToken, UserTokenPayload } from "../utils/jwt";
// import ChatMessage from "../models/chatMessage.model";
// import RideEvent from "../models/rideEvent.model";
// import Group from "../models/group.model";
// import User from "../models/user.model";

// export interface AuthenticatedSocket extends Socket {
//   data: {
//     userId: string;
//     phone: string;
//   };
// }

// /**
//  * Initialize Socket.io server with authentication
//  * Supports: Notifications, Ride Events, Groups, Private Chat
//  */
// export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
//   const io = new SocketIOServer(httpServer, {
//     cors: {
//       origin: process.env.FRONTEND_URL || "http://localhost:3000",
//       methods: ["GET", "POST"],
//       credentials: true,
//     },
//     transports: ["websocket", "polling"],
//     transports: ["websocket", "polling"],
//     pingInterval: 25000,
//     pingTimeout: 20000,
//     pingTimeout: 20000,
//   });

//   // ==================== AUTHENTICATION MIDDLEWARE ====================
//   io.use((socket: AuthenticatedSocket, next) => {
//     try {
//       const token = socket.handshake.auth.token;

//       if (!token) {
//         logger.warn("[Socket Auth] No token provided");
//         return next(new Error("No token provided"));
//       }

//       const decoded = verifyUserAccessToken(token) as UserTokenPayload;

//       if (!decoded || !decoded.userId) {
//         logger.warn("[Socket Auth] Invalid token");
//         return next(new Error("Invalid token"));
//       }

//       socket.data.userId = decoded.userId;
//       socket.data.phone = decoded.phone;

//       logger.info(
//         `[Socket Auth] User ${decoded.userId} authenticated (Socket ID: ${socket.id})`
//       );
//       next();
//     } catch (error: any) {
//       logger.error(`[Socket Auth] Error: ${error.message}`);
//       next(new Error("Authentication failed"));
//       next(new Error("Authentication failed"));
//     }
//   });

//   // ==================== CONNECTION HANDLER ====================
//   io.on("connection", (socket: AuthenticatedSocket) => {
//   io.on("connection", (socket: AuthenticatedSocket) => {
//     const userId = socket.data.userId;

//     // Join user-specific room for notifications
//     socket.join(`user:${userId}`);
//     logger.info(`[Socket] User ${userId} connected. Socket ID: ${socket.id}`);

//     // ==================== HEARTBEAT ====================
//     socket.on("ping", () => {
//       socket.emit("pong");
//       logger.debug(`[Socket Ping] User ${userId}`);
//     });

//     // ==================== RIDE EVENTS ====================

//     /**
//      * Join ride event chat
//      */
//     socket.on("join-ride", async (data: { rideEventId: string }) => {
//       try {
//         const { rideEventId } = data;

//         // Verify user is participant
//         const ride = await RideEvent.findById(rideEventId);
//         if (!ride) {
//           socket.emit("error", { message: "Ride not found" });
//           return;
//         }

//         const isParticipant = ride.participants.some(
//           (p: any) => p.userId.toString() === userId
//         );
//         if (!isParticipant) {
//           socket.emit("error", { message: "Not a participant in this ride" });
//           return;
//         }

//         socket.join(`ride:${rideEventId}`);

//         socket.to(`ride:${rideEventId}`).emit("user-joined", {
//           userId,
//           message: "User joined the ride",
//           timestamp: new Date(),
//         });

//         socket.emit("join-success", {
//           rideEventId,
//           message: "Successfully joined ride chat",
//         });

//         logger.info(`[join-ride] User ${userId} joined ride ${rideEventId}`);
//       } catch (error: any) {
//         logger.error(`[join-ride] Error: ${error.message}`);
//         socket.emit("error", { message: error.message });
//       }
//     });

//     /**
//      * Leave ride event chat
//      */
//     socket.on("leave-ride", (data: { rideEventId: string }) => {
//       try {
//         const { rideEventId } = data;
//         socket.leave(`ride:${rideEventId}`);

//         socket.to(`ride:${rideEventId}`).emit("user-left", {
//           userId,
//           message: "User left the ride",
//           timestamp: new Date(),
//         });

//         logger.info(`[leave-ride] User ${userId} left ride ${rideEventId}`);
//       } catch (error: any) {
//         logger.error(`[leave-ride] Error: ${error.message}`);
//       }
//     });

//     /**
//      * Send message in ride chat
//      */
//     socket.on("send-message-ride", async (data: { rideEventId: string; text: string }) => {
//       try {
//         const { rideEventId, text } = data;

//         if (!text || text.trim().length === 0) {
//           socket.emit("error", { message: "Message cannot be empty" });
//           return;
//         }

//         if (text.length > 500) {
//           socket.emit("error", { message: "Message too long (max 500 chars)" });
//           return;
//         }

//         // Verify user is participant
//         const ride = await RideEvent.findById(rideEventId);
//         if (!ride) {
//           socket.emit("error", { message: "Ride not found" });
//           return;
//         }

//         const isParticipant = ride.participants.some(
//           (p: any) => p.userId.toString() === userId
//         );
//         if (!isParticipant) {
//           socket.emit("error", { message: "Not a participant" });
//           return;
//         }

//         // Get sender info
//         const sender = await User.findById(userId).select("name avatarUrl").lean();

//         // Save to database
//         const message = await ChatMessage.create({
//           rideEventId,
//           roomType: "ride",
//           senderId: userId,
//           text: text.trim(),
//           timestamp: new Date(),
//         });

//         // Broadcast to all in ride
//         io.to(`ride:${rideEventId}`).emit("new-message-ride", {
//           _id: message._id,
//           senderId: userId,
//           senderName: sender?.name,
//           senderAvatar: sender?.avatarUrl,
//           text: message.text,
//           timestamp: new Date(),
//         });

//         logger.debug(`[send-message-ride] Message in ride ${rideEventId}`);
//       } catch (error: any) {
//         logger.error(`[send-message-ride] Error: ${error.message}`);
//         socket.emit("error", { message: error.message });
//       }
//     });

//     /**
//      * Stream GPS location during ride
//      */
//     socket.on(
//       "location-update",
//       (data: { rideEventId: string; lat: number; lng: number; speed: number }) => {
//         try {
//           const { rideEventId, lat, lng, speed } = data;

//           if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
//             socket.emit("error", { message: "Invalid coordinates" });
//             return;
//           }

//           io.to(`ride:${rideEventId}`).emit("user-location", {
//             userId,
//             lat,
//             lng,
//             speed,
//             timestamp: new Date(),
//           });

//           logger.debug(
//             `[location-update] Location from ${userId} in ride ${rideEventId}`
//           );
//         } catch (error: any) {
//           logger.error(`[location-update] Error: ${error.message}`);
//         }
//       }
//     );

//     /**
//      * SOS emergency alert
//      */
//     socket.on("sos-triggered", async (data: { rideEventId: string; lat: number; lng: number }) => {
//       try {
//         const { rideEventId, lat, lng } = data;

//         const user = await User.findById(userId).select("name avatarUrl").lean();

//         io.to(`ride:${rideEventId}`).emit("sos-alert", {
//           userId,
//           userName: user?.name,
//           userAvatar: user?.avatarUrl,
//           lat,
//           lng,
//           message: `🚨 SOS triggered by ${user?.name}!`,
//           timestamp: new Date(),
//         });

//         logger.warn(`[sos-triggered] SOS from ${userId} in ride ${rideEventId}`);
//       } catch (error: any) {
//         logger.error(`[sos-triggered] Error: ${error.message}`);
//       }
//     });

//     /**
//      * Ride typing indicator
//      */
//     socket.on("typing-ride", (data: { rideEventId: string }) => {
//       try {
//         socket.to(`ride:${data.rideEventId}`).emit("user-typing", { userId });
//         logger.debug(`[typing-ride] ${userId} typing in ride`);
//       } catch (error: any) {
//         logger.error(`[typing-ride] Error: ${error.message}`);
//       }
//     });

//     socket.on("stop-typing-ride", (data: { rideEventId: string }) => {
//       try {
//         socket.to(`ride:${data.rideEventId}`).emit("user-stop-typing", { userId });
//       } catch (error: any) {
//         logger.error(`[stop-typing-ride] Error: ${error.message}`);
//       }
//     });

//     // ==================== GROUPS ====================

//     /**
//      * Join group chat
//      */
//     socket.on("join-group-chat", async (data: { groupId: string }) => {
//       try {
//         const { groupId } = data;

//         // Verify user is member
//         const group = await Group.findById(groupId);
//         if (!group) {
//           socket.emit("error", { message: "Group not found" });
//           return;
//         }

//         const isMember = group.members.some((m: any) => m.userId.toString() === userId);
//         if (!isMember) {
//           socket.emit("error", { message: "Not a group member" });
//           return;
//         }

//         socket.join(`group:${groupId}`);

//         socket.to(`group:${groupId}`).emit("user-joined-group", {
//           userId,
//           message: "User joined the group",
//           timestamp: new Date(),
//         });

//         socket.emit("join-success", {
//           groupId,
//           message: "Successfully joined group chat",
//         });

//         logger.info(`[join-group-chat] User ${userId} joined group ${groupId}`);
//       } catch (error: any) {
//         logger.error(`[join-group-chat] Error: ${error.message}`);
//         socket.emit("error", { message: error.message });
//       }
//     });

//     /**
//      * Leave group chat
//      */
//     socket.on("leave-group-chat", (data: { groupId: string }) => {
//       try {
//         const { groupId } = data;
//         socket.leave(`group:${groupId}`);

//         socket.to(`group:${groupId}`).emit("user-left-group", {
//           userId,
//           message: "User left the group",
//           timestamp: new Date(),
//         });

//         logger.info(`[leave-group-chat] User ${userId} left group ${groupId}`);
//       } catch (error: any) {
//         logger.error(`[leave-group-chat] Error: ${error.message}`);
//       }
//     });

//     /**
//      * Send message in group chat
//      */
//     socket.on("send-message-group", async (data: { groupId: string; text: string }) => {
//       try {
//         const { groupId, text } = data;

//         if (!text || text.trim().length === 0) {
//           socket.emit("error", { message: "Message cannot be empty" });
//           return;
//         }

//         if (text.length > 500) {
//           socket.emit("error", { message: "Message too long (max 500 chars)" });
//           return;
//         }

//         // Verify user is member
//         const group = await Group.findById(groupId);
//         if (!group) {
//           socket.emit("error", { message: "Group not found" });
//           return;
//         }

//         const isMember = group.members.some((m: any) => m.userId.toString() === userId);
//         if (!isMember) {
//           socket.emit("error", { message: "Not a member" });
//           return;
//         }

//         // Get sender info
//         const sender = await User.findById(userId).select("name avatarUrl").lean();

//         // Save to database
//         const message = await ChatMessage.create({
//           groupId,
//           roomType: "group",
//           senderId: userId,
//           text: text.trim(),
//           timestamp: new Date(),
//         });

//         // Broadcast to all in group
//         io.to(`group:${groupId}`).emit("new-message-group", {
//           _id: message._id,
//           senderId: userId,
//           senderName: sender?.name,
//           senderAvatar: sender?.avatarUrl,
//           text: message.text,
//           timestamp: new Date(),
//         });

//         logger.debug(`[send-message-group] Message in group ${groupId}`);
//       } catch (error: any) {
//         logger.error(`[send-message-group] Error: ${error.message}`);
//         socket.emit("error", { message: error.message });
//       }
//     });

//     /**
//      * Group typing indicator
//      */
//     socket.on("typing-group", (data: { groupId: string }) => {
//       try {
//         socket.to(`group:${data.groupId}`).emit("user-typing-group", { userId });
//         logger.debug(`[typing-group] ${userId} typing in group`);
//       } catch (error: any) {
//         logger.error(`[typing-group] Error: ${error.message}`);
//       }
//     });

//     socket.on("stop-typing-group", (data: { groupId: string }) => {
//       try {
//         socket.to(`group:${data.groupId}`).emit("user-stop-typing-group", { userId });
//       } catch (error: any) {
//         logger.error(`[stop-typing-group] Error: ${error.message}`);
//       }
//     });

//     // ==================== PRIVATE CHAT ====================

//     /**
//      * Join private 1:1 chat
//      */
//     socket.on("join-private-chat", (data: { roomId: string }) => {
//       try {
//         const { roomId } = data;
//         socket.join(`private:${roomId}`);

//         socket.emit("join-success", {
//           roomId,
//           message: "Successfully joined private chat",
//         });

//         logger.info(`[join-private-chat] User ${userId} joined room ${roomId}`);
//       } catch (error: any) {
//         logger.error(`[join-private-chat] Error: ${error.message}`);
//         socket.emit("error", { message: error.message });
//       }
//     });

//     /**
//      * Leave private chat
//      */
//     socket.on("leave-private-chat", (data: { roomId: string }) => {
//       try {
//         const { roomId } = data;
//         socket.leave(`private:${roomId}`);
//         logger.info(`[leave-private-chat] User ${userId} left room ${roomId}`);
//       } catch (error: any) {
//         logger.error(`[leave-private-chat] Error: ${error.message}`);
//       }
//     });

//     /**
//      * Send message in private chat
//      */
//     socket.on("send-message-private", async (data: { roomId: string; text: string }) => {
//       try {
//         const { roomId, text } = data;

//         if (!text || text.trim().length === 0) {
//           socket.emit("error", { message: "Message cannot be empty" });
//           return;
//         }

//         if (text.length > 500) {
//           socket.emit("error", { message: "Message too long (max 500 chars)" });
//           return;
//         }

//         // Get sender info
//         const sender = await User.findById(userId).select("name avatarUrl").lean();

//         // Save to database
//         const message = await ChatMessage.create({
//           privateRoomId: roomId,
//           roomType: "private",
//           senderId: userId,
//           text: text.trim(),
//           timestamp: new Date(),
//         });

//         // Broadcast to both users
//         io.to(`private:${roomId}`).emit("new-message-private", {
//           _id: message._id,
//           roomId,
//           senderId: userId,
//           senderName: sender?.name,
//           senderAvatar: sender?.avatarUrl,
//           text: message.text,
//           timestamp: new Date(),
//         });

//         logger.debug(`[send-message-private] Message in room ${roomId}`);
//       } catch (error: any) {
//         logger.error(`[send-message-private] Error: ${error.message}`);
//         socket.emit("error", { message: error.message });
//       }
//     });

//     /**
//      * Private chat typing indicator
//      */
//     socket.on("typing-private", (data: { roomId: string }) => {
//       try {
//         socket.to(`private:${data.roomId}`).emit("user-typing-private", { userId });
//         logger.debug(`[typing-private] ${userId} typing in private chat`);
//       } catch (error: any) {
//         logger.error(`[typing-private] Error: ${error.message}`);
//       }
//     });

//     socket.on("stop-typing-private", (data: { roomId: string }) => {
//       try {
//         socket.to(`private:${data.roomId}`).emit("user-stop-typing-private", { userId });
//       } catch (error: any) {
//         logger.error(`[stop-typing-private] Error: ${error.message}`);
//       }
//     });

//     // ==================== DISCONNECT ====================
//     socket.on("disconnect", (reason: string) => {
//       logger.info(`[Socket] User ${userId} disconnected. Reason: ${reason}`);
//     });

//     socket.on("error", (error: any) => {
//       logger.error(`[Socket Error] User ${userId}: ${error.message}`);
//     });
//   });

//   io.engine.on("connection_error", (err) => {
//     logger.error(`[Socket Engine Error]: ${err.message}`);
//   });

//   logger.info(
//     "✅ Socket.io server initialized with Notifications + Rides + Groups + Private Chat"
//   );
//   return io;
// };

// /**
//  * Send notification to specific user via Socket.io
//  */
// export const sendNotificationToUser = (
//   io: SocketIOServer | null,
//   userId: string,
//   notification: {
//     type: "like" | "comment" | "follow" | "ride" | "event" | "group" | "mentor";
//     message: string;
//     fromUserId?: string;
//     fromUserName?: string;
//     rideEventId?: string;
//     groupId?: string;
//     postId?: string;
//   }
// ) => {
//   if (!io) {
//     logger.warn(`[sendNotificationToUser] Socket.io not available`);
//     return;
//   }

//   io.to(`user:${userId}`).emit("notification", {
//   io.to(`user:${userId}`).emit("notification", {
//     ...notification,
//     timestamp: new Date(),
//     id: `notif_${Date.now()}`,
//     id: `notif_${Date.now()}`,
//   });

//   logger.info(
//     `[sendNotificationToUser] Notification sent to ${userId}: ${notification.message}`
//   );
// };

// /**
//  * Broadcast notification to multiple users
//  */
// export const sendNotificationToUsers = (
//   io: SocketIOServer | null,
//   userIds: string[],
//   notification: {
//     type: "like" | "comment" | "follow" | "ride" | "event" | "group" | "mentor";
//     message: string;
//   }
// ) => {
//   if (!io) {
//     logger.warn(`[sendNotificationToUsers] Socket.io not available`);
//     return;
//   }

//   userIds.forEach((userId) => {
//     sendNotificationToUser(io, userId, notification);
//   });

//   logger.info(
//     `[sendNotificationToUsers] Notifications sent to ${userIds.length} users`
//   );
//   logger.info(
//     `[sendNotificationToUsers] Notifications sent to ${userIds.length} users`
//   );
// };

// export default initializeSocket;
