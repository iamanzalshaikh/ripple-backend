// import { io, Socket } from 'socket.io-client';
// import axios from 'axios';

// // ==================== TEST USERS ====================
// const USER_1 = {
//   name: 'Tech Stackk',
//   id: '6954f825c354031d5568929e',
//   phone: '9082608032',
//   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTU0ZjgyNWMzNTQwMzFkNTU2ODkyOWUiLCJpYXQiOjE3NjczNDUwNTAsImV4cCI6MTc2Nzk0OTg1MH0.Z-JqfD0KmE6KOxlNSd-42wVc4o7MoA9-RPRhOAtWJ3I'
// };

// const USER_2 = {
//   name: 'Anzal Shaikh',
//   id: '695389c1f4f14914d809e938',
//   phone: '7045475587',
//   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTUzODljMWY0ZjE0OTE0ZDgwOWU5MzgiLCJpYXQiOjE3NjcxNjI0NjIsImV4cCI6MTc2Nzc2NzI2Mn0.b3L0ytWaMS5ZmRJRD3Ha4WvgBVd0rEP8A1OzL1fCkzw'
// };

// const API_URL = 'http://localhost:3001';

// let socket1: Socket;
// let socket2: Socket;
// let notificationCount = {
//   user1: 0,
//   user2: 0
// };

// // ==================== SOCKET CONNECTION ====================

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
//       console.error(`❌ [USER 1] Connection Error:`, error.message);
//     });
//   });
// }

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
//       console.error(`❌ [USER 2] Connection Error:`, error.message);
//     });
//   });
// }

// // ==================== NOTIFICATION LISTENERS ====================

// function setupNotificationListeners(): void {
//   console.log('\n📡 Setting up notification listeners...\n');

//   // User 1 notification listener
//   socket1.on('notification', (notification: any) => {
//     notificationCount.user1++;
//     console.log(`\n🔔 [USER 1 RECEIVED NOTIFICATION #${notificationCount.user1}]`);
//     console.log(`   Type: ${notification.type}`);
//     console.log(`   Message: "${notification.message}"`);
//     console.log(`   From: ${notification.fromUserName || 'System'}`);
//     console.log(`   Post ID: ${notification.postId || 'N/A'}`);
//     console.log(`   Comment ID: ${notification.commentId || 'N/A'}`);
//     console.log(`   Timestamp: ${new Date(notification.timestamp).toLocaleTimeString()}`);
//     console.log(`   Read: ${notification.read}`);
//   });

//   // User 2 notification listener
//   socket2.on('notification', (notification: any) => {
//     notificationCount.user2++;
//     console.log(`\n🔔 [USER 2 RECEIVED NOTIFICATION #${notificationCount.user2}]`);
//     console.log(`   Type: ${notification.type}`);
//     console.log(`   Message: "${notification.message}"`);
//     console.log(`   From: ${notification.fromUserName || 'System'}`);
//     console.log(`   Post ID: ${notification.postId || 'N/A'}`);
//     console.log(`   Comment ID: ${notification.commentId || 'N/A'}`);
//     console.log(`   Timestamp: ${new Date(notification.timestamp).toLocaleTimeString()}`);
//     console.log(`   Read: ${notification.read}`);
//   });

//   console.log('✅ Notification listeners ready!\n');
// }

// // ==================== TEST FUNCTIONS ====================

// async function testGeneralNotification(): Promise<void> {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 1: General User Notification');
//   console.log('═══════════════════════════════════════════════\n');

//   try {
//     console.log('📤 [USER 1] Sending test notification to self...');

//     const response = await axios.post(
//       `${API_URL}/api/v1/notifications/test`,
//       { message: '🧪 Test notification - Real-time system check!' },
//       {
//         headers: {
//           'Authorization': `Bearer ${USER_1.token}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );

//     console.log('✅ Test notification API response:', response.data.message);

//     // Wait for notification to be received
//     await new Promise(resolve => setTimeout(resolve, 2000));
//   } catch (error: any) {
//     console.error('❌ Test notification failed:', error.response?.data || error.message);
//   }
// }

// async function testLikeNotification(): Promise<void> {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 2: Like Notification');
//   console.log('═══════════════════════════════════════════════\n');

//   try {
//     // First, get a post from User 1 (or create one if needed)
//     console.log('📋 Fetching User 1\'s posts...');

//     const feedResponse = await axios.get(
//       `${API_URL}/api/v1/posts/feed?limit=5`,
//       {
//         headers: {
//           'Authorization': `Bearer ${USER_1.token}`
//         }
//       }
//     );

//     const posts = feedResponse.data.data;

//     if (posts.length === 0) {
//       console.log('⚠️ No posts found. Please create a post first to test like notifications.');
//       return;
//     }

//     const targetPost = posts[0];
//     console.log(`📌 Target post: ${targetPost._id}`);
//     console.log(`   Caption: "${targetPost.caption || 'No caption'}"`);
//     console.log(`   Owner: ${targetPost.userId.name}`);

//     // User 2 likes User 1's post
//     console.log(`\n👍 [USER 2] Liking post ${targetPost._id}...`);

//     const likeResponse = await axios.post(
//       `${API_URL}/api/v1/posts/${targetPost._id}/like`,
//       {},
//       {
//         headers: {
//           'Authorization': `Bearer ${USER_2.token}`
//         }
//       }
//     );

//     console.log('✅ Like response:', likeResponse.data.data);
//     console.log('⏳ Waiting for real-time notification...');

//     // Wait for notification to be received
//     await new Promise(resolve => setTimeout(resolve, 3000));
//   } catch (error: any) {
//     console.error('❌ Like notification test failed:', error.response?.data || error.message);
//   }
// }

// async function testCommentNotification(): Promise<void> {
//   console.log('\n\n═══════════════════════════════════════════════');
//   console.log('TEST 3: Comment Notification');
//   console.log('═══════════════════════════════════════════════\n');

//   try {
//     // Get a post from User 1
//     console.log('📋 Fetching User 1\'s posts...');

//     const feedResponse = await axios.get(
//       `${API_URL}/api/v1/posts/feed?limit=5`,
//       {
//         headers: {
//           'Authorization': `Bearer ${USER_1.token}`
//         }
//       }
//     );

//     const posts = feedResponse.data.data;

//     if (posts.length === 0) {
//       console.log('⚠️ No posts found. Please create a post first to test comment notifications.');
//       return;
//     }

//     const targetPost = posts[0];
//     console.log(`📌 Target post: ${targetPost._id}`);
//     console.log(`   Caption: "${targetPost.caption || 'No caption'}"`);
//     console.log(`   Owner: ${targetPost.userId.name}`);

//     // User 2 comments on User 1's post
//     const commentText = '🎉 Great post! This is a test comment for real-time notifications!';
//     console.log(`\n💬 [USER 2] Commenting on post ${targetPost._id}...`);
//     console.log(`   Comment: "${commentText}"`);

//     const commentResponse = await axios.post(
//       `${API_URL}/api/v1/posts/${targetPost._id}/comment`,
//       { text: commentText },
//       {
//         headers: {
//           'Authorization': `Bearer ${USER_2.token}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );

//     console.log('✅ Comment response:', commentResponse.data.success);
//     console.log('⏳ Waiting for real-time notification...');

//     // Wait for notification to be received
//     await new Promise(resolve => setTimeout(resolve, 3000));
//   } catch (error: any) {
//     console.error('❌ Comment notification test failed:', error.response?.data || error.message);
//   }
// }

// // ==================== MAIN TEST RUNNER ====================

// async function runAllTests(): Promise<void> {
//   console.log('\n\n');
//   console.log('╔═══════════════════════════════════════════════════════════╗');
//   console.log('║     REAL-TIME NOTIFICATION SYSTEM TEST                   ║');
//   console.log('║     Testing: Likes, Comments, User Notifications         ║');
//   console.log('╚═══════════════════════════════════════════════════════════╝');

//   try {
//     // Connect both users
//     console.log('\n📡 Connecting users...');
//     await connectUser1();
//     await connectUser2();

//     // Setup notification listeners
//     setupNotificationListeners();

//     // Wait a bit for connections to stabilize
//     await new Promise(resolve => setTimeout(resolve, 1000));

//     // Run tests sequentially
//     await testGeneralNotification();
//     await new Promise(resolve => setTimeout(resolve, 2000));

//     await testLikeNotification();
//     await new Promise(resolve => setTimeout(resolve, 2000));

//     await testCommentNotification();
//     await new Promise(resolve => setTimeout(resolve, 2000));

//     // Summary
//     console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
//     console.log('║                    TEST SUMMARY                          ║');
//     console.log('╚═══════════════════════════════════════════════════════════╝\n');
//     console.log(`📊 Notification Statistics:`);
//     console.log(`   USER 1 received: ${notificationCount.user1} notifications`);
//     console.log(`   USER 2 received: ${notificationCount.user2} notifications`);
//     console.log(`\n✅ All tests completed!`);
//     console.log(`\n💡 Expected results:`);
//     console.log(`   - USER 1 should receive: 1 test notification + 1 like + 1 comment = 3 total`);
//     console.log(`   - USER 2 should receive: 0 notifications (they are the sender)`);
//     console.log(`\n🔍 If notifications are missing, check:`);
//     console.log(`   1. Socket.IO server is initialized (check server logs)`);
//     console.log(`   2. BullMQ worker is processing jobs (check worker logs)`);
//     console.log(`   3. Redis is connected and working`);
//     console.log(`   4. Users are in the correct Socket.IO rooms (user:userId)`);

//   } catch (error: any) {
//     console.error('\n❌ Test failed:', error.message);
//   } finally {
//     // Cleanup
//     setTimeout(() => {
//       console.log('\n\n👋 Closing sockets...');
//       socket1?.disconnect();
//       socket2?.disconnect();
//       process.exit(0);
//     }, 3000);
//   }
// }

// // Run tests
// runAllTests().catch(err => {
//   console.error('❌ Test runner failed:', err);
//   process.exit(1);
// });

// // Graceful shutdown
// process.on('SIGINT', () => {
//   console.log('\n\n👋 Closing sockets...');
//   socket1?.disconnect();
//   socket2?.disconnect();
//   process.exit(0);
// });
