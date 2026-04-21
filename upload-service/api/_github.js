import https from 'https';

const REPO_OWNER = 'msburberryy-web';
const REPO_NAME  = 'Amore_Wedding_Tokyo_Invitedyou_v1.2';
const BRANCH     = 'main';

export function githubRequest(path, method, body = null) {
  const token = process.env.GITHUB_TOKEN || '';
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        Authorization:  `Bearer ${token}`,
        'User-Agent':   'amore-upload-service',
        'Content-Type': 'application/json',
        Accept:         'application/vnd.github+json',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) })
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export async function createBlob(base64Content) {
  const res = await githubRequest(
    `/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`,
    'POST',
    { encoding: 'base64', content: base64Content }
  );
  if (res.status !== 201) throw new Error(`Blob creation failed: ${JSON.stringify(res.body)}`);
  return res.body.sha;
}

export async function commitTree(blobEntries, message) {
  // Get current HEAD
  const refRes = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${BRANCH}`, 'GET');
  if (refRes.status !== 200) throw new Error('Failed to get branch ref');
  const currentCommitSha = refRes.body.object.sha;

  // Get current tree
  const commitRes = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${currentCommitSha}`, 'GET');
  if (commitRes.status !== 200) throw new Error('Failed to get commit');
  const currentTreeSha = commitRes.body.tree.sha;

  // Create new tree
  const treeRes = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`, 'POST', {
    base_tree: currentTreeSha,
    tree: blobEntries.map(({ path, sha }) => ({ path, mode: '100644', type: 'blob', sha }))
  });
  if (treeRes.status !== 201) throw new Error('Failed to create tree');

  // Create commit
  const newCommitRes = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`, 'POST', {
    message,
    tree: treeRes.body.sha,
    parents: [currentCommitSha]
  });
  if (newCommitRes.status !== 201) throw new Error('Failed to create commit');

  // Update branch ref
  const updateRes = await githubRequest(
    `/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${BRANCH}`,
    'PATCH',
    { sha: newCommitRes.body.sha }
  );
  if (updateRes.status !== 200) throw new Error('Failed to update branch ref');

  return newCommitRes.body.sha;
}
