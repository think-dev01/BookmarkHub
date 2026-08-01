const githubPat = process.env.GITHUB_PAT || '';
let rawOwner = process.env.GITHUB_REPO_OWNER || 'think-dev01';
let rawRepo = process.env.GITHUB_REPO_NAME || 'BookmarkHub';

// Sanitize repoOwner if full URL was pasted in environment variables
if (rawOwner.includes('github.com/')) {
  const parts = rawOwner.replace(/https?:\/\/github\.com\//i, '').replace(/\/$/, '').split('/');
  rawOwner = parts[0] || 'think-dev01';
  if (parts[1]) rawRepo = parts[1];
}

if (rawRepo.includes('github.com/')) {
  const parts = rawRepo.replace(/https?:\/\/github\.com\//i, '').replace(/\/$/, '').split('/');
  if (parts[0]) rawOwner = parts[0];
  if (parts[1]) rawRepo = parts[1];
}

const repoOwner = rawOwner;
const repoName = rawRepo;

export async function triggerAudioExtractionWorker(params: {
  bookmark_id: string;
  url: string;
  callback_url: string;
  chat_id?: number | string;
  message_id?: number;
}): Promise<boolean> {
  if (!githubPat) {
    console.warn('[GITHUB DISPATCH WARNING] GITHUB_PAT not configured, skipping GitHub Actions worker.');
    return false;
  }

  const endpoint = `https://api.github.com/repos/${repoOwner}/${repoName}/dispatches`;
  console.log(`[GITHUB DISPATCH] Triggering worker endpoint: ${endpoint}`);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubPat}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'process_audio',
        client_payload: {
          bookmark_id: params.bookmark_id,
          url: params.url,
          callback_url: params.callback_url,
          chat_id: params.chat_id,
          message_id: params.message_id,
        },
      }),
    });

    if (res.ok || res.status === 204) {
      console.log(`[GITHUB DISPATCH SUCCESS] Successfully dispatched GitHub Actions worker for bookmark: ${params.bookmark_id}`);
      return true;
    } else {
      const errorText = await res.text();
      console.error(`[GITHUB DISPATCH ERROR] Status (${res.status}): ${errorText}`);
      return false;
    }
  } catch (err) {
    console.error('[GITHUB DISPATCH EXCEPTION] Error triggering GitHub Actions worker:', err);
    return false;
  }
}
