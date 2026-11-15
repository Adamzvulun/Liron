// The inn's chat numbers (E17), in a file of their own so the house's ranks, which load with the
// square, can read them without the rest of the chat (innChat.ts re-exports them).

/** Your lines in one chat; after that the regular has to go. */
export const MAX_LINES = 8;
/** A chat earns its XP at this many of your lines. */
export const LINES_FOR_XP = 3;
/** Chats with a regular before they call you an old friend (as OLD_FRIENDS in api/partner.ts, which imports nothing from the app). */
export const OLD_FRIEND_CHATS = 5;
