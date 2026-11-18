import Page from "../../../../invoices/expenses/new/page";
import { AppModal } from "../../../AppModal";

// invoices/expenses/new, opened from inside the app: in a window over the page (the full page on a direct link or refresh).
export default function InvoicesExpensesNewModal() {
  return (
    <AppModal>
      <Page />
    </AppModal>
  );
}
