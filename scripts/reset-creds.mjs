// Wipe the webauthn-credentials blob store (for testing fresh registration)
// Usage: npm run reset-creds

import { getStore } from '@netlify/blobs';

const store = getStore({
  name: 'webauthn-credentials',
  siteID: process.env.NETLIFY_SITE_ID || 'local',
  token: process.env.NETLIFY_AUTH_TOKEN || '',
});

try {
  const { blobs } = await store.list();
  if (blobs.length === 0) {
    console.log('No credentials to delete.');
  } else {
    for (const blob of blobs) {
      await store.delete(blob.key);
      console.log(`Deleted credential: ${blob.key}`);
    }
    console.log(`Cleared ${blobs.length} credential(s).`);
  }
} catch (err) {
  console.error('Error clearing credentials:', err.message);
  console.log('If running locally, make sure netlify dev is running (blobs need the dev server).');
}
