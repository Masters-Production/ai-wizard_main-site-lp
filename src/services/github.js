// src/services/github.js
const { Octokit } = require('@octokit/rest');

class GitHubService {
  constructor(token, org) {
    this.octokit = new Octokit({ auth: token });
    this.org = org;
  }

  async listRepos() {
    const { data } = await this.octokit.repos.listForOrg({
      org: this.org,
      per_page: 100,
      sort: 'updated'
    });
    return data;
  }

  async getRepo(repoName) {
    const { data } = await this.octokit.repos.get({
      owner: this.org,
      repo: repoName
    });
    return data;
  }

  filterByPrefix(repos, prefix) {
    return repos.filter(repo => repo.name.startsWith(prefix));
  }

  extractSlug(repoName, prefix) {
    return repoName.replace(prefix, '');
  }

  async cloneUrl(repoName) {
    return `https://github.com/${this.org}/${repoName}.git`;
  }
}

module.exports = GitHubService;
