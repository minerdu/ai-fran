import FranchiseReportView from '@/components/reports/FranchiseReportView';

export default function AiReportsPage() {
  return (
    <FranchiseReportView
      backHref="/ai"
      backLabel="返回 AI 招商"
      title="AI 招商报告"
      eyebrow="AI 招商"
    />
  );
}
