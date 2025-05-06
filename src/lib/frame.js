import * as frame from '@farcaster/frame-sdk'

export async function initializeFrame() {
  // Await the context promise
  const context = await frame.sdk.context;

  if (!context || !context.user) {
    console.log('Not in frame context');
    return;
  }

  // Handle potential nested user object (known issue)
  let user = context.user;
  if (user && typeof user === 'object' && 'fid' in user && 'user' in user && user.user) {
      console.warn('Detected nested user object, accessing user.user');
      user = user.user;
  }

  // Ensure user object has fid
  if (!user || typeof user.fid !== 'number') {
    console.error('User object or fid is missing or invalid:', user);
    return;
  }

  console.log('Frame context initialized for user FID:', user.fid);

  // Make FID globally accessible
  console.log('Setting window.userFid =', user.fid);
  window.userFid = user.fid;

  // Call the ready function to remove splash screen
  try {
    await frame.sdk.actions.ready();
    console.log('Frame ready signal sent.');
  } catch (error) {
    console.error('Error signaling frame ready:', error);
  }
} 