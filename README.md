# PokeMaker

A web app where you draw a creature and AI turns it into a Pokemon, complete with stats, types, abilities, and a Pokedex entry. Brent built this for his son Aza as a creative tool.

## How It Works

The interesting technical feature is the two-stage AI pipeline:

1. **Vision analysis** (GPT-4.1): Analyzes the uploaded drawing and extracts visual characteristics (shape, color, features, posture).
2. **Image generation** (gpt-image-1): Takes that description and generates a polished Pokemon-style illustration that preserves the original creature's design.

This two-stage approach keeps the generated art faithful to the kid's drawing instead of hallucinating a generic Pokemon.

## Features

- **Draw and generate**: Upload a drawing (or snap a photo on mobile), and the AI pipeline produces Pokemon art
- **Full Pokedex entries**: Name, types, category, stats, abilities, evolution info, moves
- **Multi-step creation form**: Six steps from naming through art generation
- **Community gallery**: Browse Pokemon created by all users
- **Personal collection**: View and manage your own creations
- **Auth and multi-user**: Admin-controlled accounts (no public signup)
- **Mobile support**: Works on phones and tablets with camera capture, handles HEIC from iPads

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- A Supabase account (free tier works)
- An OpenAI API key

### Installation

1. Clone and install:
   ```bash
   git clone https://github.com/septapod/pokemaker.git
   cd pokemaker
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your values:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

3. Set up the Supabase database (run in SQL Editor):

   ```sql
   CREATE TABLE pokemon (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW(),
     name VARCHAR(100) NOT NULL,
     pokedex_number INTEGER,
     category VARCHAR(100),
     type_primary VARCHAR(20) NOT NULL,
     type_secondary VARCHAR(20),
     color VARCHAR(50),
     height_value DECIMAL,
     height_unit VARCHAR(10),
     weight_value DECIMAL,
     weight_unit VARCHAR(10),
     shape VARCHAR(50),
     pokedex_entry TEXT,
     hp INTEGER CHECK (hp >= 1 AND hp <= 255),
     attack INTEGER CHECK (attack >= 1 AND attack <= 255),
     defense INTEGER CHECK (defense >= 1 AND defense <= 255),
     special_attack INTEGER CHECK (special_attack >= 1 AND special_attack <= 255),
     special_defense INTEGER CHECK (special_defense >= 1 AND special_defense <= 255),
     speed INTEGER CHECK (speed >= 1 AND speed <= 255),
     ability_1_name VARCHAR(100),
     ability_1_description TEXT,
     ability_2_name VARCHAR(100),
     ability_2_description TEXT,
     hidden_ability_name VARCHAR(100),
     hidden_ability_description TEXT,
     evolution_stage VARCHAR(20),
     evolves_from VARCHAR(100),
     evolves_into VARCHAR(100),
     evolution_method TEXT,
     egg_group_1 VARCHAR(50),
     egg_group_2 VARCHAR(50),
     gender_ratio_male INTEGER,
     gender_ratio_female INTEGER,
     is_genderless BOOLEAN DEFAULT FALSE,
     egg_cycles INTEGER,
     catch_rate INTEGER CHECK (catch_rate >= 0 AND catch_rate <= 255),
     base_friendship INTEGER CHECK (base_friendship >= 0 AND base_friendship <= 255),
     growth_rate VARCHAR(30),
     ev_yield JSONB,
     original_drawing_url TEXT,
     ai_generated_image_url TEXT NOT NULL,
     level_up_moves JSONB,
     tm_moves JSONB,
     egg_moves JSONB
   );

   CREATE INDEX idx_pokemon_name ON pokemon(name);
   CREATE INDEX idx_pokemon_type ON pokemon(type_primary, type_secondary);
   CREATE INDEX idx_pokemon_created ON pokemon(created_at DESC);
   ```

4. Create a public Supabase Storage bucket named `pokemon-images`.

5. Run it:
   ```bash
   npm run dev
   ```

   Open `http://localhost:5173`.

## Project Structure

```
/api
  analyze-image.ts     - GPT-4.1 vision analysis endpoint
  generate-image.ts    - gpt-image-1 generation endpoint
  fetch-image.ts       - Image proxy for Supabase storage
  _lib/                - Shared API utilities
/src
  /components
    /Layout            - Header, navigation, footer
    ProtectedRoute.tsx - Auth guard
  /pages
    Home.tsx           - Landing page
    CreatePokemon.tsx  - Multi-step creation form
    EditPokemon.tsx    - Edit existing Pokemon
    MyPokemon.tsx      - Personal collection
    CommunityGallery.tsx - Browse all users' Pokemon
    PokemonDetail.tsx  - Single Pokemon view
    Login.tsx          - Authentication
  /services
    supabase.ts        - Database operations
    openai.ts          - AI client config
    api-client.ts      - API request helpers
  /types
    pokemon.types.ts   - TypeScript type definitions
    api.ts             - API type definitions
  /utils
    constants.ts       - Constants, colors, type arrays
/scripts
  create-user.js       - Generate SQL to create a user
  reset-password.js    - Generate SQL to reset a password
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Forms**: React Hook Form
- **Database/Storage**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4.1 (vision) + gpt-image-1 (generation)
- **Deployment**: Vercel (serverless API functions)

## User Management

Accounts are admin-controlled. Use these scripts to manage users:

```bash
# Create a new user (generates SQL for Supabase SQL Editor)
node scripts/create-user.js <username> <password>

# Reset a password
node scripts/reset-password.js <username> <new_password>
```

## Development

```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run type-check   # TypeScript check
```

## License

Personal project. Fork and adapt for your own use.

Built with Claude Code.
