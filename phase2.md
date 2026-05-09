�
� PROJECT XXX — FINAL BACKEND
DEVELOPMENT DOC
🧠 System-Wide AI Assistant (Phase 1 + Phase 2)
🎯 PRODUCT OVERVIEW
A real-time AI assistant that allows users to:
Speak 
→
 Convert to text
Generate / rewrite / edit content
Execute commands across apps
Work system-wide via desktop integration
🧩 COMPLETE FEATURE SET
🟢 PHASE 1 FEATURES (BASE)
Authentication
Signup / Login / Logout
JWT  Refresh Token
Session restore (
/auth/me 
)
Onboarding
First-time setup
Save user preferences
Voice Processing
Untitled
Upload audio 
→
 Transcription
1
Language detection
AI Features
Rewrite (formal / casual)
Grammar correction
Transcript System
Save transcript
View history
Search + pagination
Delete transcript
🟢 PHASE 2 FEATURES (ADVANCED)
Real-Time Voice (WebSocket)
Live audio streaming
Partial + final transcript
Command Engine (CORE)
Natural language 
→
 structured execution
Multi-step processing
Example:
👉 “Write email and make it formal and short”
Intent Detection
navigation
generation
edit
typing
workflow
Untitled
2
AI Processing
Generate text
Rewrite
Summarize
Improve tone
Execution Layer
Insert text
Copy text
Open apps/websites
Show UI suggestions
Context Memory
Understand “make it shorter”
Uses previous output
Session System
Track active desktop session
Store context per session
Command History
Save all commands
Useful for analytics
Analytics
Feature usage tracking
🗄 DATABASE DESIGN (FINAL)
Untitled
3
✅
✅ EXISTING MODELS
User
model User {
id                  
email               
passwordHash        
name                
String   @id @default(uuid())
String   @unique
String
String?
onboardingCompleted Boolean  @default(false)
preferences         
Json?
role                
createdAt           
updatedAt           
UserRole @default(rider)
DateTime @default(now())
DateTime @updatedAt
transcripts Transcript[]
}
Transcript
model Transcript {
id            
userId        
rawText       
String   @id @default(uuid())
String
String
processedText String?
action        
String
language      
createdAt     
}
String?
DateTime @default(now())
CommandHistory
model CommandHistory {
id        
userId    
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
🆕 NEW MODELS (PHASE 2)
String   @id @default(uuid())
String
command   String
intent    
String
steps     
result    
Json
String?
createdAt DateTime @default(now())
Untitled
4
user User @relation(fields: [userId], references: [id])
}
Session
model Session {
id        
userId    
String   @id @default(uuid())
String
isActive  Boolean  @default(true)
context   Json?
device    
String?
createdAt DateTime @default(now())
user User @relation(fields: [userId], references: [id])
}
AppUsage
model AppUsage {
id        
String   @id @default(uuid())
userId    
action    
String
String
metadata  Json?
createdAt DateTime @default(now())
user User @relation(fields: [userId], references: [id])
}
🔌 COMPLETE API ENDPOINTS
🔐 AUTH
Untitled
POST 
/auth/signup
POST 
/auth/login
POST 
/auth/refresh
GET 
/auth/me
POST 
/auth/logout
5
👤
�
� USER
/user/onboarding-complete
POST 
�
� VOICE (PHASE 1)
POST 
/voice/transcribe
POST 
/voice/rewrite
POST 
/voice/grammar
📜 TRANSCRIPTS
POST 
/transcripts
GET 
/transcripts
/transcripts/:id
GET 
DELETE 
/transcripts/:id
🧠 COMMAND SYSTEM (PHASE 2)
POST 
/commands/execute
{
}
"command": "write apology message and make it emotional"
Response:
{
}
"intent": "generation",
"steps": ["generate", "rewrite_emotional"],
"result": "final output"
GET 
Untitled
/commands/history
6
🖥
�
� SESSION
POST 
/session/start
POST 
/session/end
⚡ WEBSOCKET SYSTEM
Client 
→
 Server
voice:start
voice:chunk
voice:end
command:execute
Server 
→
 Client
transcript:partial
transcript:final
ai:response
action:execute
🧠 CORE BACKEND SERVICES
VoiceService
Audio streaming
Buffering
Transcription
CommandService (CORE)
Untitled
Detect intent
7
Generate steps
AIService
OpenAI integration
Generate / rewrite / summarize
ExecutionService
Action Types:
INSERT_TEXT
{ "type": "INSERT_TEXT", "data": "text" }
OPEN_APP
{ "type": "OPEN_APP", "data": "url" }
COPY_TEXT
{ "type": "COPY_TEXT" }
SessionService
Manage active session
Store context
TranscriptService
Save + fetch data
🧠 CONTEXT MEMORY SYSTEM
Untitled
8
Stored in Session:
{
  "last_output": "generated text"
}
Used for:
👉 “make it shorter”
👉 “rewrite this”
🔄 COMPLETE USER FLOW
FLOW 1 — Normal AI Writing
User presses Ctrl + Space
Speaks command
Voice 
→
 transcript
Command parsed
AI generates output
Backend sends INSERT_TEXT
Text inserted in app
FLOW 2 — Edit Existing Text
User selects text
Says “make it formal”
Backend processes
Sends updated text
FLOW 3 — Navigation
User says “open Gmail”
Backend detects navigation
Untitled 9
Sends 
OPEN_APP
Client opens browser
FLOW 4 — Multi-Step AI
User:
👉 “Write email and make it short and formal”
Backend:
generate
rewrite_short
rewrite_formal
FLOW 5 — Context-Based Command
User:
👉 “Make it shorter”
Backend:
👉 Uses last_output
FLOW 6 — Undo
User:
👉 “Undo”
Backend:
👉 Returns previous output
📊 ANALYTICS FLOW
Track:
command usage
session duration
Untitled
10
feature usage
⚠ LIMITATIONS (IMPORTANT)
System WILL NOT
❌ Auto-send messages
❌ Select contacts
❌ Fully control apps
❌ 100% accuracy
🚀 FINAL BUILD FLOW
Setup DB  Auth
Build Phase 1 APIs
Add Command Engine
Add AI Service
Add WebSocket
Add Session system
Add Execution layer
Add context memory
💬 FINAL STATEMENT
This backend system enables a scalable, real-time AI assistant capable of
understanding natural language, executing structured workflows, and assisting
users across applications while maintaining clear technical boundaries.
🚀 PROJECT XXX — FINAL BACKEND
DEVELOPMENT DOC
🧠 System-Wide AI Assistant (Phase 1 + Phase 2)
Untitled
11
�
� PRODUCT OVERVIEW
A real-time AI assistant that allows users to:
Speak 
→
 Convert to text
Generate / rewrite / edit content
Execute commands across apps
Work system-wide via desktop integration
🧩 COMPLETE FEATURE SET
🟢 PHASE 1 FEATURES (BASE)
Authentication
Signup / Login / Logout
JWT  Refresh Token
Session restore (
/auth/me 
)
Onboarding
First-time setup
Save user preferences
Voice Processing
Upload audio 
→
 Transcription
Language detection
AI Features
Rewrite (formal / casual)
Grammar correction
Untitled
12
Transcript System
Save transcript
View history
Search + pagination
Delete transcript
🟢 PHASE 2 FEATURES (ADVANCED)
Real-Time Voice (WebSocket)
Live audio streaming
Partial + final transcript
Command Engine (CORE)
Natural language 
→
 structured execution
Multi-step processing
Example:
👉 “Write email and make it formal and short”
Intent Detection
navigation
generation
edit
typing
workflow
AI Processing
Generate text
Rewrite
Summarize
Untitled
13
Improve tone
Execution Layer
Insert text
Copy text
Open apps/websites
Show UI suggestions
Context Memory
Understand “make it shorter”
Uses previous output
Session System
Track active desktop session
Store context per session
Command History
Save all commands
Useful for analytics
Analytics
Feature usage tracking
🗄 DATABASE DESIGN (FINAL)
✅ EXISTING MODELS
User
model User {
id                  
email               
passwordHash        
name                
String   @id @default(uuid())
String   @unique
String
Untitled
14
String?
onboardingCompleted Boolean  @default(false)
preferences         
Json?
role                
createdAt           
updatedAt           
UserRole @default(rider)
DateTime @default(now())
DateTime @updatedAt
transcripts Transcript[]
}
Transcript
model Transcript {
id            
userId        
rawText       
String   @id @default(uuid())
String
String
processedText String?
action        
String
language      
createdAt     
String?
DateTime @default(now())
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
🆕 NEW MODELS (PHASE 2)
CommandHistory
model CommandHistory {
id        
String   @id @default(uuid())
userId    
String
command   String
intent    
String
steps     
result    
Json
String?
createdAt DateTime @default(now())
user User @relation(fields: [userId], references: [id])
}
Session
model Session {
id        
Untitled
String   @id @default(uuid())
15
userId    
String
isActive  Boolean  @default(true)
context   Json?
device    
String?
createdAt DateTime @default(now())
user User @relation(fields: [userId], references: [id])
}
AppUsage
model AppUsage {
id        
String   @id @default(uuid())
userId    
action    
String
String
metadata  Json?
createdAt DateTime @default(now())
user User @relation(fields: [userId], references: [id])
}
🔌 COMPLETE API ENDPOINTS
🔐 AUTH
POST 
/auth/signup
POST 
/auth/login
POST 
/auth/refresh
GET 
/auth/me
POST 
/auth/logout
👤 USER
/user/onboarding-complete
POST 
�
� VOICE (PHASE 1)
Untitled
POST 
/voice/transcribe
16
POST 
/voice/rewrite
POST 
/voice/grammar
📜 TRANSCRIPTS
POST 
/transcripts
GET 
/transcripts
/transcripts/:id
GET 
DELETE 
/transcripts/:id
🧠 COMMAND SYSTEM (PHASE 2)
POST 
/commands/execute
{
}
"command": "write apology message and make it emotional"
Response:
{
}
"intent": "generation",
"steps": ["generate", "rewrite_emotional"],
"result": "final output"
GET 
/commands/history
🖥 SESSION
POST 
/session/start
POST 
/session/end
Untitled
17
⚡ WEBSOCKET SYSTEM
Client 
→
 Server
voice:start
voice:chunk
voice:end
command:execute
Server 
→
 Client
transcript:partial
transcript:final
ai:response
action:execute
🧠 CORE BACKEND SERVICES
VoiceService
Audio streaming
Buffering
Transcription
CommandService (CORE)
Detect intent
Generate steps
AIService
Untitled
OpenAI integration
18
Generate / rewrite / summarize
ExecutionService
Action Types:
INSERT_TEXT
{ "type": "INSERT_TEXT", "data": "text" }
OPEN_APP
{ "type": "OPEN_APP", "data": "url" }
COPY_TEXT
{ "type": "COPY_TEXT" }
SessionService
Manage active session
Store context
TranscriptService
Save + fetch data
🧠 CONTEXT MEMORY SYSTEM
Stored in Session:
{
}
"last_output": "generated text"
Used for:
Untitled
19
👉 “make it shorter”
👉 “rewrite this”
🔄 COMPLETE USER FLOW
FLOW 1 — Normal AI Writing
User presses Ctrl + Space
Speaks command
Voice 
→
 transcript
Command parsed
AI generates output
Backend sends INSERT_TEXT
Text inserted in app
FLOW 2 — Edit Existing Text
User selects text
Says “make it formal”
Backend processes
Sends updated text
FLOW 3 — Navigation
User says “open Gmail”
Backend detects navigation
Sends OPEN_APP
Client opens browser
FLOW 4 — Multi-Step AI
User:
Untitled 20
�
� “Write email and make it short and formal”
Backend:
generate
rewrite_short
rewrite_formal
FLOW 5 — Context-Based Command
User:
👉 “Make it shorter”
Backend:
👉 Uses last_output
FLOW 6 — Undo
User:
👉 “Undo”
Backend:
👉 Returns previous output
📊 ANALYTICS FLOW
Track:
command usage
session duration
feature usage
⚠ LIMITATIONS (IMPORTANT)
System WILL NOT
❌ Auto-send messages
Untitled
21
❌ Select contacts
❌ Fully control apps
❌ 100% accuracy
🚀 FINAL BUILD FLOW
Setup DB  Auth
Build Phase 1 APIs
Add Command Engine
Add AI Service
Add WebSocket
Add Session system
Add Execution layer
Add context memory
💬 FINAL STATEMENT
This backend system enables a scalable, real-time AI assistant capable of
understanding natural language, executing structured workflows, and assisting
users across applications while maintaining clear technical boundaries.
Untitled
22