import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-900">
            Fantasy Football Rush
          </h1>
          <p className="text-xl text-gray-600">
            Pick one running back each week. Race to 2,000 yards!
          </p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">How it works:</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">1️⃣</div>
              <h3 className="font-semibold mb-2">Pick a Running Back</h3>
              <p className="text-gray-600">Choose one active NFL running back each week</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">2️⃣</div>
              <h3 className="font-semibold mb-2">Earn Yards</h3>
              <p className="text-gray-600">Their rushing yards get added to your total</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">3️⃣</div>
              <h3 className="font-semibold mb-2">Reach 2,000 Yards</h3>
              <p className="text-gray-600">First to 2,000 total rushing yards wins!</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg text-gray-700">
            Compete with friends, track the leaderboard, and design your team logo!
          </h3>
          <Link href="/auth">
            <Button size="lg" className="text-lg px-8 py-3">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
