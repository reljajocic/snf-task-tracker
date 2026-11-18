import { VideoView } from "./VideoView";

// A video opened from its link (or after a refresh): the whole page. Clicked in the portal, it opens as a window
// over the page instead (@modal/(.)video).
export default async function PortalVideo({ params, searchParams }: PageProps<"/p/[token]/video/[taskId]">) {
  const [{ token, taskId }, { v }] = await Promise.all([params, searchParams]);
  return <VideoView token={token} taskId={taskId} versionParam={v} />;
}
