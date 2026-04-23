import FranchiseReportView from '@/components/reports/FranchiseReportView';

export default function SettingsReportPage() {
  return (
    <FranchiseReportView
      backHref="/me"
      backLabel="返回我的"
      title="招商报告中心"
      eyebrow="设置 > 招商报告"
    />
  );
}
