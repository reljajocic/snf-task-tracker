import Page from "../../../../invoices/expenses/[id]/page";
import { AppModal } from "../../../AppModal";

// invoices/expenses/[id], opened from inside the app: in a window over the page (the full page on a direct link or refresh).
export default function InvoicesExpensesIdModal(props: PageProps<"/invoices/expenses/[id]">) {
  return (
    <AppModal wide>
      <Page {...props} />
    </AppModal>
  );
}
