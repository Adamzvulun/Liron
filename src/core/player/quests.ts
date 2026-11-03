// Today's quests on the Notice Board (#26). A fixed list until quests are real (E10, #46).
export interface Quest {
  /** Who gives the quest, shown in capitals above it. */
  giver: string;
  /** The quest itself. `arabic` is shown in Arabic script after the text. */
  text: string;
  arabic?: string;
  reward: string;
  /** Where to go for it. */
  href: string;
  /** CSS colour of its guild. */
  color: string;
}

export function todaysQuests(goalMinutes: number): Quest[] {
  return [
    {
      giver: 'Signal Tower',
      text: 'The Silent Beacon I: hear K and M',
      reward: '+20 XP · 10 gold',
      href: '/signal-tower',
      color: 'var(--guild-morse)',
    },
    {
      giver: 'Caravanserai',
      text: 'The Long Road In I:',
      arabic: 'ا ب ت ث',
      reward: '+20 XP · 10 gold',
      href: '/caravanserai',
      color: 'var(--guild-arabic)',
    },
    {
      giver: 'Daily contract',
      text: `Practise ${goalMinutes} minutes today`,
      reward: 'The daily chest',
      href: '/notice-board',
      color: '#e8a93a',
    },
  ];
}
