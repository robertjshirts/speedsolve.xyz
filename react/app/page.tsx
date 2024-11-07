import { Timer, Users, Trophy } from 'lucide-react';

export default function MainPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background-start to-background-end">
      {/* Hero Section */}
      <div className="pt-32 pb-16 text-center px-4">
        <h1 className="text-5xl font-bold text-primary mb-6">
          Welcome to <span className="text-accent">speedsolve.xyz</span>
        </h1>
        <p className="text-xl text-secondary max-w-2xl mx-auto">
          Join the community of speedcubers and compete in real-time solving challenges
        </p>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-card p-8 rounded-xl shadow-sm border border-border text-center">
            <div className="w-16 h-16 bg-icon-bg rounded-lg flex items-center justify-center mx-auto mb-6">
              <Timer className="w-8 h-8 text-icon" />
            </div>
            <h2 className="text-xl font-semibold text-primary mb-4">Solo Practice</h2>
            <p className="text-secondary">
              Perfect your solving technique with our precision timer and scramble generator
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl shadow-sm border border-border text-center">
            <div className="w-16 h-16 bg-icon-bg rounded-lg flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-icon" />
            </div>
            <h2 className="text-xl font-semibold text-primary mb-4">Live Competitions</h2>
            <p className="text-secondary">
              Challenge other speedcubers in real-time with video chat <em>(coming soon)</em>
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl shadow-sm border border-border text-center">
            <div className="w-16 h-16 bg-icon-bg rounded-lg flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-8 h-8 text-icon" />
            </div>
            <h2 className="text-xl font-semibold text-primary mb-4">Leaderboards</h2>
            <p className="text-secondary">
              Track your progress and compete for the top spots in global rankings <em>(coming soon)</em>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
