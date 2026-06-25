import { ReportStepper } from '@/components/issue/ReportStepper'

export default function ReportPage() {
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Report an Issue</h1>
      <ReportStepper />
    </div>
  )
}
