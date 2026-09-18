import { ProductFrame } from "./ProductFrame";

export function DashboardMockup() {
  return (
    <ProductFrame title="Home · National Infrastructure Archive">
      <ul className="space-y-2 text-sm">
        <li className="flex justify-between"><span>Documents processed</span><span>1,284</span></li>
        <li className="flex justify-between"><span>Awaiting validation</span><span className="text-violet-600">18</span></li>
        <li className="flex justify-between"><span>Assigned approvals</span><span>6</span></li>
        <li className="flex justify-between text-muted"><span>Exception · low OCR</span><span>تعميم 1442/2024</span></li>
      </ul>
    </ProductFrame>
  );
}

export function ApprovalMockup() {
  return (
    <ProductFrame title="Workflow · pending_review">
      <p className="font-medium">Contract comparison ALS-09 vs ALS-09.r2</p>
      <p className="mt-2 text-xs text-violet-600">pending_review</p>
      <p className="mt-3 text-muted">Approve · Reject · Request changes</p>
    </ProductFrame>
  );
}

export function StatusMockup() {
  return (
    <ProductFrame title="System status">
      <ul className="space-y-2 font-mono text-xs">
        <li className="flex justify-between"><span>PostgreSQL</span><span className="text-success">healthy</span></li>
        <li className="flex justify-between"><span>pgvector</span><span className="text-success">healthy</span></li>
        <li className="flex justify-between"><span>inference queue</span><span>retrying 2</span></li>
        <li className="flex justify-between"><span>object storage</span><span className="text-success">healthy</span></li>
      </ul>
    </ProductFrame>
  );
}
