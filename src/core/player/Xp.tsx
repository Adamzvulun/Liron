/** "+50 XP", kept on one line: a result line never breaks between the number and its unit. */
export const Xp = ({ children }: { children: number }) => (
  <span className="nowrap">+{children} XP</span>
);
