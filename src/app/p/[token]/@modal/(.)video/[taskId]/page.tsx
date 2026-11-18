import { VideoView } from "../../../video/[taskId]/VideoView";
import { PortalModal } from "../../PortalModal";

// A video clicked in the portal (calendar, list, home): a window over the page, like the team's task window.
// The URL is the video's own, so a refresh or a shared link opens its full page.
export default async function VideoModal({ params, searchParams }: PageProps<"/p/[token]/video/[taskId]">) {
  const [{ token, taskId }, { v }] = await Promise.all([params, searchParams]);
  return (
    <PortalModal>
      <VideoView token={token} taskId={taskId} versionParam={v} inModal />
    </PortalModal>
  );
}
