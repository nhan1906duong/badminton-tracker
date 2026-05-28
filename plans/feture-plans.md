High Value
1. Donation Tracker / Settlement
Players who lose donate 5000 VND — but there's no way to track who has paid vs. who still owes. A per-session "Who owes what / Who's paid" screen would close that loop. You have SessionDonatedListPage already — but I'm guessing it doesn't track actual payment status.

2. Push Notifications for Scheduled Matches
When a match is queued or scheduled, send a push notification (via Web Push API) to notify players it's their turn. Since it's a PWA, this is native.

3. Session QR Code / Invite Link
Let any player join a session by scanning a QR code. Others can view the live scoreboard without needing an account (read-only mode).

Medium Value
4. Match Score Live Entry (Set-by-Set)
Currently scores are recorded after the fact. A live "21–18, 21–15" entry during a match (with a running point tapper like a tennis app) would make it more real-time.

5. Attendance / RSVP per Session
Before a session starts, players can confirm or decline attendance. Helps admins plan court booking and match queue.

6. Streak & Milestone Badges
Built on usePlayerAchievements.ts — surface earned badges visually on the player profile (e.g., "5-win streak", "50 matches played", "donated 100x").

Quality-of-Life
7. Undo Last Match Result
If a score is entered wrong, admins can't easily undo without full re-creation. An "undo result" action (revert COMPLETED → LIVE) would reduce friction.

8. Session Summary Share Card
At session end, generate a shareable image (OG-card style) with top scorer, most matches played, donation total — shareable to Zalo/Messenger.

Which of these aligns most with how your group actually uses the app? That'd help prioritize which to build first.