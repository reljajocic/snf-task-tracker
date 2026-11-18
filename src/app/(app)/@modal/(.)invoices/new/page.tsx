import Page from "../../../invoices/new/page";
import { AppModal } from "../../AppModal";

// invoices/new, opened from inside the app: in a window over the page (the full page on a direct link or refresh).
export default function InvoicesNewModal(props: PageProps<"/invoices/new">) {
  return (
    <AppModal wide>
      <Page {...props} />
    </AppModal>
  );
}
