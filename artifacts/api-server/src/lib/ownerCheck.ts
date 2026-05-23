import { createClerkClient } from "@clerk/express";

const ownerIds = new Set(
  (process.env.OWNER_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
);

const ownerEmails = new Set(
  (process.env.OWNER_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
);

let clerk: ReturnType<typeof createClerkClient> | null = null;

function getClerk() {
  if (!clerk) {
    clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  }
  return clerk;
}

export async function isOwner(userId: string): Promise<boolean> {
  if (ownerIds.has(userId)) return true;
  if (ownerEmails.size === 0) return false;
  try {
    const user = await getClerk().users.getUser(userId);
    const primaryEmail = user.emailAddresses
      .find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress?.toLowerCase();
    if (primaryEmail && ownerEmails.has(primaryEmail)) return true;
    return user.emailAddresses.some(
      (e) => ownerEmails.has(e.emailAddress.toLowerCase())
    );
  } catch {
    return false;
  }
}
