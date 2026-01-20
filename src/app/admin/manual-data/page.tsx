import ManualDataEntry from '@/components/manual-data-entry'

export default function AdminManualDataPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin - Manual Data Entry</h1>
        
        <div className="space-y-8">
          <ManualDataEntry week={1} season={2025} />
        </div>
      </div>
    </div>
  )
}
