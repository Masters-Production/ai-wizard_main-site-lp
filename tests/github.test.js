// tests/github.test.js
const GitHubService = require('../src/services/github');

describe('GitHubService', () => {
  let github;

  beforeEach(() => {
    github = new GitHubService('fake-token', 'test-org');
  });

  test('constructs with token and org', () => {
    expect(github.org).toBe('test-org');
  });

  test('filters repos by prefix', () => {
    const repos = [
      { name: 'lp-brand1-promo', full_name: 'org/lp-brand1-promo' },
      { name: 'lp-brand2-sale', full_name: 'org/lp-brand2-sale' },
      { name: 'other-repo', full_name: 'org/other-repo' }
    ];

    const filtered = github.filterByPrefix(repos, 'lp-brand1-');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('lp-brand1-promo');
  });

  test('extracts LP slug from repo name', () => {
    const slug = github.extractSlug('lp-brand1-promo-spring', 'lp-brand1-');
    expect(slug).toBe('promo-spring');
  });
});
