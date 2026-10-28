import { createRoot } from "react-dom/client";
import { DisbursementForm } from "@/features/disbursements/components/disbursement-form";
import "@openfonts/sarabun_all/index.css";
import "@/app/globals.css";

const response = await fetch(`/test-reset${window.location.search}`);
const options = await response.json();
createRoot(document.getElementById("root")!).render(
  <main style={{ maxWidth: 1400, margin: "0 auto", padding: 20 }}>
    <DisbursementForm options={options} />
  </main>,
);
