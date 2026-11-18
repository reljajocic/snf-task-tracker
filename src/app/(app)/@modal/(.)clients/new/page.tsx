import Page from "../../../clients/new/page";
import { AppModal } from "../../AppModal";

// clients/new, opened from inside the app: in a window over the page (the full page on a direct link or refresh).
export default function ClientsNewModal() {
  return (
    <AppModal>
      <Page />
    </AppModal>
  );
}
