# ⚡ PokéMaker

A web application for creating custom Pokémon with AI-generated artwork!

## 🎨 Features

- **Create Custom Pokémon**: Comprehensive form with all the details of official Pokémon
  - Basic info (name, types, category)
  - Physical characteristics (height, weight, description)
  - Battle stats (HP, Attack, Defense, Special Attack, Special Defense, Speed)
  - Abilities (primary, secondary, and hidden)
  - Evolution and breeding details

- **AI-Powered Art Generation**: Upload a drawing and watch AI transform it into professional Pokémon art!
  - Uses OpenAI GPT-4o for image analysis and generation
  - Try multiple variations until you're happy
  - Stores both original drawing and final AI image

- **Pokémon Gallery**: View all your created Pokémon in a beautiful grid layout
  - Filter and sort options
  - Click to view full details

- **Edit & Delete**: Modify your Pokémon or remove them

- **Mobile-Friendly**: Works great on phones and tablets with camera support

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase account (free tier works great!)
- An OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/septapod/pokemaker.git
   cd pokemaker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

   Then fill in your actual values in the `.env` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

4. **Set up Supabase Database**

   Go to your Supabase project dashboard and run this SQL to create the database table:

   ```sql
   CREATE TABLE pokemon (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW(),

     -- Basic Identity
     name VARCHAR(100) NOT NULL,
     pokedex_number INTEGER,
     category VARCHAR(100),
     type_primary VARCHAR(20) NOT NULL,
     type_secondary VARCHAR(20),
     color VARCHAR(50),

     -- Physical
     height_value DECIMAL,
     height_unit VARCHAR(10),
     weight_value DECIMAL,
     weight_unit VARCHAR(10),
     shape VARCHAR(50),
     pokedex_entry TEXT,

     -- Stats
     hp INTEGER CHECK (hp >= 1 AND hp <= 255),
     attack INTEGER CHECK (attack >= 1 AND attack <= 255),
     defense INTEGER CHECK (defense >= 1 AND defense <= 255),
     special_attack INTEGER CHECK (special_attack >= 1 AND special_attack <= 255),
     special_defense INTEGER CHECK (special_defense >= 1 AND special_defense <= 255),
     speed INTEGER CHECK (speed >= 1 AND speed <= 255),

     -- Abilities
     ability_1_name VARCHAR(100),
     ability_1_description TEXT,
     ability_2_name VARCHAR(100),
     ability_2_description TEXT,
     hidden_ability_name VARCHAR(100),
     hidden_ability_description TEXT,

     -- Evolution
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

     -- Game Mechanics
     catch_rate INTEGER CHECK (catch_rate >= 0 AND catch_rate <= 255),
     base_friendship INTEGER CHECK (base_friendship >= 0 AND base_friendship <= 255),
     growth_rate VARCHAR(30),
     ev_yield JSONB,

     -- Images
     original_drawing_url TEXT,
     ai_generated_image_url TEXT NOT NULL,

     -- Moves
     level_up_moves JSONB,
     tm_moves JSONB,
     egg_moves JSONB
   );

   CREATE INDEX idx_pokemon_name ON pokemon(name);
   CREATE INDEX idx_pokemon_type ON pokemon(type_primary, type_secondary);
   CREATE INDEX idx_pokemon_created ON pokemon(created_at DESC);
   ```

5. **Create Supabase Storage Bucket**

   - Go to Storage in your Supabase dashboard
   - Create a new public bucket named `pokemon-images`
   - Set it to allow public read access

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**

   Navigate to `http://localhost:5173` and start creating Pokémon!

## 📁 Project Structure

```
/src
  /components
    /Layout          - Header, navigation, footer
    /PokemonForm     - (Future) Individual form step components
    /PokemonCard     - (Future) Card display component
    /Gallery         - (Future) Gallery-specific components
  /pages
    Home.tsx         - Landing page
    CreatePokemon.tsx - Multi-step Pokémon creation form
    EditPokemon.tsx  - Edit existing Pokémon
    Gallery.tsx      - View all Pokémon
    PokemonDetail.tsx - View single Pokémon details
  /services
    supabase.ts      - Database operations
    openai.ts        - AI image generation
  /hooks             - (Future) Custom React hooks
  /types
    pokemon.types.ts - TypeScript type definitions
  /utils
    constants.ts     - Constants, colors, type arrays
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Forms**: React Hook Form
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **AI**: OpenAI GPT-4o
- **Deployment**: (Ready for Vercel/Netlify)

## 📚 How to Use

1. **Click "Create New"** on the home page
2. **Fill in the 6-step form**:
   - Step 1: Name and type your Pokémon
   - Step 2: Add physical details
   - Step 3: Set battle stats
   - Step 4: Define abilities
   - Step 5: Add evolution/breeding info
   - Step 6: Upload a drawing and generate AI art!
3. **Accept the generated image** or try again
4. **Save your Pokémon**
5. **View in Gallery** and share with friends!

## 🎯 Next Steps (Future Enhancements)

- [ ] Add authentication for multiple users
- [ ] Export Pokémon as trading cards (PDF/PNG)
- [ ] Share Pokémon via link
- [ ] Battle simulator using stats
- [ ] Evolution chain visualization
- [ ] Import real Pokémon from PokéAPI for reference
- [ ] Mobile app version
- [ ] Pokémon comparison tool

## 🐛 Known Issues

- None yet! This is a fresh project.

## 📖 Learn More

- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 👨‍💻 Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check
```

## 📄 License

This project is for personal use. Feel free to fork and adapt for your own purposes!

## ❤️ Made with Love

Built with Claude Code

---

**Have fun creating amazing Pokémon! 🎉**
