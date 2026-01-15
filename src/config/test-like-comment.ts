// // import { io, Socket } from 'socket.io-client';
// // import axios from 'axios';

// // // ==================== USER DATA ====================
// // const USER_1 = {
// //   name: 'Tech Stackk',
// //   id: '6954f825c354031d5568929e',
// //   phone: '9082608032',
// //   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTU0ZjgyNWMzNTQwMzFkNTU2ODkyOWUiLCJpYXQiOjE3NjczNDUwNTAsImV4cCI6MTc2Nzk0OTg1MH0.Z-JqfD0KmE6KOxlNSd-42wVc4o7MoA9-RPRhOAtWJ3I'
// // };

// // const USER_2 = {
// //   name: 'Anzal Shaikh',
// //   id: '695389c1f4f14914d809e938',
// //   phone: '7045475587',
// //   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTUzODljMWY0ZjE0OTE0ZDgwOWU5MzgiLCJpYXQiOjE3NjcxNjI0NjIsImV4cCI6MTc2Nzc2NzI2Mn0.b3L0ytWaMS5ZmRJRD3Ha4WvgBVd0rEP8A1OzL1fCkzw'
// // };

// // const API_URL = 'http://localhost:3001';
// // const POST_ID = '695bb55681aa2abc5bd5528b'; // Change this to a real post ID

// // let socket1: Socket;
// // let socket2: Socket;

// // /**
// //  * Connect User 1 (Post Creator)
// //  */
// // function connectUser1(): Promise<void> {
// //   return new Promise((resolve, reject) => {
// //     socket1 = io(API_URL, {
// //       auth: { token: USER_1.token },
// //       transports: ['websocket', 'polling'],
// //       reconnection: true
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

// //     socket1.on('notification', (notif: any) => {
// //       console.log(`\n🔔 [USER 1 RECEIVED NOTIFICATION]`);
// //       console.log(`   Type: ${notif.type}`);
// //       console.log(`   Message: ${notif.message}`);
// //       console.log(`   From: ${notif.fromUserName}`);
// //       console.log(`   Time: ${new Date(notif.timestamp).toLocaleTimeString()}`);
// //     });

// //     socket1.on('error', (error: string) => {
// //       console.error(`❌ [USER 1] Error: ${error}`);
// //     });

// //     socket1.on('connect_error', (error: any) => {
// //       console.error(`❌ [USER 1] Connection Error:`, error.message);
// //     });
// //   });
// // }

// // /**
// //  * Connect User 2 (Other User)
// //  */
// // function connectUser2(): Promise<void> {
// //   return new Promise((resolve, reject) => {
// //     socket2 = io(API_URL, {
// //       auth: { token: USER_2.token },
// //       transports: ['websocket', 'polling'],
// //       reconnection: true
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

// //     socket2.on('notification', (notif: any) => {
// //       console.log(`\n🔔 [USER 2 RECEIVED NOTIFICATION]`);
// //       console.log(`   Type: ${notif.type}`);
// //       console.log(`   Message: ${notif.message}`);
// //       console.log(`   From: ${notif.fromUserName}`);
// //       console.log(`   Time: ${new Date(notif.timestamp).toLocaleTimeString()}`);
// //     });

// //     socket2.on('error', (error: string) => {
// //       console.error(`❌ [USER 2] Error: ${error}`);
// //     });

// //     socket2.on('connect_error', (error: any) => {
// //       console.error(`❌ [USER 2] Connection Error:`, error.message);
// //     });
// //   });
// // }

// // /**
// //  * Test: Create a Post (USER 1)
// //  */
// // async function createPost(): Promise<string> {
// //   console.log('\n═══════════════════════════════════════════════');
// //   console.log('STEP 1: Create a Post');
// //   console.log('═══════════════════════════════════════════════');

// //   try {
// //     const response = await axios.post(
// //       `${API_URL}/api/v1/posts`,
// //       {
// //         caption: 'Just finished an amazing 50km ride! 🚴‍♂️ #cycling #fitness',
// //         media: ['https://via.placeholder.com/400x300']
// //       },
// //       {
// //         headers: { Authorization: `Bearer ${USER_1.token}` }
// //       }
// //     );

// //     const postId = response.data.data._id;
// //     console.log(`✅ Post created by USER 1`);
// //     console.log(`   Post ID: ${postId}`);
// //     console.log(`   Caption: "${response.data.data.caption}"`);
// //     return postId;
// //   } catch (error: any) {
// //     console.error(`❌ Failed to create post:`, error.response?.data?.error || error.message);
// //     throw error;
// //   }
// // }

// // /**
// //  * Test: USER 2 Likes Post
// //  */
// // async function testLikePost(postId: string): Promise<void> {
// //   console.log('\n═══════════════════════════════════════════════');
// //   console.log('TEST 1: Like Notification');
// //   console.log('═══════════════════════════════════════════════');

// //   try {
// //     console.log(`\n📤 [USER 2] Liking post...`);

// //     const response = await axios.post(
// //       `${API_URL}/api/v1/posts/${postId}/like`,
// //       {},
// //       {
// //         headers: { Authorization: `Bearer ${USER_2.token}` }
// //       }
// //     );

// //     console.log(`✅ [USER 2] Post liked successfully`);
// //     console.log(`   Post ID: ${postId}`);
// //     console.log(`   Total Likes: ${response.data.data.likesCount}`);

// //     // Wait for notification
// //     await new Promise(resolve => setTimeout(resolve, 2000));
// //   } catch (error: any) {
// //     console.error(`❌ Failed to like post:`, error.response?.data?.error || error.message);
// //   }
// // }

// // /**
// //  * Test: USER 2 Unlikes Post
// //  */
// // async function testUnlikePost(postId: string): Promise<void> {
// //   console.log('\n═══════════════════════════════════════════════');
// //   console.log('TEST 2: Unlike Post');
// //   console.log('═══════════════════════════════════════════════');

// //   try {
// //     console.log(`\n📤 [USER 2] Unliking post...`);

// //     const response = await axios.post(
// //       `${API_URL}/api/v1/posts/${postId}/unlike`,
// //       {},
// //       {
// //         headers: { Authorization: `Bearer ${USER_2.token}` }
// //       }
// //     );

// //     console.log(`✅ [USER 2] Post unliked successfully`);
// //     console.log(`   Total Likes: ${response.data.data.likesCount}`);

// //     await new Promise(resolve => setTimeout(resolve, 1000));
// //   } catch (error: any) {
// //     console.error(`❌ Failed to unlike post:`, error.response?.data?.error || error.message);
// //   }
// // }

// // /**
// //  * Test: USER 2 Comments on Post
// //  */
// // async function testCommentOnPost(postId: string): Promise<string> {
// //   console.log('\n═══════════════════════════════════════════════');
// //   console.log('TEST 3: Comment Notification');
// //   console.log('═══════════════════════════════════════════════');

// //   try {
// //     console.log(`\n📤 [USER 2] Adding comment...`);

// //     const response = await axios.post(
// //       `${API_URL}/api/v1/posts/${postId}/comments`,
// //       {
// //         text: 'Awesome ride! I want to join you next time! 🔥'
// //       },
// //       {
// //         headers: { Authorization: `Bearer ${USER_2.token}` }
// //       }
// //     );

// //     const commentId = response.data.data._id;
// //     console.log(`✅ [USER 2] Comment posted successfully`);
// //     console.log(`   Comment ID: ${commentId}`);
// //     console.log(`   Comment: "${response.data.data.text}"`);

// //     // Wait for notification
// //     await new Promise(resolve => setTimeout(resolve, 2000));
// //     return commentId;
// //   } catch (error: any) {
// //     console.error(`❌ Failed to comment:`, error.response?.data?.error || error.message);
// //     throw error;
// //   }
// // }

// // /**
// //  * Test: USER 1 Replies to Comment
// //  */
// // async function testReplyToComment(postId: string, commentId: string): Promise<void> {
// //   console.log('\n═══════════════════════════════════════════════');
// //   console.log('TEST 4: Comment Reply Notification');
// //   console.log('═══════════════════════════════════════════════');

// //   try {
// //     console.log(`\n📤 [USER 1] Replying to comment...`);

// //     const response = await axios.post(
// //       `${API_URL}/api/v1/posts/${postId}/comments/${commentId}/reply`,
// //       {
// //         text: 'Thanks! Next ride is on Saturday at 6 AM. See you there! 🚴'
// //       },
// //       {
// //         headers: { Authorization: `Bearer ${USER_1.token}` }
// //       }
// //     );

// //     console.log(`✅ [USER 1] Reply posted successfully`);
// //     console.log(`   Reply: "${response.data.data.text}"`);

// //     await new Promise(resolve => setTimeout(resolve, 2000));
// //   } catch (error: any) {
// //     console.error(`❌ Failed to reply:`, error.response?.data?.error || error.message);
// //   }
// // }

// // /**
// //  * Test: USER 1 Likes a Comment
// //  */
// // async function testLikeComment(postId: string, commentId: string): Promise<void> {
// //   console.log('\n═══════════════════════════════════════════════');
// //   console.log('TEST 5: Comment Like Notification');
// //   console.log('═══════════════════════════════════════════════');

// //   try {
// //     console.log(`\n📤 [USER 1] Liking comment...`);

// //     const response = await axios.post(
// //       `${API_URL}/api/v1/posts/${postId}/comments/${commentId}/like`,
// //       {},
// //       {
// //         headers: { Authorization: `Bearer ${USER_1.token}` }
// //       }
// //     );

// //     console.log(`✅ [USER 1] Comment liked successfully`);
// //     console.log(`   Comment Likes: ${response.data.data.likesCount}`);

// //     await new Promise(resolve => setTimeout(resolve, 2000));
// //   } catch (error: any) {
// //     console.error(`❌ Failed to like comment:`, error.response?.data?.error || error.message);
// //   }
// // }

// // /**
// //  * Main Test Runner
// //  */
// // async function runAllTests(): Promise<void> {
// //   console.log('\n\n');
// //   console.log('╔════════════════════════════════════════════════════════════╗');
// //   console.log('║        LIKE & COMMENT NOTIFICATIONS TEST                  ║');
// //   console.log('║        User 1: Post Creator | User 2: Commenter           ║');
// //   console.log('╚════════════════════════════════════════════════════════════╝');

// //   console.log('\n📡 Connecting users...');
// //   await connectUser1();
// //   await connectUser2();

// //   try {
// //     // Create post
// //     const postId = await createPost();

// //     // Run all notification tests
// //     await testLikePost(postId);
// //     await testUnlikePost(postId);
// //     await testLikePost(postId); // Like again
// //     const commentId = await testCommentOnPost(postId);
// //     await testReplyToComment(postId, commentId);
// //     await testLikeComment(postId, commentId);

// //     console.log('\n\n╔════════════════════════════════════════════════════════════╗');
// //     console.log('║                   ALL TESTS COMPLETED                      ║');
// //     console.log('╚════════════════════════════════════════════════════════════╝\n');
// //   } catch (error: any) {
// //     console.error('❌ Test failed:', error.message);
// //   }

// //   // Cleanup
// //   setTimeout(() => {
// //     socket1?.disconnect();
// //     socket2?.disconnect();
// //     process.exit(0);
// //   }, 3000);
// // }

// // // Run tests
// // runAllTests().catch(err => {
// //   console.error('❌ Fatal error:', err);
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
// import axios from 'axios';
// import FormData from 'form-data';
// import fs from 'fs';

// // ==================== USER DATA ====================
// const USER_1 = {
//   name: 'Tech Stackk',
//   id: '6954f825c354031d5568929e',
//   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTU0ZjgyNWMzNTQwMzFkNTU2ODkyOWUiLCJpYXQiOjE3NjczNDUwNTAsImV4cCI6MTc2Nzk0OTg1MH0.Z-JqfD0KmE6KOxlNSd-42wVc4o7MoA9-RPRhOAtWJ3I'
// };

// const USER_2 = {
//   name: 'Anzal Shaikh',
//   id: '695389c1f4f14914d809e938',
//   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTUzODljMWY0ZjE0OTE0ZDgwOWU5MzgiLCJpYXQiOjE3NjcxNjI0NjIsImV4cCI6MTc2Nzc2NzI2Mn0.b3L0ytWaMS5ZmRJRD3Ha4WvgBVd0rEP8A1OzL1fCkzw'
// };

// const API_URL = 'http://localhost:3001';
// let socket1: Socket;
// let socket2: Socket;

// /**
//  * Connect User 1 (Post Creator)
//  */
// function connectUser1(): Promise<void> {
//   return new Promise((resolve, reject) => {
//     socket1 = io(API_URL, {
//       auth: { token: USER_1.token },
//       transports: ['websocket', 'polling'],
//       reconnection: true
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

//     socket1.on('notification', (notif: any) => {
//       console.log(`\n🔔 [USER 1 RECEIVED NOTIFICATION]`);
//       console.log(`   Type: ${notif.type}`);
//       console.log(`   Message: ${notif.message}`);
//       console.log(`   From: ${notif.fromUserName || 'Unknown'}`);
//       console.log(`   Time: ${new Date(notif.timestamp).toLocaleTimeString()}`);
//     });

//     socket1.on('error', (error: string) => {
//       console.error(`❌ [USER 1] Error: ${error}`);
//     });

//     socket1.on('connect_error', (error: any) => {
//       console.error(`❌ [USER 1] Connection Error:`, error.message);
//     });
//   });
// }

// /**
//  * Connect User 2 (Other User)
//  */
// function connectUser2(): Promise<void> {
//   return new Promise((resolve, reject) => {
//     socket2 = io(API_URL, {
//       auth: { token: USER_2.token },
//       transports: ['websocket', 'polling'],
//       reconnection: true
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

//     socket2.on('notification', (notif: any) => {
//       console.log(`\n🔔 [USER 2 RECEIVED NOTIFICATION]`);
//       console.log(`   Type: ${notif.type}`);
//       console.log(`   Message: ${notif.message}`);
//       console.log(`   From: ${notif.fromUserName || 'Unknown'}`);
//       console.log(`   Time: ${new Date(notif.timestamp).toLocaleTimeString()}`);
//     });

//     socket2.on('error', (error: string) => {
//       console.error(`❌ [USER 2] Error: ${error}`);
//     });

//     socket2.on('connect_error', (error: any) => {
//       console.error(`❌ [USER 2] Connection Error:`, error.message);
//     });
//   });
// }

// /**
//  * Test: Create a Post (USER 1)
//  * Uses MULTIPART FORM DATA (not JSON)
//  */
// async function createPost(): Promise<string> {
//   console.log('\n═══════════════════════════════════════════════');
//   console.log('STEP 1: Create a Post');
//   console.log('═══════════════════════════════════════════════');

//   try {
//     const formData = new FormData();
//     formData.append('caption', 'Just finished an amazing 50km ride! 🚴‍♂️ #cycling #fitness');
//     formData.append('privacy', 'public');

//     const response = await axios.post(
//       `${API_URL}/api/v1/posts`,
//       formData,
//       {
//         headers: {
//           ...formData.getHeaders(),
//           Authorization: `Bearer ${USER_1.token}`
//         }
//       }
//     );

//     const postId = response.data.data._id;
//     console.log(`✅ Post created by USER 1`);
//     console.log(`   Post ID: ${postId}`);
//     console.log(`   Caption: "${response.data.data.caption}"`);
//     return postId;
//   } catch (error: any) {
//     console.error(`❌ Failed to create post:`, error.response?.data?.error || error.message);
//     throw error;
//   }
// }

// /**
//  * Test: USER 2 Likes Post
//  * POST /api/v1/posts/:id/like
//  */
// async function testLikePost(postId: string): Promise<void> {
//   console.log('\n═══════════════════════════════════════════════');
//   console.log('TEST 1: Like Post Notification');
//   console.log('═══════════════════════════════════════════════');

//   try {
//     console.log(`\n📤 [USER 2] Liking post...`);

//     const response = await axios.post(
//       `${API_URL}/api/v1/posts/${postId}/like`,
//       {},
//       {
//         headers: { Authorization: `Bearer ${USER_2.token}` }
//       }
//     );

//     console.log(`✅ [USER 2] Post liked successfully`);
//     console.log(`   Liked: ${response.data.data.liked}`);
//     console.log(`   Total Likes: ${response.data.data.likeCount}`);

//     // Wait for notification via Socket.io
//     await new Promise(resolve => setTimeout(resolve, 2000));
//   } catch (error: any) {
//     console.error(`❌ Failed to like post:`, error.response?.data?.error || error.message);
//   }
// }

// /**
//  * Test: USER 2 Unlikes Post
//  * POST /api/v1/posts/:id/like (toggle)
//  */
// async function testUnlikePost(postId: string): Promise<void> {
//   console.log('\n═══════════════════════════════════════════════');
//   console.log('TEST 2: Unlike Post');
//   console.log('═══════════════════════════════════════════════');

//   try {
//     console.log(`\n📤 [USER 2] Unliking post...`);

//     const response = await axios.post(
//       `${API_URL}/api/v1/posts/${postId}/like`,
//       {},
//       {
//         headers: { Authorization: `Bearer ${USER_2.token}` }
//       }
//     );

//     console.log(`✅ [USER 2] Post unliked successfully`);
//     console.log(`   Liked: ${response.data.data.liked}`);
//     console.log(`   Total Likes: ${response.data.data.likeCount}`);

//     await new Promise(resolve => setTimeout(resolve, 1000));
//   } catch (error: any) {
//     console.error(`❌ Failed to unlike post:`, error.response?.data?.error || error.message);
//   }
// }

// /**
//  * Test: USER 2 Comments on Post
//  * POST /api/v1/posts/:id/comment
//  */
// async function testCommentOnPost(postId: string): Promise<string> {
//   console.log('\n═══════════════════════════════════════════════');
//   console.log('TEST 3: Comment Post Notification');
//   console.log('═══════════════════════════════════════════════');

//   try {
//     console.log(`\n📤 [USER 2] Adding comment...`);

//     const response = await axios.post(
//       `${API_URL}/api/v1/posts/${postId}/comment`,
//       {
//         text: 'Awesome ride! I want to join you next time! 🔥'
//       },
//       {
//         headers: { Authorization: `Bearer ${USER_2.token}` }
//       }
//     );

//     const commentId = response.data.data._id;
//     console.log(`✅ [USER 2] Comment posted successfully`);
//     console.log(`   Comment ID: ${commentId}`);
//     console.log(`   Comment: "${response.data.data.text}"`);

//     // Wait for notification via Socket.io
//     await new Promise(resolve => setTimeout(resolve, 2000));
//     return commentId;
//   } catch (error: any) {
//     console.error(`❌ Failed to comment:`, error.response?.data?.error || error.message);
//     throw error;
//   }
// }

// /**
//  * Test: USER 1 Likes the Comment
//  * Note: Your API doesn't have comment like endpoint yet
//  * This would need to be added to your controller
//  */
// async function testLikeComment(postId: string, commentId: string): Promise<void> {
//   console.log('\n═══════════════════════════════════════════════');
//   console.log('TEST 4: Like Comment (Coming Soon)');
//   console.log('═══════════════════════════════════════════════');
//   console.log('⚠️  Comment like endpoint not yet implemented in your API');
//   console.log('   You need to add: POST /api/v1/posts/:postId/comments/:commentId/like');
// }

// /**
//  * Main Test Runner
//  */
// async function runAllTests(): Promise<void> {
//   console.log('\n\n');
//   console.log('╔════════════════════════════════════════════════════════════╗');
//   console.log('║        LIKE & COMMENT NOTIFICATIONS TEST                  ║');
//   console.log('║        User 1: Post Creator | User 2: Commenter           ║');
//   console.log('╚════════════════════════════════════════════════════════════╝');

//   console.log('\n📡 Connecting users via Socket.io...');
//   await connectUser1();
//   await connectUser2();

//   try {
//     // Create post
//     const postId = await createPost();

//     // Run all notification tests
//     await testLikePost(postId);
//     await testUnlikePost(postId);
//     await testLikePost(postId); // Like again
//     const commentId = await testCommentOnPost(postId);
//     await testLikeComment(postId, commentId);

//     console.log('\n\n╔════════════════════════════════════════════════════════════╗');
//     console.log('║                   ALL TESTS COMPLETED                      ║');
//     console.log('╚════════════════════════════════════════════════════════════╝\n');
//   } catch (error: any) {
//     console.error('❌ Test failed:', error.message);
//   }

//   // Cleanup
//   setTimeout(() => {
//     socket1?.disconnect();
//     socket2?.disconnect();
//     process.exit(0);
//   }, 3000);
// }

// // Run tests
// runAllTests().catch(err => {
//   console.error('❌ Fatal error:', err);
//   process.exit(1);
// });

// // Graceful shutdown
// process.on('SIGINT', () => {
//   console.log('\n\n👋 Closing sockets...');
//   socket1?.disconnect();
//   socket2?.disconnect();
//   process.exit(0);
// });
