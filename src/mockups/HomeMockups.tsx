import { ProductFrame } from "./ProductFrame";

export function IntelligenceMockup() {
  return (
    <ProductFrame title="National Infrastructure Archive · Intelligence">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">Ask authorized content</p>
      <p className="mt-2 rounded-lg bg-paper-50 px-3 py-2 text-ink">
        What payment terms apply after VO-118?
      </p>
      <p className="mt-3 leading-relaxed text-ink">
        Payment terms follow Clause 12.4 of Contract ALS-09, as amended by Variation Order VO-118.
      </p>
      <div className="mt-3 space-y-2 font-mono text-[0.7rem] text-teal-600">
        <p>Citation 1 · تعميم 1442/2024 · p. 2 · authorized</p>
        <p>Citation 2 · Contract-ALS-09 · p. 14 · authorized</p>
      </div>
      <p className="mt-3 inline-flex rounded-full bg-violet-600/10 px-2 py-1 text-xs text-violet-600">
        pending_review
      </p>
    </ProductFrame>
  );
}

export function SearchMockup() {
  return (
    <ProductFrame title="Search · hybrid">
      <p className="rounded-lg border border-border px-3 py-2 text-muted">variation order payment terms</p>
      <ul className="mt-3 space-y-2">
        <li className="flex justify-between gap-3">
          <span>VO-118 · Project Controls</span>
          <span className="text-success">Authorized</span>
        </li>
        <li className="flex justify-between gap-3 text-muted">
          <span>Restricted legal annex</span>
          <span className="text-danger">Hidden by policy</span>
        </li>
      </ul>
    </ProductFrame>
  );
}

export function AuditMockup() {
  return (
    <ProductFrame title="Audit · inference + approval">
      <dl className="grid grid-cols-2 gap-2 font-mono text-[0.7rem]">
        <div>
          <dt className="text-muted">model</dt>
          <dd>gateway/approved-v3</dd>
        </div>
        <div>
          <dt className="text-muted">prompt_policy</dt>
          <dd>gov-cite-v2</dd>
        </div>
        <div>
          <dt className="text-muted">state</dt>
          <dd>approved</dd>
        </div>
        <div>
          <dt className="text-muted">approved_by</dt>
          <dd>records.officer</dd>
        </div>
      </dl>
    </ProductFrame>
  );
}
