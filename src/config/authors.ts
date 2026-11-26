export interface Author {
  name: string;
  bio: string;
  url: string;
}

// House style: every article is credited to Kile Research, with no individual names.
export const authors = {
  'kile-research': {
    name: 'Kile Research',
    bio: 'We write hands-on, reproducible guides to how AI models actually run. Every command and number in our articles was run on our own test rig, and the code is public so you can check our work.',
    url: '/about/',
  },
} satisfies Record<string, Author>;
