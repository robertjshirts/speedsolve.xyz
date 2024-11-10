import { createFileRoute } from '@tanstack/react-router'
import { Timer, Users, Trophy } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: MainPage,
})

export function MainPage() {
  return (
    <div className="min-h-screen bg-skin-fill">
      {/* Hero Section */}
      <div className="pt-32 pb-16 text-center px-4">
        <h1 className="text-5xl font-bold text-skin-base mb-6">
          Welcome to <span className="text-skin-accent">speedsolve.xyz</span>
        </h1>
        <p className="text-xl text-skin-base max-w-2xl mx-auto">
          Join the community of speedcubers and compete in real-time solving challenges
        </p>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-skin-fill p-8 rounded-xl shadow-sm border border-skin-base text-center">
            <div className="w-16 h-16 bg-skin-accent/10 rounded-lg flex items-center justify-center mx-auto mb-6">
              <Timer className="w-8 h-8 text-skin-accent" />
            </div>
            <h2 className="text-xl font-semibold text-skin-primary mb-4">Solo Practice</h2>
            <p className="text-skin-base">
              Perfect your solving technique with our precision timer and scramble generator
            </p>
          </div>

          <div className="bg-skin-fill p-8 rounded-xl shadow-sm border border-skin-base text-center">
            <div className="w-16 h-16 bg-skin-accent/10 rounded-lg flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-skin-accent" />
            </div>
            <h2 className="text-xl font-semibold text-skin-primary mb-4">Live Competitions</h2>
            <p className="text-skin-base">
              Challenge other speedcubers in real-time with video chat <em>(coming soon)</em>
            </p>
          </div>

          <div className="bg-skin-fill p-8 rounded-xl shadow-sm border border-skin-base text-center">
            <div className="w-16 h-16 bg-skin-accent/10 rounded-lg flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-8 h-8 text-skin-accent" />
            </div>
            <h2 className="text-xl font-semibold text-skin-primary mb-4">Leaderboards</h2>
            <p className="text-skin-base">
              Track your progress and compete for the top spots in global rankings <em>(coming soon)</em>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}