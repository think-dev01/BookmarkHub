const githubPat = process.env.GITHUB_PAT || '';
const repoOwner = process.env.GITHUB_REPO_OWNER || '';
const repoName = process.env.GITHUB_REPO_NAME || 'Social_Bookmark_Hub';

export async function triggerAudioExtractionWorker(params: {
  bookmark_id: string;
  url: string;
  callback_url: string;
  chat_id?: number | string;
  message_id?: number;
}): Promise<boolean> {
  if (!githubPat || !repoOwner) {
    console.warn('GitHub PAT or Repo Owner not configured, skipping GitHub Actions dispatch trigger.');
    return false;
  }

  const endpoint = `https://api.github.com/repos/${repoOwner}/${repoName}/dispatches`;

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
      console.log(`Successfully dispatched GitHub Actions audio worker for bookmark: ${params.bookmark_id}`);
      return true;
    } else {
      const errorText = await res.text();
      console.error(`GitHub dispatch failed (${res.status}):`, errorText);
      return false;
    }
  } catch (err) {
    console.error('Error triggering GitHub Actions audio extraction worker:', err);
    return false;
  }
}
