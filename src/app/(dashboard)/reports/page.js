import FranchiseReportView from '@/components/reports/FranchiseReportView';

export default function ReportsPage() {
  return (
    <FranchiseReportView
      backHref="/me"
      backLabel="返回我的"
      title="招商报告中心"
      eyebrow="我的 > AI 智能招商"
    />
  );
}
