// src/public/js/dashboard.js

// Load landing pages for each brand
async function loadLandingPages() {
  for (const brand of brands) {
    try {
      const response = await fetch(`/api/brands/${brand.id}/repos`);
      const data = await response.json();

      const container = document.getElementById(`lp-list-${brand.id}`);

      if (data.landingPages.length === 0) {
        container.innerHTML = '<p class="no-lps">No landing pages yet</p>';
        continue;
      }

      container.innerHTML = data.landingPages.map(lp => `
        <div class="site-row" data-type="lp" data-slug="${lp.slug}" data-repo="${lp.name}">
          <div class="site-info">
            <span class="site-name">${lp.slug}</span>
            <span class="status status-none">Not deployed</span>
          </div>
          <div class="actions">
            <button class="btn btn-small btn-warning" onclick="deployPreview('${brand.id}', 'lp', '${lp.name}', '${lp.slug}')">
              Preview
            </button>
            <button class="btn btn-small btn-success" onclick="goLive('${brand.id}', 'lp', '${lp.slug}')">
              Live
            </button>
            <a href="https://${brand.domain}/lp/${lp.slug}/" target="_blank" class="btn btn-small btn-secondary">View</a>
            <button class="btn btn-small btn-danger" onclick="unpublish('${brand.id}', 'lp', '${lp.slug}')">
              Unpublish
            </button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error(`Error loading LPs for ${brand.id}:`, error);
    }
  }
}

function addLP(brandId) {
  const input = document.getElementById(`new-lp-${brandId}`);
  const repoName = input.value.trim();

  if (!repoName) {
    showToast('Please enter a repo name', 'error');
    return;
  }

  // Extract slug from repo name (remove brand prefix if present)
  const brand = brands.find(b => b.id === brandId);
  let slug = repoName;
  if (repoName.startsWith(brand.lpRepoPrefix)) {
    slug = repoName.replace(brand.lpRepoPrefix, '');
  }

  // Deploy preview for the new LP
  deployPreview(brandId, 'lp', repoName, slug);
  input.value = '';
}

async function deployPreview(brandId, type, repoName, slug = null) {
  showToast('Deploying to preview...', 'info');

  try {
    const response = await fetch('/api/deploy/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, type, repoName, slug })
    });

    const data = await response.json();

    if (data.success) {
      showToast(`Preview ready: ${data.previewUrl}`, 'success');
      window.open(data.previewUrl, '_blank');
    } else {
      showToast(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
}

async function goLive(brandId, type, slug = null) {
  if (!confirm('Are you sure you want to publish to live?')) return;

  showToast('Publishing to live...', 'info');

  try {
    const response = await fetch('/api/deploy/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, type, slug })
    });

    const data = await response.json();

    if (data.success) {
      showToast(`Published: ${data.liveUrl}`, 'success');
    } else {
      showToast(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
}

async function unpublish(brandId, type, slug) {
  if (!confirm('Are you sure you want to unpublish?')) return;

  try {
    const response = await fetch('/api/deploy/unpublish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, type, slug })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Unpublished successfully', 'success');
    } else {
      showToast(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type}`;

  setTimeout(() => {
    toast.className = 'toast hidden';
  }, 5000);
}

// Initialize
document.addEventListener('DOMContentLoaded', loadLandingPages);
