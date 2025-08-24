# Fantasy Football Rush

A fantasy football web application where users pick one running back each week, accumulating their rushing yards to reach a goal of 2,000 yards for the season.

## Features

- 🏈 **Weekly Running Back Selection**: Pick one active NFL running back each week
- 📊 **Real-time NFL Statistics**: Automatic yard tracking from ESPN's API
- 🏆 **Leaderboards**: Compete with friends and track rankings
- 🎨 **Custom Team Logos**: Draw 8-bit style team logos with canvas
- 📱 **Mobile Responsive**: Works perfectly on both web and mobile
- 🔐 **User Authentication**: Secure login and user profiles
- 💾 **Free Hosting**: Built for deployment on Vercel with Supabase

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Supabase
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI Components**: Radix UI, Lucide React
- **NFL Data**: ESPN API (free tier)
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase account (free tier available)

### Installation

1. **Clone the repository:**

   ```bash
   git clone <your-repo-url>
   cd fantasy-football-app
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up Supabase:**

   - Go to [Supabase](https://supabase.com) and create a new project
   - In your Supabase dashboard, go to Settings > API
   - Copy your project URL and anon key

4. **Set up environment variables:**
   Create a `.env.local` file in the root directory:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NFL_API_BASE_URL=https://site.api.espn.com/apis/site/v2/sports/football/nfl
   ```

5. **Set up the database:**
   Run these SQL commands in your Supabase SQL editor:

   ```sql
   -- Create profiles table
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
     email TEXT UNIQUE NOT NULL,
     team_name TEXT NOT NULL,
     team_logo_data TEXT,
     total_yards INTEGER DEFAULT 0,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
   );

   -- Create weekly_picks table
   CREATE TABLE weekly_picks (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
     week INTEGER NOT NULL,
     season INTEGER NOT NULL,
     player_name TEXT NOT NULL,
     player_id TEXT NOT NULL,
     yards_gained INTEGER DEFAULT 0,
     is_finalized BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
     UNIQUE(user_id, week, season)
   );

   -- Create running_backs table for caching NFL data
   CREATE TABLE running_backs (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     player_id TEXT NOT NULL,
     name TEXT NOT NULL,
     team TEXT NOT NULL,
     position TEXT DEFAULT 'RB',
     season INTEGER NOT NULL,
     week INTEGER NOT NULL,
     yards INTEGER DEFAULT 0,
     games_played INTEGER DEFAULT 1,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
     UNIQUE(player_id, season, week)
   );

   -- Enable Row Level Security
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE weekly_picks ENABLE ROW LEVEL SECURITY;
   ALTER TABLE running_backs ENABLE ROW LEVEL SECURITY;

   -- Create policies
   CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
   CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
   CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

   CREATE POLICY "Users can view all weekly picks" ON weekly_picks FOR SELECT USING (true);
   CREATE POLICY "Users can update own picks" ON weekly_picks FOR UPDATE USING (auth.uid() = user_id);
   CREATE POLICY "Users can insert own picks" ON weekly_picks FOR INSERT WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Anyone can view running backs" ON running_backs FOR SELECT USING (true);
   ```

6. **Run the development server:**

   ```bash
   npm run dev
   ```

7. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js 13+ app directory
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard (to be created)
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/                # Reusable UI components
│   └── auth-form.tsx      # Authentication form
├── lib/                   # Utility libraries
│   ├── supabase.ts        # Supabase client configuration
│   ├── supabase-server.ts # Server-side Supabase client
│   ├── nfl-api.ts         # NFL data fetching
│   └── utils.ts           # General utilities
└── types/                 # TypeScript type definitions
    └── index.ts           # Main type definitions
```

## Key Features Implementation

### 1. User Authentication

- Supabase Auth with email/password
- User profiles with team names
- Protected routes

### 2. Weekly Picks System

- Users can pick one running back per week
- Picks lock before games start
- Automatic yard accumulation

### 3. NFL Data Integration

- ESPN API for real-time statistics
- Automatic updates after games
- Running back statistics tracking

### 4. Leaderboard

- Real-time rankings
- Total yards accumulated
- Weekly performance tracking

### 5. Team Logo Designer

- HTML5 Canvas for 8-bit style drawing
- Save logos as base64 data
- Display in profiles and leaderboards

## Deployment

### Vercel (Recommended)

1. **Connect your GitHub repository to Vercel**
2. **Add environment variables in Vercel dashboard:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NFL_API_BASE_URL`
3. **Deploy!**

The app will automatically deploy on every push to main branch.

## Development Roadmap

- [x] Basic project setup with Next.js and TypeScript
- [x] Supabase authentication integration
- [x] Database schema and table creation
- [x] NFL API integration for running back data (2023 season)
- [x] Dashboard UI with current week's picks
- [x] Weekly pick selection interface
- [x] Real-time leaderboard
- [ ] User profile management
- [ ] 8-bit logo canvas editor
- [ ] Mobile responsiveness optimization
- [ ] Automated weekly yard updates
- [ ] Email notifications for pick reminders

## API Endpoints

- `GET /api/nfl/running-backs` - Get current week's running backs
- `GET /api/nfl/player-stats/{playerId}` - Get specific player stats
- `POST /api/picks` - Submit weekly pick
- `GET /api/leaderboard` - Get current leaderboard
- `PUT /api/profile` - Update user profile

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or issues, please create an issue in the GitHub repository.

---

Built with ❤️ for fantasy football fans!
